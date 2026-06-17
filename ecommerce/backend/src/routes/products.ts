import { Router, Response } from 'express';
import pool from '../db/pool';
import { authenticate, requireRole, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/v1/products - Public storefront listing
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  const { search, categoryId, minPrice, maxPrice, page = 1, vendorId, sort = 'newest', brandIds, rating, availability, limit: limitParam } = req.query;
  const limit = Math.min(Number(limitParam) || 20, 50);
  const offset = (Number(page) - 1) * limit;

  const conn = await pool.getConnection();
  try {
    // Get wholesale settings
    const [settings] = await conn.query(
      `SELECT \`key\`, value FROM platform_settings WHERE \`key\` IN ('wholesale_enabled', 'wholesale_visibility')`
    ) as any[];
    const settingsMap: Record<string, any> = {};
    for (const s of settings) settingsMap[s.key] = JSON.parse(s.value);

    const wholesaleEnabled = settingsMap['wholesale_enabled'] === true;
    const wholesaleVisibility = settingsMap['wholesale_visibility'] || 'all';
    const userWholesaleEligible = req.user ? await checkWholesaleEligible(conn, req.user.userId) : false;
    const showWholesale = wholesaleEnabled && (wholesaleVisibility === 'all' || userWholesaleEligible);

    let whereClauses = ['v.status = "approved"'];
    let params: any[] = [];

    // Availability filter
    if (availability === 'out_of_stock') {
      whereClauses.push('(p.status = "out_of_stock" OR p.stock_quantity = 0)');
      whereClauses.push('p.status IN ("active", "out_of_stock")');
    } else if (availability === 'in_stock') {
      whereClauses.push('p.status = "active"');
      whereClauses.push('p.stock_quantity > 0');
    } else if (availability === 'all') {
      whereClauses.push('p.status IN ("active", "out_of_stock")');
    } else {
      // Default: show active (includes 0 stock as out_of_stock display)
      whereClauses.push('p.status IN ("active", "out_of_stock")');
    }

    if (search) {
      whereClauses.push('(p.name LIKE ? OR p.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (categoryId) {
      whereClauses.push('(p.category_id = ? OR p.category_id IN (SELECT id FROM categories WHERE parent_id = ?))');
      params.push(Number(categoryId), Number(categoryId));
    }
    if (minPrice) {
      whereClauses.push('p.price >= ?');
      params.push(Number(minPrice));
    }
    if (maxPrice) {
      whereClauses.push('p.price <= ?');
      params.push(Number(maxPrice));
    }
    if (vendorId) {
      whereClauses.push('p.vendor_id = ?');
      params.push(Number(vendorId));
    }
    if (brandIds) {
      const ids = String(brandIds).split(',').map(Number).filter(n => !isNaN(n) && n > 0);
      if (ids.length > 0) {
        whereClauses.push(`p.brand_id IN (${ids.map(() => '?').join(',')})`);
        params.push(...ids);
      }
    }

    const whereSQL = 'WHERE ' + whereClauses.join(' AND ');

    // Rating filter - applied as HAVING since avg_rating comes from a subquery
    let havingSQL = '';
    const havingParams: any[] = [];
    if (rating && Number(rating) > 0) {
      havingSQL = 'HAVING avg_rating >= ?';
      havingParams.push(Number(rating));
    }

    let orderSQL = 'ORDER BY p.created_at DESC';
    if (sort === 'price_asc') orderSQL = 'ORDER BY p.price ASC';
    else if (sort === 'price_desc') orderSQL = 'ORDER BY p.price DESC';
    else if (sort === 'popular') orderSQL = 'ORDER BY p.created_at DESC';
    else if (sort === 'rating') orderSQL = 'ORDER BY avg_rating DESC';

    const [products] = await conn.query(
      `SELECT p.*, c.name as category_name, v.store_name, v.store_slug, v.delivery_days,
        pi.image_url as primary_image,
        po.offer_price, po.ends_at as offer_ends_at,
        CASE WHEN po.id IS NOT NULL THEN true ELSE false END as is_on_sale,
        ${showWholesale ? 'p.wholesale_price, p.wholesale_min_qty, p.wholesale_enabled' : 'NULL as wholesale_price, NULL as wholesale_min_qty, false as wholesale_enabled'},
        COALESCE(rv.avg_rating, 0) as avg_rating, COALESCE(rv.review_count, 0) as review_count,
        vp.min_variant_price, vp.max_variant_price,
        br.name as brand_name
      FROM products p
      JOIN vendors v ON p.vendor_id = v.id
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
      LEFT JOIN product_offers po ON po.product_id = p.id AND po.starts_at <= NOW() AND po.ends_at >= NOW()
      LEFT JOIN (SELECT product_id, AVG(rating) as avg_rating, COUNT(*) as review_count FROM product_reviews GROUP BY product_id) rv ON rv.product_id = p.id
      LEFT JOIN (SELECT product_id, MIN(price) as min_variant_price, MAX(price) as max_variant_price FROM product_variants WHERE is_active = true GROUP BY product_id) vp ON vp.product_id = p.id
      LEFT JOIN brands br ON br.id = p.brand_id
      ${whereSQL}
      ${havingSQL}
      ${orderSQL}
      LIMIT ? OFFSET ?`,
      [...params, ...havingParams, limit, offset]
    ) as any[];

    // Count query also needs the rating filter
    let countQuery = `SELECT COUNT(*) as total FROM products p JOIN vendors v ON p.vendor_id = v.id`;
    let countParams = [...params];
    if (havingSQL) {
      countQuery = `SELECT COUNT(*) as total FROM (
        SELECT p.id, COALESCE(rv.avg_rating, 0) as avg_rating
        FROM products p
        JOIN vendors v ON p.vendor_id = v.id
        LEFT JOIN (SELECT product_id, AVG(rating) as avg_rating FROM product_reviews GROUP BY product_id) rv ON rv.product_id = p.id
        ${whereSQL}
        ${havingSQL}
      ) filtered`;
      countParams = [...params, ...havingParams];
    } else {
      countQuery += ` ${whereSQL}`;
    }

    const [countResult] = await conn.query(countQuery, countParams) as any[];

    return res.json({
      status: 'success',
      products,
      pagination: {
        total: countResult[0].total,
        page: Number(page),
        limit,
        pages: Math.ceil(countResult[0].total / limit),
      },
    });
  } finally {
    conn.release();
  }
});

