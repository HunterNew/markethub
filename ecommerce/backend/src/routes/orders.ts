import { Router, Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import pool from '../db/pool';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Lazy Razorpay instance (initialized on first use to ensure env vars are loaded)
let razorpayInstance: any = null;
function getRazorpay() {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    console.log('[RAZORPAY] Initializing with key_id:', keyId ? keyId.substring(0, 10) + '...' : 'EMPTY');
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpayInstance;
}

// POST /api/v1/orders/razorpay-order - Create Razorpay order
router.post('/razorpay-order', authenticate, requireRole('customer'), async (req: AuthRequest, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ status: 'error', message: 'Valid amount is required.', errors: [] });
    }

    const options = {
      amount: Math.round(amount * 100), // Convert rupees to paise
      currency: 'INR',
      receipt: 'order_' + Date.now(),
    };

    const order = await getRazorpay().orders.create(options);
    return res.json({ status: 'success', order_id: order.id, amount: order.amount, currency: order.currency });
  } catch (error: any) {
    console.error('[RAZORPAY] Order creation failed:', error?.error || error?.message || error);
    return res.status(500).json({ status: 'error', message: error?.error?.description || 'Failed to create Razorpay order.', detail: error?.error || error?.message, errors: [] });
  }
});

// POST /api/v1/orders/razorpay-verify - Verify Razorpay payment signature
router.post('/razorpay-verify', authenticate, requireRole('customer'), async (req: AuthRequest, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ status: 'error', message: 'Missing payment verification parameters.', errors: [] });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(body)
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      return res.json({ status: 'success', message: 'Payment verified successfully.' });
    } else {
      return res.status(400).json({ status: 'error', message: 'Payment verification failed.', errors: [] });
    }
  } catch (error: any) {
    console.error('[RAZORPAY] Verification failed:', error);
    return res.status(500).json({ status: 'error', message: 'Payment verification error.', errors: [] });
  }
});

