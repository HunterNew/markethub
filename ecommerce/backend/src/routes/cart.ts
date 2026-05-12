import { Router, Response } from 'express';
import pool from '../db/pool';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

async function getOrCreateCart(conn: any, userId: number) {
  const [carts] = await conn.query('SELECT id FROM cart WHERE user_id = ?', [userId]) as any[];
  if (carts.length > 0) return carts[0].id;
  const [result] = await conn.query('INSERT INTO cart (user_id) VALUES (?)', [userId]) as any[];
  return result.insertId;
}

async function resolvePrice(conn: any, productId: number, quantity: number, userId: number, basePrice?: number): Promise<number> {
  const [settings] = await conn.query(
    `SELECT \`key\`, value FROM platform_settings WHERE \`key\` IN ('wholesale_enabled','wholesale_visibility')`
  ) as any[];
  const sm: Record<string, any> = {};
  for (const s of settings) sm[s.key] = JSON.parse(s.value);

  const [products] = await conn.query(
    'SELECT price, wholesale_enabled, wholesale_price, wholesale_min_qty FROM products WHERE id = ? AND status = "active"',
    [productId]
  ) as any[];

  if (products.length === 0) throw new Error('Product not found or not active');
  const product = products[0];

  // Use variant price as base if provided, otherwise use product price
  const effectivePrice = basePrice !== undefined ? basePrice : Number(product.price);

  const wholesaleEnabled = sm['wholesale_enabled'] === true;
  if (!wholesaleEnabled || !product.wholesale_enabled) return effectivePrice;

  const visibility = sm['wholesale_visibility'] || 'all';
  let eligible = visibility === 'all';
  if (visibility === 'wholesale_eligible') {
    const [users] = await conn.query('SELECT wholesale_eligible FROM users WHERE id = ?', [userId]) as any[];
    eligible = users.length > 0 && users[0].wholesale_eligible;
  }

  if (eligible && product.wholesale_min_qty && quantity >= product.wholesale_min_qty) {
    // For variant products: calculate discount % from product-level prices, apply to variant price
    if (basePrice !== undefined && Number(product.price) > 0 && Number(product.wholesale_price) > 0) {
      const discountRatio = Number(product.wholesale_price) / Number(product.price);
      return Math.round(effectivePrice * discountRatio * 100) / 100;
    }
    return Number(product.wholesale_price);
  }
  return effectivePrice;
}

// GET /api/v1/cart
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const cartId = await getOrCreateCart(conn, req.user!.userId);

    // Check platform wholesale settings
    const [wsSettings] = await conn.query(
      `SELECT \`key\`, value FROM platform_settings WHERE \`key\` IN ('wholesale_enabled','wholesale_visibility')`
    ) as any[];
    const wsm: Record<string, any> = {};
    for (const s of wsSettings) wsm[s.key] = JSON.parse(s.value);
    const platformWholesaleEnabled = wsm['wholesale_enabled'] === true;
    const wsVisibility = wsm['wholesale_visibility'] || 'all';
    let userWholesaleEligible = wsVisibility === 'all';
    if (wsVisibility === 'wholesale_eligible') {
      const [users] = await conn.query('SELECT wholesale_eligible FROM users WHERE id = ?', [req.user!.userId]) as any[];
      userWholesaleEligible = users.length > 0 && users[0].wholesale_eligible;
    }
    const showWholesale = platformWholesaleEnabled && userWholesaleEligible;

    const [items] = await conn.query(
      `SELECT ci.*, p.name, p.stock_quantity as product_stock, p.price as product_price, p.wholesale_price, p.wholesale_min_qty,
        p.wholesale_enabled,
        pi.image_url as primary_image, v.store_name,
        po.offer_price, CASE WHEN po.id IS NOT NULL THEN true ELSE false END as is_on_sale,
        pv.option_combination, pv.price as variant_price, pv.stock_quantity as variant_stock
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      JOIN vendors v ON p.vendor_id = v.id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
      LEFT JOIN product_offers po ON po.product_id = p.id AND po.starts_at <= NOW() AND po.ends_at >= NOW()
      LEFT JOIN product_variants pv ON ci.variant_id = pv.id
      WHERE ci.cart_id = ?`,
      [cartId]
    ) as any[];

    // Compute retail_price and stock_quantity: for variant items use variant values
    const processedItems = (items as any[]).map((item: any) => ({
      ...item,
      retail_price: item.variant_id ? Number(item.variant_price) : Number(item.product_price),
      stock_quantity: item.variant_id ? Number(item.variant_stock) : Number(item.product_stock),
      wholesale_enabled: showWholesale ? item.wholesale_enabled : false,
      wholesale_price: showWholesale ? item.wholesale_price : null,
      wholesale_min_qty: showWholesale ? item.wholesale_min_qty : null,
      option_combination: (() => {
        const oc = item.option_combination;
        if (!oc) return null;
        if (typeof oc === 'string') {
          try { return JSON.parse(oc); } catch { return null; }
        }
        if (Buffer.isBuffer(oc)) {
          try { return JSON.parse(oc.toString()); } catch { return null; }
        }
        return oc;
      })(),
    }));

    const total = processedItems.reduce((sum: number, item: any) => sum + Number(item.unit_price) * item.quantity, 0);

    return res.json({ status: 'success', items: processedItems, total: total.toFixed(2), cartId });
  } finally {
    conn.release();
  }
});