// GET /api/v1/products/featured
router.get('/featured', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [settings] = await conn.query(
      `SELECT value FROM platform_settings WHERE \`key\` = 'homepage_featured_enabled'`
    ) as any[];
    if (settings.length > 0 && JSON.parse(settings[0].value) === false) {
      return res.json({ status: 'success', products: [] });
    }

    let [products] = await conn.query(
      `SELECT p.*, v.store_name, v.store_slug, v.delivery_days, c.name as category_name,
        pi.image_url as primary_image, po.offer_price,
        CASE WHEN po.id IS NOT NULL THEN true ELSE false END as is_on_sale
      FROM featured_products fp
      JOIN products p ON fp.product_id = p.id AND p.status = 'active'
      JOIN vendors v ON p.vendor_id = v.id AND v.status = 'approved'
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
      LEFT JOIN product_offers po ON po.product_id = p.id AND po.starts_at <= NOW() AND po.ends_at >= NOW()
      ORDER BY fp.featured_at DESC`
    ) as any[];

    if ((products as any[]).length === 0) {
      [products] = await conn.query(
        `SELECT p.*, v.store_name, v.store_slug, c.name as category_name,
          pi.image_url as primary_image
        FROM products p
        JOIN vendors v ON p.vendor_id = v.id AND v.status = 'approved'
        JOIN categories c ON p.category_id = c.id
        LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
        WHERE p.status = 'active'
        ORDER BY p.created_at DESC LIMIT 8`
      ) as any[];
    }

    return res.json({ status: 'success', products });
  } finally {
    conn.release();
  }
});

// GET /api/v1/products/new-arrivals
router.get('/new-arrivals', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [settings] = await conn.query(
      `SELECT \`key\`, value FROM platform_settings WHERE \`key\` IN ('homepage_new_arrivals_enabled','homepage_new_arrivals_count')`
    ) as any[];
    const sm: Record<string, any> = {};
    for (const s of settings) sm[s.key] = JSON.parse(s.value);
    if (sm['homepage_new_arrivals_enabled'] === false) {
      return res.json({ status: 'success', products: [] });
    }
    const count = sm['homepage_new_arrivals_count'] || 8;

    const [products] = await conn.query(
      `SELECT p.*, v.store_name, c.name as category_name, pi.image_url as primary_image,
        po.offer_price, CASE WHEN po.id IS NOT NULL THEN true ELSE false END as is_on_sale
      FROM products p
      JOIN vendors v ON p.vendor_id = v.id AND v.status = 'approved'
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
      LEFT JOIN product_offers po ON po.product_id = p.id AND po.starts_at <= NOW() AND po.ends_at >= NOW()
      WHERE p.status = 'active'
      ORDER BY p.created_at DESC LIMIT ?`,
      [count]
    ) as any[];

    return res.json({ status: 'success', products });
  } finally {
    conn.release();
  }
});