// POST /api/v1/orders - Place order
router.post('/', authenticate, requireRole('customer'), async (req: AuthRequest, res: Response) => {
  const { shippingAddress, paymentMethod, paymentIntentId, razorpayOrderId, couponCode } = req.body;

  if (!shippingAddress || !paymentMethod) {
    return res.status(400).json({ status: 'error', message: 'Shipping address and payment method are required.', errors: [] });
  }

  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    // Get cart items
    const [carts] = await conn.query('SELECT id FROM cart WHERE user_id = ?', [req.user!.userId]) as any[];
    if (carts.length === 0) return res.status(400).json({ status: 'error', message: 'Cart is empty.', errors: [] });

    const [cartItems] = await conn.query(
      `SELECT ci.*, p.name, p.stock_quantity, p.vendor_id, p.tax_rate_id, p.has_variants,
        pv.option_combination, pv.price as variant_price, pv.stock_quantity as variant_stock
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_variants pv ON ci.variant_id = pv.id
      WHERE ci.cart_id = ?`,
      [carts[0].id]
    ) as any[];

    if ((cartItems as any[]).length === 0) return res.status(400).json({ status: 'error', message: 'Cart is empty.', errors: [] });

    // Tax settings
    const [taxSettings] = await conn.query(
      `SELECT \`key\`, value FROM platform_settings WHERE \`key\` = 'tax_enabled'`
    ) as any[];
    const taxEnabled = taxSettings.length > 0 && JSON.parse(taxSettings[0].value) === true;

    const [defaultTax] = await conn.query('SELECT rate FROM tax_config WHERE is_default = true LIMIT 1') as any[];
    const defaultTaxRate = defaultTax.length > 0 ? Number(defaultTax[0].rate) : 0;

    let subtotal = 0;
    let taxTotal = 0;
    const orderItemsData: any[] = [];

    for (const item of cartItems as any[]) {
      const lineSubtotal = Number(item.unit_price) * item.quantity;
      subtotal += lineSubtotal;

      let taxRate = 0;
      let taxAmount = 0;
      if (taxEnabled) {
        if (item.tax_rate_id) {
          const [rates] = await conn.query('SELECT rate FROM tax_config WHERE id = ?', [item.tax_rate_id]) as any[];
          taxRate = rates.length > 0 ? Number(rates[0].rate) : defaultTaxRate;
        } else {
          taxRate = defaultTaxRate;
        }
        taxAmount = lineSubtotal * taxRate / 100;
        taxTotal += taxAmount;
      }

      orderItemsData.push({ ...item, taxRate, taxAmount });
    }

    // Apply coupon discount
    let discountAmount = 0;
    let appliedCouponId = null;
    if (couponCode) {
      const [coupons] = await conn.query(
        'SELECT * FROM coupons WHERE code = ? AND is_active = true',
        [couponCode.toUpperCase()]
      ) as any[];
      if (coupons.length > 0) {
        const coupon = coupons[0];
        const notExpired = !coupon.expires_at || new Date(coupon.expires_at) > new Date();
        const withinLimit = !coupon.usage_limit || coupon.usage_count < coupon.usage_limit;
        const meetsMin = !coupon.min_order_amount || subtotal >= Number(coupon.min_order_amount);
        if (notExpired && withinLimit && meetsMin) {
          discountAmount = coupon.discount_type === 'percentage'
            ? subtotal * Number(coupon.discount_value) / 100
            : Math.min(Number(coupon.discount_value), subtotal);
          appliedCouponId = coupon.id;
          await conn.query('UPDATE coupons SET usage_count = usage_count + 1 WHERE id = ?', [coupon.id]);
        }
      }
    }

    // Calculate delivery charge
    let deliveryCharge = 0;
    const vendorDeliveryMap: Record<number, { type: string; perProduct: number; perKg: number; freeAbove: number; subtotal: number; deliveryDays: number }> = {};
    for (const item of orderItemsData) {
      const vid = item.vendor_id;
      if (!vendorDeliveryMap[vid]) {
        const [vInfo] = await conn.query('SELECT delivery_type, delivery_charge_per_product, delivery_charge_per_kg, free_delivery_above, delivery_days FROM vendors WHERE id = ?', [vid]) as any[];
        const v = vInfo[0] || {};
        vendorDeliveryMap[vid] = { type: v.delivery_type || 'per_product', perProduct: Number(v.delivery_charge_per_product) || 0, perKg: Number(v.delivery_charge_per_kg) || 0, freeAbove: Number(v.free_delivery_above) || 0, subtotal: 0, deliveryDays: Number(v.delivery_days) || 5 };
      }
      vendorDeliveryMap[vid].subtotal += Number(item.unit_price) * item.quantity;
    }
    for (const item of orderItemsData) {
      const vd = vendorDeliveryMap[item.vendor_id];
      if (vd.freeAbove > 0 && vd.subtotal >= vd.freeAbove) continue;

      // Check product-level delivery settings
      const [pDelivery] = await conn.query('SELECT delivery_type, delivery_charge, weight_kg FROM products WHERE id = ?', [item.product_id]) as any[];
      const pd = pDelivery[0] || {};
      const productDeliveryType = pd.delivery_type && pd.delivery_type !== 'vendor_default' ? pd.delivery_type : vd.type;
      const productDeliveryCharge = pd.delivery_type && pd.delivery_type !== 'vendor_default' ? Number(pd.delivery_charge) || 0 : null;

      if (productDeliveryType === 'per_kg') {
        const weight = Number(pd.weight_kg) || 0.5;
        const chargePerKg = productDeliveryCharge !== null ? productDeliveryCharge : vd.perKg;
        deliveryCharge += weight * item.quantity * chargePerKg;
      } else {
        const chargePerProduct = productDeliveryCharge !== null ? productDeliveryCharge : vd.perProduct;
        deliveryCharge += item.quantity * chargePerProduct;
      }
    }

    const total = subtotal + taxTotal - discountAmount + deliveryCharge;
    const paymentStatus = paymentMethod === 'cod' ? 'pending' : 'paid';

    // Calculate expected delivery date from the slowest vendor
    const maxDeliveryDays = Math.max(...Object.values(vendorDeliveryMap).map(v => v.deliveryDays), 5);
    const expectedDeliveryDate = new Date();
    expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + maxDeliveryDays);
    const expectedDeliveryStr = expectedDeliveryDate.toISOString().split('T')[0];

    const [orderResult] = await conn.query(
      `INSERT INTO orders (user_id, status, payment_method, payment_status, subtotal, tax_amount, discount_amount, coupon_code, delivery_charge, total, shipping_address, stripe_payment_intent_id, razorpay_order_id, expected_delivery_date)
       VALUES (?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user!.userId, paymentMethod, paymentStatus, subtotal, taxTotal, discountAmount, couponCode || null, deliveryCharge, total,
       JSON.stringify(shippingAddress), paymentIntentId || null, razorpayOrderId || null, expectedDeliveryStr]
    ) as any[];

    const orderId = orderResult.insertId;

    // Insert order items and decrement stock
    for (const item of orderItemsData) {
      let variantSnapshot = null;

      if (item.variant_id) {
        // Lock the variant row to prevent race conditions
        const [lockedVariants] = await conn.query(
          'SELECT id, stock_quantity, option_combination, price FROM product_variants WHERE id = ? FOR UPDATE',
          [item.variant_id]
        ) as any[];

        if (lockedVariants.length === 0) {
          await conn.rollback();
          return res.status(400).json({ status: 'error', message: 'Variant no longer available', errors: [] });
        }

        const lockedVariant = lockedVariants[0];

        if (item.quantity > lockedVariant.stock_quantity) {
          await conn.rollback();
          return res.status(400).json({ status: 'error', message: 'Insufficient stock for variant', errors: [] });
        }

        // Build variant snapshot
        const optionCombination = typeof lockedVariant.option_combination === 'string'
          ? JSON.parse(lockedVariant.option_combination)
          : lockedVariant.option_combination;
        variantSnapshot = JSON.stringify({ ...optionCombination, price: Number(lockedVariant.price) });

        // Deduct variant stock
        await conn.query(
          'UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ?',
          [item.quantity, item.variant_id]
        );
      } else {
        // Decrement product-level stock for non-variant products
        await conn.query(
          'UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      await conn.query(
        'INSERT INTO order_items (order_id, product_id, variant_id, vendor_id, product_name, unit_price, quantity, tax_rate_applied, tax_amount, variant_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [orderId, item.product_id, item.variant_id || null, item.vendor_id, item.name, item.unit_price, item.quantity, item.taxRate, item.taxAmount, variantSnapshot]
      );

      // Mark out_of_stock if needed (only for non-variant products)
      if (!item.variant_id) {
        await conn.query(
          `UPDATE products SET status = 'out_of_stock' WHERE id = ? AND stock_quantity = 0 AND status = 'active'`,
          [item.product_id]
        );
      }
    }

    // Commission will be calculated when order is delivered

    // Audit log
    await conn.query(
      'INSERT INTO order_status_log (order_id, from_status, to_status, changed_by, note) VALUES (?, NULL, "confirmed", ?, "Order placed")',
      [orderId, req.user!.userId]
    );

    // Clear cart
    await conn.query('DELETE FROM cart_items WHERE cart_id = ?', [carts[0].id]);

    await conn.commit();

    return res.status(201).json({
      status: 'success',
      message: 'Order placed successfully.',
      orderId,
      total: total.toFixed(2),
    });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
});

// GET /api/v1/orders/my - Customer orders
router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 5));
    const offset = (page - 1) * limit;

    const [countResult] = await conn.query(
      'SELECT COUNT(*) as total FROM orders WHERE user_id = ?',
      [req.user!.userId]
    ) as any[];
    const total = countResult[0].total;

    const [orders] = await conn.query(
      `SELECT o.*, COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?`,
      [req.user!.userId, limit, offset]
    ) as any[];

    // Fetch items for each order
    const orderIds = (orders as any[]).map((o: any) => o.id);
    let itemsMap: Record<number, any[]> = {};
    if (orderIds.length > 0) {
      const [items] = await conn.query(
        `SELECT oi.*, pi.image_url as product_image
         FROM order_items oi
         LEFT JOIN product_images pi ON pi.product_id = oi.product_id AND pi.is_primary = true
         WHERE oi.order_id IN (?)`,
        [orderIds]
      ) as any[];
      for (const item of items as any[]) {
        if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
        itemsMap[item.order_id].push(item);
      }
    }

    const ordersWithItems = (orders as any[]).map((o: any) => ({
      ...o,
      items: itemsMap[o.id] || []
    }));

    return res.json({
      status: 'success',
      orders: ordersWithItems,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } finally {
    conn.release();
  }
});

// GET /api/v1/orders/vendor - Vendor orders
router.get('/vendor', authenticate, requireRole('vendor'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [vendors] = await conn.query('SELECT id FROM vendors WHERE user_id = ?', [req.user!.userId]) as any[];
    if (vendors.length === 0) return res.status(403).json({ status: 'error', message: 'Vendor not found', errors: [] });

    const [orders] = await conn.query(
      `SELECT DISTINCT o.*, u.first_name, u.last_name, u.email as customer_email
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN users u ON u.id = o.user_id
      WHERE oi.vendor_id = ?
      ORDER BY o.created_at DESC`,
      [vendors[0].id]
    ) as any[];
    return res.json({ status: 'success', orders });
  } finally {
    conn.release();
  }
});

// GET /api/v1/orders/returns/mine - Customer's return requests
router.get('/returns/mine', authenticate, requireRole('customer'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [returns] = await conn.query(
      `SELECT rr.*, o.total, o.created_at as order_date
       FROM return_requests rr
       JOIN orders o ON o.id = rr.order_id
       WHERE rr.user_id = ?
       ORDER BY rr.created_at DESC`,
      [req.user!.userId]
    ) as any[];
    return res.json({ status: 'success', returns });
  } finally {
    conn.release();
  }
});

// GET /api/v1/orders/returns/vendor - Vendor's return requests
router.get('/returns/vendor', authenticate, requireRole('vendor'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [vendors] = await conn.query('SELECT id FROM vendors WHERE user_id = ?', [req.user!.userId]) as any[];
    if (vendors.length === 0) return res.status(403).json({ status: 'error', message: 'Vendor not found', errors: [] });

    const [returns] = await conn.query(
      `SELECT rr.*, o.total, o.created_at as order_date, ANY_VALUE(u.first_name) as first_name, ANY_VALUE(u.last_name) as last_name, ANY_VALUE(u.email) as customer_email
       FROM return_requests rr
       JOIN orders o ON o.id = rr.order_id
       JOIN order_items oi ON oi.order_id = o.id AND oi.vendor_id = ?
       JOIN users u ON u.id = rr.user_id
       GROUP BY rr.id
       ORDER BY rr.created_at DESC`,
      [vendors[0].id]
    ) as any[];
    return res.json({ status: 'success', returns });
  } finally {
    conn.release();
  }
});

// GET /api/v1/orders/returns/admin - Admin sees all return/refund requests
router.get('/returns/admin', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [returns] = await conn.query(
      `SELECT rr.*, o.total, o.created_at as order_date, ANY_VALUE(u.first_name) as first_name, ANY_VALUE(u.last_name) as last_name, ANY_VALUE(u.email) as customer_email,
        ANY_VALUE(v.store_name) as vendor_name
       FROM return_requests rr
       JOIN orders o ON o.id = rr.order_id
       JOIN users u ON u.id = rr.user_id
       JOIN order_items oi ON oi.order_id = o.id
       JOIN vendors v ON v.id = oi.vendor_id
       GROUP BY rr.id
       ORDER BY FIELD(rr.status, 'refund_pending', 'pending', 'approved', 'refunded', 'rejected'), rr.created_at DESC`
    ) as any[];
    return res.json({ status: 'success', returns });
  } finally {
    conn.release();
  }
});

// GET /api/v1/orders/:id - Order detail
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [orders] = await conn.query(
      `SELECT o.*, u.first_name, u.last_name, u.email as customer_email
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE o.id = ?`,
      [req.params.id]
    ) as any[];

    if (orders.length === 0) return res.status(404).json({ status: 'error', message: 'Order not found', errors: [] });
    const order = orders[0];

    if (req.user!.role === 'customer' && order.user_id !== req.user!.userId) {
      return res.status(403).json({ status: 'error', message: 'Access denied', errors: [] });
    }

    const [items] = await conn.query(
      `SELECT oi.*, pi.image_url as product_image,
        v.store_name as vendor_name, v.contact_email as vendor_email, v.contact_phone as vendor_phone,
        v.logo_url as vendor_logo, v.gst_number as vendor_gst, v.fssai_number as vendor_fssai,
        v.business_address as vendor_address, v.signature_url as vendor_signature
      FROM order_items oi
      LEFT JOIN product_images pi ON pi.product_id = oi.product_id AND pi.is_primary = true
      LEFT JOIN vendors v ON v.id = oi.vendor_id
      WHERE oi.order_id = ?`,
      [req.params.id]
    ) as any[];

    const [logs] = await conn.query(
      `SELECT osl.*, u.first_name, u.last_name, u.role
      FROM order_status_log osl
      JOIN users u ON u.id = osl.changed_by
      WHERE osl.order_id = ?
      ORDER BY osl.created_at ASC`,
      [req.params.id]
    ) as any[];

    // Check for return request
    const [returnReqs] = await conn.query(
      'SELECT * FROM return_requests WHERE order_id = ? LIMIT 1',
      [req.params.id]
    ) as any[];
    const returnRequest = returnReqs.length > 0 ? returnReqs[0] : null;

    // Check if vendor has return policy enabled
    const [vendorInfo] = await conn.query(
      'SELECT DISTINCT v.return_policy_enabled FROM order_items oi JOIN vendors v ON v.id = oi.vendor_id WHERE oi.order_id = ? LIMIT 1',
      [req.params.id]
    ) as any[];
    const returnPolicyEnabled = vendorInfo.length > 0 ? !!vendorInfo[0].return_policy_enabled : false;

    return res.json({ status: 'success', order: { ...order, items, statusLog: logs, returnRequest, returnPolicyEnabled } });
  } finally {
    conn.release();
  }
});

// PUT /api/v1/orders/:id/status - Update order status
router.put('/:id/status', authenticate, async (req: AuthRequest, res: Response) => {
  const { status, note } = req.body;
  const conn = await pool.getConnection();
  try {
    const [orders] = await conn.query('SELECT * FROM orders WHERE id = ?', [req.params.id]) as any[];
    if (orders.length === 0) return res.status(404).json({ status: 'error', message: 'Order not found', errors: [] });

    const oldStatus = orders[0].status;
    await conn.query('UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?', [status, req.params.id]);
    await conn.query(
      'INSERT INTO order_status_log (order_id, from_status, to_status, changed_by, note) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, oldStatus, status, req.user!.userId, note || null]
    );

    // Calculate commission when order is delivered
    if (status === 'delivered') {
      // Check if commission already exists for this order
      const [existingCommissions] = await conn.query(
        'SELECT id FROM commissions WHERE order_id = ?', [req.params.id]
      ) as any[];

      if (existingCommissions.length === 0) {
        const [orderItems] = await conn.query(
          'SELECT vendor_id, unit_price, quantity FROM order_items WHERE order_id = ?',
          [req.params.id]
        ) as any[];

        const vendorGroups: Record<number, number> = {};
        for (const item of orderItems as any[]) {
          vendorGroups[item.vendor_id] = (vendorGroups[item.vendor_id] || 0) + Number(item.unit_price) * item.quantity;
        }

        const [globalSettings] = await conn.query(
          `SELECT value FROM platform_settings WHERE \`key\` = 'global_commission_rate'`
        ) as any[];
        const globalRate = globalSettings.length > 0 ? Number(JSON.parse(globalSettings[0].value)) : 10;

        for (const [vendorId, vendorSubtotal] of Object.entries(vendorGroups)) {
          const [vendors] = await conn.query('SELECT commission_rate FROM vendors WHERE id = ?', [vendorId]) as any[];
          const rate = vendors.length > 0 && vendors[0].commission_rate !== null ? Number(vendors[0].commission_rate) : globalRate;
          const commissionAmount = (vendorSubtotal as number) * rate / 100;
          await conn.query(
            'INSERT INTO commissions (order_id, vendor_id, order_total, commission_rate, commission_amount) VALUES (?, ?, ?, ?, ?)',
            [req.params.id, Number(vendorId), vendorSubtotal, rate, commissionAmount]
          );
        }
      }
    }

    return res.json({ status: 'success', message: 'Order status updated.' });
  } finally {
    conn.release();
  }
});