// POST /api/v1/cart/items
router.post('/items', authenticate, async (req: AuthRequest, res: Response) => {
  const { productId, quantity = 1, variantId } = req.body;
  const conn = await pool.getConnection();
  try {
    const [products] = await conn.query(
      'SELECT id, stock_quantity, status, has_variants FROM products WHERE id = ? AND status = "active"',
      [productId]
    ) as any[];
    if (products.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Product not found or not available.', errors: [] });
    }
    const product = products[0];

    // Variant validation
    let variant: any = null;
    if (product.has_variants && !variantId) {
      return res.status(400).json({ status: 'error', message: 'Please select a variant', errors: [] });
    }

    if (variantId) {
      const [variants] = await conn.query(
        'SELECT id, price, stock_quantity, is_active FROM product_variants WHERE id = ? AND product_id = ?',
        [variantId, productId]
      ) as any[];
      if (variants.length === 0 || !variants[0].is_active) {
        return res.status(400).json({ status: 'error', message: 'Invalid variant for this product', errors: [] });
      }
      variant = variants[0];
      if (variant.stock_quantity === 0) {
        return res.status(400).json({ status: 'error', message: 'This variant is out of stock', errors: [] });
      }
    }

    // Determine available stock (variant stock or product stock)
    const availableStock = variant ? variant.stock_quantity : product.stock_quantity;

    const cartId = await getOrCreateCart(conn, req.user!.userId);

    // Uniqueness check uses (cart_id, product_id, variant_id)
    let existing: any[];
    if (variantId) {
      [existing] = await conn.query(
        'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant_id = ?',
        [cartId, productId, variantId]
      ) as any[];
    } else {
      [existing] = await conn.query(
        'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant_id IS NULL',
        [cartId, productId]
      ) as any[];
    }

    let newQty = existing.length > 0 ? existing[0].quantity + Number(quantity) : Number(quantity);
    newQty = Math.min(newQty, availableStock);

    // Use variant price as base price for resolvePrice if variant exists
    const variantBasePrice = variant ? Number(variant.price) : undefined;
    const unitPrice = await resolvePrice(conn, productId, newQty, req.user!.userId, variantBasePrice);

    if (existing.length > 0) {
      await conn.query('UPDATE cart_items SET quantity = ?, unit_price = ? WHERE id = ?', [newQty, unitPrice, existing[0].id]);
    } else {
      await conn.query(
        'INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
        [cartId, productId, variantId || null, newQty, unitPrice]
      );
    }

    const capped = newQty < Number(quantity) + (existing.length > 0 ? existing[0].quantity : 0);
    return res.json({
      status: 'success',
      message: capped ? 'Quantity capped at available stock.' : 'Item added to cart.',
      capped,
      quantity: newQty,
    });
  } finally {
    conn.release();
  }
});