// GET /api/v1/products/best-sellers
router.get('/best-sellers', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [settings] = await conn.query(
      `SELECT \`key\`, value FROM platform_settings WHERE \`key\` IN ('homepage_best_sellers_enabled','homepage_best_sellers_count')`
    ) as any[];
    const sm: Record<string, any> = {};
    for (const s of settings) sm[s.key] = JSON.parse(s.value);
    if (sm['homepage_best_sellers_enabled'] === false) {
      return res.json({ status: 'success', products: [] });
    }
    const count = sm['homepage_best_sellers_count'] || 8;

    const [products] = await conn.query(
      `SELECT p.*, ANY_VALUE(v.store_name) as store_name, ANY_VALUE(v.store_slug) as store_slug, ANY_VALUE(v.logo_url) as store_logo,
        ANY_VALUE(c.name) as category_name,
        ANY_VALUE(pi.image_url) as primary_image,
        COALESCE(SUM(oi.quantity), 0) as total_sold
      FROM products p
      JOIN vendors v ON p.vendor_id = v.id AND v.status = 'approved'
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelled'
      WHERE p.status = 'active'
      GROUP BY p.id
      ORDER BY total_sold DESC LIMIT ?`,
      [count]
    ) as any[];

    return res.json({ status: 'success', products });
  } finally {
    conn.release();
  }
});

// GET /api/v1/products/on-sale
router.get('/on-sale', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [products] = await conn.query(
      `SELECT p.*, v.store_name, c.name as category_name, pi.image_url as primary_image,
        po.offer_price, po.ends_at as offer_ends_at, true as is_on_sale
      FROM products p
      JOIN product_offers po ON po.product_id = p.id AND po.starts_at <= NOW() AND po.ends_at >= NOW()
      JOIN vendors v ON p.vendor_id = v.id AND v.status = 'approved'
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
      WHERE p.status = 'active'
      LIMIT 8`
    ) as any[];
    return res.json({ status: 'success', products });
  } finally {
    conn.release();
  }
});