// POST /api/v1/orders/:id/cancel - Cancel order
router.post('/:id/cancel', authenticate, requireRole('customer'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [orders] = await conn.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [req.params.id, req.user!.userId]
    ) as any[];

    if (orders.length === 0) return res.status(404).json({ status: 'error', message: 'Order not found', errors: [] });
    if (orders[0].status !== 'confirmed') {
      return res.status(400).json({ status: 'error', message: 'Only confirmed orders can be cancelled.', errors: [] });
    }

    await conn.query(
      'UPDATE orders SET status = "cancelled", payment_status = CASE WHEN payment_method != "cod" THEN "refunded" ELSE payment_status END WHERE id = ?',
      [req.params.id]
    );

    await conn.query(
      'INSERT INTO order_status_log (order_id, from_status, to_status, changed_by, note) VALUES (?, "confirmed", "cancelled", ?, "Cancelled by customer")',
      [req.params.id, req.user!.userId]
    );

    return res.json({ status: 'success', message: 'Order cancelled successfully.' });
  } finally {
    conn.release();
  }
});

// GET /api/v1/orders (admin)
router.get('/', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { status, page = 1 } = req.query;
  const limit = 20;
  const offset = (Number(page) - 1) * limit;
  const conn = await pool.getConnection();
  try {
    let where = '';
    const params: any[] = [];
    if (status) { where = 'WHERE o.status = ?'; params.push(status); }

    const [orders] = await conn.query(
      `SELECT o.*, ANY_VALUE(u.first_name) as first_name, ANY_VALUE(u.last_name) as last_name, ANY_VALUE(u.email) as customer_email, COUNT(oi.id) as item_count
      FROM orders o
      JOIN users u ON u.id = o.user_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      ${where}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ) as any[];

    return res.json({ status: 'success', orders });
  } finally {
    conn.release();
  }
});

// ============ RETURN REQUESTS ============

// POST /api/v1/orders/:id/return - Customer requests a return
router.post('/:id/return', authenticate, requireRole('customer'), async (req: AuthRequest, res: Response) => {
  const { reason, proofImageUrl } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ status: 'error', message: 'Reason is required.', errors: [] });
  }
  if (!proofImageUrl) {
    return res.status(400).json({ status: 'error', message: 'Proof image is required.', errors: [] });
  }
  const conn = await pool.getConnection();
  try {
    const [orders] = await conn.query(
      'SELECT o.*, v.return_policy_enabled FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN vendors v ON v.id = oi.vendor_id WHERE o.id = ? AND o.user_id = ? LIMIT 1',
      [req.params.id, req.user!.userId]
    ) as any[];

    if (orders.length === 0) return res.status(404).json({ status: 'error', message: 'Order not found', errors: [] });
    const order = orders[0];

    if (order.status !== 'delivered') {
      return res.status(400).json({ status: 'error', message: 'Only delivered orders can be returned.', errors: [] });
    }
    if (!order.return_policy_enabled) {
      return res.status(400).json({ status: 'error', message: 'This vendor does not accept returns.', errors: [] });
    }

    // Check if return already requested
    const [existing] = await conn.query(
      'SELECT id FROM return_requests WHERE order_id = ? AND user_id = ?',
      [req.params.id, req.user!.userId]
    ) as any[];
    if (existing.length > 0) {
      return res.status(400).json({ status: 'error', message: 'Return already requested for this order.', errors: [] });
    }

    // Check 10-day window
    const deliveredAt = new Date(order.updated_at);
    const now = new Date();
    const daysSinceDelivery = (now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivery > 10) {
      return res.status(400).json({ status: 'error', message: 'Return window (10 days) has expired.', errors: [] });
    }

    await conn.query(
      'INSERT INTO return_requests (order_id, user_id, reason, proof_image_url, refund_amount) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, req.user!.userId, reason.trim(), proofImageUrl, order.total]
    );

    // Update order status to return_requested
    await conn.query('UPDATE orders SET status = "return_requested" WHERE id = ?', [req.params.id]);
    await conn.query(
      'INSERT INTO order_status_log (order_id, from_status, to_status, changed_by, note) VALUES (?, "delivered", "return_requested", ?, "Return requested by customer")',
      [req.params.id, req.user!.userId]
    );

    return res.status(201).json({ status: 'success', message: 'Return request submitted.' });
  } finally {
    conn.release();
  }
});

// PUT /api/v1/orders/returns/:id - Vendor approve/reject return
router.put('/returns/:id', authenticate, requireRole('vendor'), async (req: AuthRequest, res: Response) => {
  const { status, vendorNote } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ status: 'error', message: 'Status must be approved or rejected.', errors: [] });
  }
  const conn = await pool.getConnection();
  try {
    const [vendors] = await conn.query('SELECT id FROM vendors WHERE user_id = ?', [req.user!.userId]) as any[];
    if (vendors.length === 0) return res.status(403).json({ status: 'error', message: 'Vendor not found', errors: [] });

    const [returns] = await conn.query(
      `SELECT rr.* FROM return_requests rr
       JOIN orders o ON o.id = rr.order_id
       JOIN order_items oi ON oi.order_id = o.id AND oi.vendor_id = ?
       WHERE rr.id = ?`,
      [vendors[0].id, req.params.id]
    ) as any[];

    if (returns.length === 0) return res.status(404).json({ status: 'error', message: 'Return request not found', errors: [] });
    if (returns[0].status !== 'pending') {
      return res.status(400).json({ status: 'error', message: 'Return request already processed.', errors: [] });
    }

    // If approved, set status to refund_pending (admin needs to process refund)
    const newStatus = status === 'approved' ? 'refund_pending' : 'rejected';
    await conn.query(
      'UPDATE return_requests SET status = ?, vendor_note = ?, refund_requested_at = CASE WHEN ? = "refund_pending" THEN NOW() ELSE NULL END WHERE id = ?',
      [newStatus, vendorNote || null, newStatus, req.params.id]
    );

    return res.json({ status: 'success', message: status === 'approved' ? 'Return approved. Refund request sent to admin.' : 'Return request rejected.' });
  } finally {
    conn.release();
  }
});

// PUT /api/v1/orders/returns/:id/refund - Admin processes refund
router.put('/returns/:id/refund', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { adminNote } = req.body;
  const conn = await pool.getConnection();
  try {
    const [returns] = await conn.query(
      'SELECT * FROM return_requests WHERE id = ?',
      [req.params.id]
    ) as any[];

    if (returns.length === 0) return res.status(404).json({ status: 'error', message: 'Return request not found', errors: [] });
    if (returns[0].status !== 'refund_pending') {
      return res.status(400).json({ status: 'error', message: 'Return is not pending refund.', errors: [] });
    }

    await conn.query(
      'UPDATE return_requests SET status = "refunded", admin_note = ?, refund_completed_at = NOW() WHERE id = ?',
      [adminNote || 'Refund processed. Amount will be credited within 3-5 business days.', req.params.id]
    );

    // Update order status to returned and payment to refunded
    await conn.query(
      'UPDATE orders SET status = "returned", payment_status = "refunded" WHERE id = ?',
      [returns[0].order_id]
    );
    await conn.query(
      'INSERT INTO order_status_log (order_id, from_status, to_status, changed_by, note) VALUES (?, "return_requested", "returned", ?, "Refund processed by admin")',
      [returns[0].order_id, req.user!.userId]
    );

    return res.json({ status: 'success', message: 'Refund processed successfully.' });
  } finally {
    conn.release();
  }
});

export default router;
