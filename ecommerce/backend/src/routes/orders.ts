import { Router, Response } from 'express';
import pool from '../db/pool';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/v1/orders - Place order
router.post('/', authenticate, requireRole('customer'), async (req: AuthRequest, res: Response) => {
  const { shippingAddress, paymentMethod, paymentIntentId, razorpayOrderId, couponCode } = req.body;

  console.log('[ORDER] couponCode received:', couponCode);

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
      console.log('[ORDER] Looking up coupon:', couponCode.toUpperCase());
      const [coupons] = await conn.query(
        'SELECT * FROM coupons WHERE code = ? AND is_active = true',
        [couponCode.toUpperCase()]
      ) as any[];
      console.log('[ORDER] Coupons found:', coupons.length);
      if (coupons.length > 0) {
        const coupon = coupons[0];
        const notExpired = !coupon.expires_at || new Date(coupon.expires_at) > new Date();
        const withinLimit = !coupon.usage_limit || coupon.usage_count < coupon.usage_limit;
        const meetsMin = !coupon.min_order_amount || subtotal >= Number(coupon.min_order_amount);
        console.log('[ORDER] Coupon checks:', { notExpired, withinLimit, meetsMin, subtotal, discount_type: coupon.discount_type, discount_value: coupon.discount_value });
        if (notExpired && withinLimit && meetsMin) {
          discountAmount = coupon.discount_type === 'percentage'
            ? subtotal * Number(coupon.discount_value) / 100
            : Math.min(Number(coupon.discount_value), subtotal);
          appliedCouponId = coupon.id;
          console.log('[ORDER] Discount applied:', discountAmount);
          // Increment usage
          await conn.query('UPDATE coupons SET usage_count = usage_count + 1 WHERE id = ?', [coupon.id]);
        }
      }
    } else {
      console.log('[ORDER] No couponCode in request body');
    }

    const total = subtotal + taxTotal - discountAmount;
    const paymentStatus = paymentMethod === 'cod' ? 'pending' : 'paid';

    const [orderResult] = await conn.query(
      `INSERT INTO orders (user_id, status, payment_method, payment_status, subtotal, tax_amount, discount_amount, coupon_code, total, shipping_address, stripe_payment_intent_id, razorpay_order_id)
       VALUES (?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user!.userId, paymentMethod, paymentStatus, subtotal, taxTotal, discountAmount, couponCode || null, total,
       JSON.stringify(shippingAddress), paymentIntentId || null, razorpayOrderId || null]
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
    const [orders] = await conn.query(
      `SELECT o.*, COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC`,
      [req.user!.userId]
    ) as any[];
    return res.json({ status: 'success', orders });
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
      `SELECT oi.*, pi.image_url as product_image
      FROM order_items oi
      LEFT JOIN product_images pi ON pi.product_id = oi.product_id AND pi.is_primary = true
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

    return res.json({ status: 'success', order: { ...order, items, statusLog: logs } });
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

export default router;