// GET /api/v1/products/:id - Product detail
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [settings] = await conn.query(
      `SELECT \`key\`, value FROM platform_settings WHERE \`key\` IN ('wholesale_enabled', 'wholesale_visibility')`
    ) as any[];
    const sm: Record<string, any> = {};
    for (const s of settings) sm[s.key] = JSON.parse(s.value);
    const wholesaleEnabled = sm['wholesale_enabled'] === true;
    const wholesaleVisibility = sm['wholesale_visibility'] || 'all';
    const userWholesaleEligible = req.user ? await checkWholesaleEligible(conn, req.user.userId) : false;
    const showWholesale = wholesaleEnabled && (wholesaleVisibility === 'all' || userWholesaleEligible);

    const [products] = await conn.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug,
        v.store_name, v.store_slug, v.description as vendor_description, v.logo_url as vendor_logo,
        v.return_policy_enabled, v.cod_enabled, v.delivery_days,
        tc.rate as tax_rate,
        po.offer_price, po.ends_at as offer_ends_at,
        CASE WHEN po.id IS NOT NULL THEN true ELSE false END as is_on_sale,
        fp.id as is_featured,
        br.name as brand_name, br.logo_url as brand_logo_url
      FROM products p
      JOIN vendors v ON p.vendor_id = v.id AND v.status = 'approved'
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN tax_config tc ON tc.id = p.tax_rate_id
      LEFT JOIN product_offers po ON po.product_id = p.id AND po.starts_at <= NOW() AND po.ends_at >= NOW()
      LEFT JOIN featured_products fp ON fp.product_id = p.id
      LEFT JOIN brands br ON br.id = p.brand_id
      WHERE p.id = ? AND p.status = 'active'`,
      [req.params.id]
    ) as any[];

    if ((products as any[]).length === 0) {
      return res.status(404).json({ status: 'error', message: 'Product not found', errors: [] });
    }

    const product = (products as any[])[0];
    if (!showWholesale) {
      product.wholesale_price = null;
      product.wholesale_min_qty = null;
      product.wholesale_enabled = false;
    }

    const [images] = await conn.query(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order',
      [req.params.id]
    ) as any[];

    // Fetch variant data if product has variants
    let option_types: any[] = [];
    let variants: any[] = [];

    if (product.has_variants) {
      // Query option types with nested values
      const [optionTypes] = await conn.query(
        `SELECT id, name, position FROM variant_option_types WHERE product_id = ? ORDER BY position`,
        [req.params.id]
      ) as any[];

      for (const ot of optionTypes as any[]) {
        const [values] = await conn.query(
          `SELECT id, value FROM variant_option_values WHERE option_type_id = ? ORDER BY position`,
          [ot.id]
        ) as any[];
        option_types.push({ id: ot.id, name: ot.name, position: ot.position, values });
      }

      // Query active product variants
      const [productVariants] = await conn.query(
        `SELECT id, option_combination, price, stock_quantity, sku FROM product_variants WHERE product_id = ? AND is_active = true`,
        [req.params.id]
      ) as any[];

      variants = (productVariants as any[]).map((v: any) => ({
        id: v.id,
        option_combination: typeof v.option_combination === 'string' ? JSON.parse(v.option_combination) : v.option_combination,
        price: v.price,
        stock_quantity: v.stock_quantity,
        sku: v.sku,
      }));
    }

    return res.json({ status: 'success', product: { ...product, images, option_types, variants } });
  } finally {
    conn.release();
  }
});

// POST /api/v1/products - Vendor create product
router.post('/', authenticate, requireRole('vendor'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [vendors] = await conn.query(
      'SELECT id, status FROM vendors WHERE user_id = ?',
      [req.user!.userId]
    ) as any[];

    if (vendors.length === 0 || vendors[0].status !== 'approved') {
      return res.status(403).json({ status: 'error', message: 'Vendor account not approved.', errors: [] });
    }

    const { name, description, price, categoryId, stockQuantity, wholesaleEnabled, wholesalePrice, wholesaleMinQty, images } = req.body;

    if (!name || price === undefined || !categoryId || stockQuantity === undefined) {
      return res.status(400).json({ status: 'error', message: 'Required fields missing.', errors: [] });
    }

    if (Number(price) <= 0) {
      return res.status(400).json({
        status: 'error', message: 'Price must be greater than zero.',
        errors: [{ field: 'price', message: 'Must be > 0' }],
      });
    }

    if (wholesaleEnabled) {
      if (!wholesalePrice || Number(wholesalePrice) <= 0 || Number(wholesalePrice) >= Number(price)) {
        return res.status(400).json({
          status: 'error', message: 'Wholesale price must be > 0 and < retail price.',
          errors: [{ field: 'wholesalePrice', message: 'Must be > 0 and < retail price' }],
        });
      }
      if (!wholesaleMinQty || Number(wholesaleMinQty) < 2) {
        return res.status(400).json({
          status: 'error', message: 'Wholesale minimum quantity must be >= 2.',
          errors: [{ field: 'wholesaleMinQty', message: 'Must be >= 2' }],
        });
      }
    }

    const [result] = await conn.query(
      `INSERT INTO products (vendor_id, category_id, name, description, price, mrp, stock_quantity, status, wholesale_enabled, wholesale_price, wholesale_min_qty, weight_kg, delivery_type, delivery_charge, brand_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_approval', ?, ?, ?, ?, ?, ?, ?)`,
      [vendors[0].id, categoryId, name, description || '', price, req.body.mrp || null, stockQuantity,
       wholesaleEnabled ? 1 : 0, wholesaleEnabled ? wholesalePrice : null, wholesaleEnabled ? wholesaleMinQty : null,
       req.body.weightKg || null, req.body.deliveryType || 'vendor_default', req.body.deliveryCharge || null,
       req.body.brandId || null]
    ) as any[];

    const productId = result.insertId;

    if (images && Array.isArray(images)) {
      for (let i = 0; i < images.length; i++) {
        await conn.query(
          'INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)',
          [productId, images[i], i === 0, i]
        );
      }
    }

    return res.status(201).json({
      status: 'success',
      message: 'Product created and pending approval.',
      productId,
    });
  } finally {
    conn.release();
  }
});