// PUT /api/v1/cart/items/:itemId
router.put('/items/:itemId', authenticate, async (req: AuthRequest, res: Response) => {
  const { quantity } = req.body;
  const conn = await pool.getConnection();
  try {
    const cartId = await getOrCreateCart(conn, req.user!.userId);
    const [items] = await conn.query(
      `SELECT ci.*, p.stock_quantity, pv.stock_quantity as variant_stock, pv.price as variant_price
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       LEFT JOIN product_variants pv ON ci.variant_id = pv.id
       WHERE ci.id = ? AND ci.cart_id = ?`,
      [req.params.itemId, cartId]
    ) as any[];

    if (items.length === 0) return res.status(404).json({ status: 'error', message: 'Cart item not found.', errors: [] });
    const item = items[0];

    if (Number(quantity) <= 0) {
      await conn.query('DELETE FROM cart_items WHERE id = ?', [item.id]);
      return res.json({ status: 'success', message: 'Item removed from cart.' });
    }

    // Use variant stock if variant_id is present, otherwise use product stock
    const availableStock = item.variant_id ? item.variant_stock : item.stock_quantity;
    const newQty = Math.min(Number(quantity), availableStock);

    // Use variant price as base price for resolvePrice if variant exists
    const variantBasePrice = item.variant_id ? Number(item.variant_price) : undefined;
    const unitPrice = await resolvePrice(conn, item.product_id, newQty, req.user!.userId, variantBasePrice);
    await conn.query('UPDATE cart_items SET quantity = ?, unit_price = ? WHERE id = ?', [newQty, unitPrice, item.id]);

    return res.json({ status: 'success', message: 'Cart updated.', quantity: newQty });
  } finally {
    conn.release();
  }
});

// DELETE /api/v1/cart/items/:itemId
router.delete('/items/:itemId', authenticate, async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const cartId = await getOrCreateCart(conn, req.user!.userId);
    await conn.query('DELETE FROM cart_items WHERE id = ? AND cart_id = ?', [req.params.itemId, cartId]);
    return res.json({ status: 'success', message: 'Item removed.' });
  } finally {
    conn.release();
  }
});

// DELETE /api/v1/cart - Clear cart
router.delete('/', authenticate, async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const cartId = await getOrCreateCart(conn, req.user!.userId);
    await conn.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
    return res.json({ status: 'success', message: 'Cart cleared.' });
  } finally {
    conn.release();
  }
});

// POST /api/v1/cart/coupon - Validate and apply coupon
router.post('/coupon', authenticate, async (req: AuthRequest, res: Response) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ status: 'error', message: 'Coupon code is required.', errors: [] });

  const conn = await pool.getConnection();
  try {
    const [coupons] = await conn.query(
      `SELECT c.*, v.store_name FROM coupons c JOIN vendors v ON v.id = c.vendor_id
       WHERE c.code = ? AND c.is_active = true`,
      [code.toUpperCase()]
    ) as any[];

    if (coupons.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Invalid or expired coupon code.', errors: [] });
    }

    const coupon = coupons[0];

    // Check expiry
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return res.status(400).json({ status: 'error', message: 'This coupon has expired.', errors: [] });
    }

    // Check usage limit
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return res.status(400).json({ status: 'error', message: 'This coupon has reached its usage limit.', errors: [] });
    }

    // Get cart total
    const cartId = await getOrCreateCart(conn, req.user!.userId);
    const [items] = await conn.query(
      'SELECT unit_price, quantity FROM cart_items WHERE cart_id = ?', [cartId]
    ) as any[];
    const cartTotal = (items as any[]).reduce((sum: number, i: any) => sum + Number(i.unit_price) * i.quantity, 0);

    // Check min order amount
    if (coupon.min_order_amount && cartTotal < Number(coupon.min_order_amount)) {
      return res.status(400).json({
        status: 'error',
        message: `Minimum order amount of ₹${coupon.min_order_amount} required.`,
        errors: []
      });
    }

    // Calculate discount
    const discountAmount = coupon.discount_type === 'percentage'
      ? cartTotal * Number(coupon.discount_value) / 100
      : Math.min(Number(coupon.discount_value), cartTotal);

    return res.json({
      status: 'success',
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: Number(coupon.discount_value),
        store_name: coupon.store_name,
      },
      discountAmount: Math.round(discountAmount * 100) / 100,
    });
  } finally {
    conn.release();
  }
});

// DELETE /api/v1/cart/coupon - Remove coupon (no-op, coupon is client-side state)
router.delete('/coupon', authenticate, async (req: AuthRequest, res: Response) => {
  return res.json({ status: 'success', message: 'Coupon removed.' });
});

export default router;