// PUT /api/v1/products/:id - Vendor update product
router.put('/:id', authenticate, requireRole('vendor'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [vendors] = await conn.query('SELECT id FROM vendors WHERE user_id = ?', [req.user!.userId]) as any[];
    if (vendors.length === 0) return res.status(403).json({ status: 'error', message: 'Vendor not found', errors: [] });

    const [products] = await conn.query(
      'SELECT id, status FROM products WHERE id = ? AND vendor_id = ?',
      [req.params.id, vendors[0].id]
    ) as any[];
    if (products.length === 0) return res.status(404).json({ status: 'error', message: 'Product not found', errors: [] });

    const { name, description, price, categoryId, stockQuantity, wholesaleEnabled, wholesalePrice, wholesaleMinQty, weightKg, deliveryType, deliveryCharge, images, brandId } = req.body;

    if (price !== undefined && Number(price) <= 0) {
      return res.status(400).json({ status: 'error', message: 'Price must be > 0', errors: [{ field: 'price', message: 'Must be > 0' }] });
    }

    await conn.query(
      `UPDATE products SET name=?, description=?, price=?, mrp=?, category_id=?, stock_quantity=?,
       wholesale_enabled=?, wholesale_price=?, wholesale_min_qty=?, weight_kg=?, delivery_type=?, delivery_charge=?, brand_id=?, updated_at=NOW(),
       status = CASE WHEN status = 'out_of_stock' AND stock_quantity > 0 THEN 'active' ELSE status END
       WHERE id = ?`,
      [name, description, price, req.body.mrp || null, categoryId, Number(stockQuantity),
       wholesaleEnabled ? 1 : 0, wholesaleEnabled ? wholesalePrice : null, wholesaleEnabled ? wholesaleMinQty : null,
       weightKg || null, deliveryType || 'vendor_default', deliveryCharge || null, brandId || null, req.params.id]
    );

    // Update images if provided
    if (images && Array.isArray(images) && images.length > 0) {
      await conn.query('DELETE FROM product_images WHERE product_id = ?', [req.params.id]);
      for (let i = 0; i < images.length; i++) {
        if (images[i] && images[i].trim()) {
          await conn.query(
            'INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)',
            [req.params.id, images[i], i === 0, i]
          );
        }
      }
    }

    return res.json({ status: 'success', message: 'Product updated.' });
  } finally {
    conn.release();
  }
});

// PATCH /api/v1/products/:id/toggle-status - Vendor enable/disable product
router.patch('/:id/toggle-status', authenticate, requireRole('vendor'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [vendors] = await conn.query('SELECT id FROM vendors WHERE user_id = ?', [req.user!.userId]) as any[];
    if (vendors.length === 0) return res.status(403).json({ status: 'error', message: 'Vendor not found', errors: [] });

    const [products] = await conn.query('SELECT status FROM products WHERE id = ? AND vendor_id = ?', [req.params.id, vendors[0].id]) as any[];
    if ((products as any[]).length === 0) return res.status(404).json({ status: 'error', message: 'Product not found', errors: [] });

    const current = (products as any[])[0].status;
    const newStatus = current === 'disabled' ? 'active' : 'disabled';
    await conn.query('UPDATE products SET status = ? WHERE id = ? AND vendor_id = ?', [newStatus, req.params.id, vendors[0].id]);
    return res.json({ status: 'success', message: `Product ${newStatus === 'disabled' ? 'disabled' : 'enabled'}.`, newStatus });
  } finally {
    conn.release();
  }
});

// DELETE /api/v1/products/:id - Vendor soft-delete
router.delete('/:id', authenticate, requireRole('vendor'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [vendors] = await conn.query('SELECT id FROM vendors WHERE user_id = ?', [req.user!.userId]) as any[];
    if (vendors.length === 0) return res.status(403).json({ status: 'error', message: 'Vendor not found', errors: [] });

    await conn.query(
      'UPDATE products SET status = "deleted" WHERE id = ? AND vendor_id = ?',
      [req.params.id, vendors[0].id]
    );

    return res.json({ status: 'success', message: 'Product deleted.' });
  } finally {
    conn.release();
  }
});

// GET /api/v1/products/vendor/mine - Vendor's own products
router.get('/vendor/mine', authenticate, requireRole('vendor'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [vendors] = await conn.query('SELECT id FROM vendors WHERE user_id = ?', [req.user!.userId]) as any[];
    if (vendors.length === 0) return res.status(403).json({ status: 'error', message: 'Vendor not found', errors: [] });

    const [products] = await conn.query(
      `SELECT p.*, c.name as category_name, pi.image_url as primary_image
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
      WHERE p.vendor_id = ? AND p.status != 'deleted'
      ORDER BY p.created_at DESC`,
      [vendors[0].id]
    ) as any[];

    return res.json({ status: 'success', products });
  } finally {
    conn.release();
  }
});

async function checkWholesaleEligible(conn: any, userId: number): Promise<boolean> {
  const [rows] = await conn.query('SELECT wholesale_eligible FROM users WHERE id = ?', [userId]) as any[];
  return rows.length > 0 && rows[0].wholesale_eligible;
}

export default router;
