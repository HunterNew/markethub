import { Router, Response } from 'express';
import pool from '../db/pool';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import path from 'path';
import fs from 'fs';

const router = Router();

// Get vendor helper
async function getVendor(conn: any, userId: number) {
  const [vendors] = await conn.query('SELECT * FROM vendors WHERE user_id = ?', [userId]) as any[];
  return vendors.length > 0 ? vendors[0] : null;
}

// ============ COUPONS ============
router.get('/coupons', authenticate, requireRole('vendor'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const vendor = await getVendor(conn, req.user!.userId);
    if (!vendor) return res.status(403).json({ status: 'error', message: 'Vendor not found', errors: [] });
    const [coupons] = await conn.query('SELECT * FROM coupons WHERE vendor_id = ? ORDER BY created_at DESC', [vendor.id]) as any[];
    return res.json({ status: 'success', coupons });
  } finally {
    conn.release();
  }
});

router.post('/coupons', authenticate, requireRole('vendor'), async (req: AuthRequest, res: Response) => {
  const { code, discountType, discountValue, minOrderAmount, usageLimit, expiresAt } = req.body;
  const conn = await pool.getConnection();
  try {
    const vendor = await getVendor(conn, req.user!.userId);
    if (!vendor || vendor.status !== 'approved') return res.status(403).json({ status: 'error', message: 'Vendor not approved', errors: [] });

    if (!discountValue || Number(discountValue) <= 0) {
      return res.status(400).json({ status: 'error', message: 'Discount value must be > 0', errors: [{ field: 'discountValue', message: 'Must be > 0' }] });
    }
    if (discountType === 'percentage' && Number(discountValue) > 100) {
      return res.status(400).json({ status: 'error', message: 'Percentage cannot exceed 100', errors: [{ field: 'discountValue', message: 'Max 100%' }] });
    }

    let expiresAtFormatted = null;
    if (expiresAt) {
      const d = new Date(expiresAt);
      expiresAtFormatted = d.toISOString().slice(0, 19).replace('T', ' ');
    }

    await conn.query(
      'INSERT INTO coupons (vendor_id, code, discount_type, discount_value, min_order_amount, usage_limit, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [vendor.id, code.toUpperCase(), discountType, discountValue, minOrderAmount || null, usageLimit || null, expiresAtFormatted]
    );
    return res.status(201).json({ status: 'success', message: 'Coupon created.' });
  } finally {
    conn.release();
  }
});

router.put('/coupons/:id', authenticate, requireRole('vendor'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const vendor = await getVendor(conn, req.user!.userId);
    if (!vendor) return res.status(403).json({ status: 'error', message: 'Vendor not found', errors: [] });
    const { discountValue, minOrderAmount, usageLimit, expiresAt, isActive } = req.body;
    // Convert ISO datetime to MySQL format
    let expiresAtFormatted = null;
    if (expiresAt) {
      const d = new Date(expiresAt);
      expiresAtFormatted = d.toISOString().slice(0, 19).replace('T', ' ');
    }
    await conn.query(
      'UPDATE coupons SET discount_value=?, min_order_amount=?, usage_limit=?, expires_at=?, is_active=? WHERE id=? AND vendor_id=?',
      [discountValue, minOrderAmount || null, usageLimit || null, expiresAtFormatted, isActive ? 1 : 0, req.params.id, vendor.id]
    );
    return res.json({ status: 'success', message: 'Coupon updated.' });
  } finally {
    conn.release();
  }
});

router.delete('/coupons/:id', authenticate, requireRole('vendor'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const vendor = await getVendor(conn, req.user!.userId);
    if (!vendor) return res.status(403).json({ status: 'error', message: 'Vendor not found', errors: [] });
    await conn.query('DELETE FROM coupons WHERE id = ? AND vendor_id = ?', [req.params.id, vendor.id]);
    return res.json({ status: 'success', message: 'Coupon deleted.' });
  } finally {
    conn.release();
  }
});

// ============ PRODUCT OFFERS ============
router.post('/products/:id/offer', authenticate, requireRole('vendor'), async (req: AuthRequest, res: Response) => {
  const { offerPrice, startsAt, endsAt } = req.body;
  const conn = await pool.getConnection();
  try {
    const vendor = await getVendor(conn, req.user!.userId);
    if (!vendor) return res.status(403).json({ status: 'error', message: 'Vendor not found', errors: [] });

    const [products] = await conn.query('SELECT price FROM products WHERE id = ? AND vendor_id = ?', [req.params.id, vendor.id]) as any[];
    if (products.length === 0) return res.status(404).json({ status: 'error', message: 'Product not found', errors: [] });

    if (Number(offerPrice) >= Number(products[0].price)) {
      return res.status(400).json({ status: 'error', message: 'Offer price must be less than retail price', errors: [] });
    }

    // Upsert offer
    await conn.query('DELETE FROM product_offers WHERE product_id = ?', [req.params.id]);
    await conn.query('INSERT INTO product_offers (product_id, offer_price, starts_at, ends_at) VALUES (?, ?, ?, ?)', [req.params.id, offerPrice, startsAt, endsAt]);
    return res.json({ status: 'success', message: 'Offer created.' });
  } finally {
    conn.release();
  }
});

router.delete('/products/:id/offer', authenticate, requireRole('vendor'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const vendor = await getVendor(conn, req.user!.userId);
    if (!vendor) return res.status(403).json({ status: 'error', message: 'Vendor not found', errors: [] });
    await conn.query(
      'DELETE po FROM product_offers po JOIN products p ON p.id = po.product_id WHERE po.product_id = ? AND p.vendor_id = ?',
      [req.params.id, vendor.id]
    );
    return res.json({ status: 'success', message: 'Offer removed.' });
  } finally {
    conn.release();
  }
});

// ============ WITHDRAWALS ============
router.get('/withdrawals', authenticate, requireRole('vendor'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const vendor = await getVendor(conn, req.user!.userId);
    if (!vendor) return res.status(403).json({ status: 'error', message: 'Vendor not found', errors: [] });

    // Calculate balance
    const [earnings] = await conn.query(
      `SELECT COALESCE(SUM(oi.unit_price * oi.quantity), 0) as total_earnings,
        COALESCE(SUM(c.commission_amount), 0) as total_commission
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelled'
      LEFT JOIN commissions c ON c.order_id = o.id AND c.vendor_id = oi.vendor_id
      WHERE oi.vendor_id = ?`,
      [vendor.id]
    ) as any[];

    const [withdrawn] = await conn.query(
      `SELECT COALESCE(SUM(amount), 0) as total_withdrawn FROM withdrawals WHERE vendor_id = ? AND status IN ('pending','approved','completed')`,
      [vendor.id]
    ) as any[];

    const availableBalance = Number(earnings[0].total_earnings) - Number(earnings[0].total_commission) - Number(withdrawn[0].total_withdrawn);

    const [withdrawals] = await conn.query('SELECT * FROM withdrawals WHERE vendor_id = ? ORDER BY created_at DESC', [vendor.id]) as any[];

    return res.json({ status: 'success', withdrawals, availableBalance: availableBalance.toFixed(2) });
  } finally {
    conn.release();
  }
});

router.post('/withdrawals', authenticate, requireRole('vendor'), async (req: AuthRequest, res: Response) => {
  const { amount } = req.body;
  const conn = await pool.getConnection();
  try {
    const vendor = await getVendor(conn, req.user!.userId);
    if (!vendor) return res.status(403).json({ status: 'error', message: 'Vendor not found', errors: [] });

    const [earnings] = await conn.query(
      `SELECT COALESCE(SUM(oi.unit_price * oi.quantity), 0) as total_earnings,
        COALESCE(SUM(c.commission_amount), 0) as total_commission
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelled'
      LEFT JOIN commissions c ON c.order_id = o.id AND c.vendor_id = oi.vendor_id
      WHERE oi.vendor_id = ?`,
      [vendor.id]
    ) as any[];

    const [withdrawn] = await conn.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE vendor_id = ? AND status IN ('pending','approved','completed')`,
      [vendor.id]
    ) as any[];

    const availableBalance = Number(earnings[0].total_earnings) - Number(earnings[0].total_commission) - Number(withdrawn[0].total);

    if (Number(amount) > availableBalance) {
      return res.status(400).json({
        status: 'error',
        message: `Withdrawal amount exceeds available balance of ₹${availableBalance.toFixed(2)}.`,
        errors: [{ field: 'amount', message: `Max: ₹${availableBalance.toFixed(2)}` }],
      });
    }

    await conn.query('INSERT INTO withdrawals (vendor_id, amount) VALUES (?, ?)', [vendor.id, amount]);
    return res.status(201).json({ status: 'success', message: 'Withdrawal request submitted.' });
  } finally {
    conn.release();
  }
});

// ============ PRODUCT VARIANTS ============
router.get('/products/:productId/variants', authenticate, requireRole('vendor'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const vendor = await getVendor(conn, req.user!.userId);
    if (!vendor) return res.status(403).json({ status: 'error', message: 'Vendor not found', errors: [] });

    // Validate vendor owns the product
    const [products] = await conn.query('SELECT id FROM products WHERE id = ? AND vendor_id = ?', [req.params.productId, vendor.id]) as any[];
    if (products.length === 0) return res.status(404).json({ status: 'error', message: 'Product not found', errors: [] });

    // Get option types with their values
    const [optionTypes] = await conn.query(
      'SELECT id, name, position FROM variant_option_types WHERE product_id = ? ORDER BY position',
      [req.params.productId]
    ) as any[];

    for (const optionType of optionTypes) {
      const [values] = await conn.query(
        'SELECT id, value, position FROM variant_option_values WHERE option_type_id = ? ORDER BY position',
        [optionType.id]
      ) as any[];
      optionType.values = values;
    }

    // Get product variants
    const [variants] = await conn.query(
      'SELECT id, option_combination, price, stock_quantity, sku, is_active FROM product_variants WHERE product_id = ? ORDER BY id',
      [req.params.productId]
    ) as any[];

    // Ensure option_combination is parsed as an object
    const parsedVariants = (variants as any[]).map((v: any) => ({
      ...v,
      option_combination: typeof v.option_combination === 'string' ? JSON.parse(v.option_combination) : v.option_combination,
    }));

    return res.json({ status: 'success', optionTypes, variants: parsedVariants });
  } finally {
    conn.release();
  }
});

// PUT /vendor/products/:productId/variants - Upsert variant configuration
router.put('/products/:productId/variants', authenticate, requireRole('vendor'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const vendor = await getVendor(conn, req.user!.userId);
    if (!vendor) return res.status(403).json({ status: 'error', message: 'Vendor not found', errors: [] });

    // Validate vendor owns the product
    const [products] = await conn.query('SELECT id FROM products WHERE id = ? AND vendor_id = ?', [req.params.productId, vendor.id]) as any[];
    if (products.length === 0) return res.status(404).json({ status: 'error', message: 'Product not found', errors: [] });

    const { optionTypes, variants } = req.body;

    // Validate max 3 option types
    if (!optionTypes || optionTypes.length > 3) {
      return res.status(400).json({ message: 'Maximum 3 option types allowed per product' });
    }

    // Validate all variants have price > 0 and stock >= 0
    if (!variants || variants.length === 0 || variants.some((v: any) => !v.price || v.price <= 0 || v.stockQuantity == null || v.stockQuantity < 0)) {
      return res.status(400).json({ message: 'All variants must have a price > 0 and stock >= 0' });
    }

    const productId = req.params.productId;

    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      await conn.beginTransaction();
      try {
        // Lock the product row first to serialize concurrent variant updates
        await conn.query('SELECT id FROM products WHERE id = ? FOR UPDATE', [productId]);

        // Delete existing variant data
        await conn.query('DELETE FROM product_variants WHERE product_id = ?', [productId]);
        await conn.query('DELETE FROM variant_option_types WHERE product_id = ?', [productId]);

        // Insert new option types and values
        const insertedOptionTypes: any[] = [];
        for (const ot of optionTypes) {
          const [otResult] = await conn.query(
            'INSERT INTO variant_option_types (product_id, name, position) VALUES (?, ?, ?)',
            [productId, ot.name, ot.position]
          ) as any[];
          const optionTypeId = otResult.insertId;

          const insertedValues: any[] = [];
          for (let i = 0; i < ot.values.length; i++) {
            const [ovResult] = await conn.query(
              'INSERT INTO variant_option_values (option_type_id, value, position) VALUES (?, ?, ?)',
              [optionTypeId, ot.values[i], i]
            ) as any[];
            insertedValues.push({ id: ovResult.insertId, value: ot.values[i], position: i });
          }

          insertedOptionTypes.push({ id: optionTypeId, name: ot.name, position: ot.position, values: insertedValues });
        }

        // Insert new variants
        const insertedVariants: any[] = [];
        for (const variant of variants) {
          const [vResult] = await conn.query(
            'INSERT INTO product_variants (product_id, option_combination, price, stock_quantity, sku) VALUES (?, ?, ?, ?, ?)',
            [productId, JSON.stringify(variant.optionValues), variant.price, variant.stockQuantity, variant.sku || null]
          ) as any[];
          insertedVariants.push({
            id: vResult.insertId,
            option_combination: variant.optionValues,
            price: variant.price,
            stock_quantity: variant.stockQuantity,
            sku: variant.sku || null,
            is_active: true,
          });
        }

        // Set has_variants = true
        await conn.query('UPDATE products SET has_variants = true WHERE id = ?', [productId]);

        await conn.commit();

        return res.json({ status: 'success', optionTypes: insertedOptionTypes, variants: insertedVariants });
      } catch (err: any) {
        await conn.rollback();
        // Retry on deadlock
        if (err.code === 'ER_LOCK_DEADLOCK' && attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 50 * attempt));
          continue;
        }
        throw err;
      }
    }
  } finally {
    conn.release();
  }
});

// DELETE /vendor/products/:productId/variants - Remove all variant configuration
router.delete('/products/:productId/variants', authenticate, requireRole('vendor'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const vendor = await getVendor(conn, req.user!.userId);
    if (!vendor) return res.status(403).json({ status: 'error', message: 'Vendor not found', errors: [] });

    // Validate vendor owns the product
    const [products] = await conn.query('SELECT id FROM products WHERE id = ? AND vendor_id = ?', [req.params.productId, vendor.id]) as any[];
    if (products.length === 0) return res.status(404).json({ status: 'error', message: 'Product not found', errors: [] });

    const productId = req.params.productId;

    await conn.beginTransaction();
    try {
      // Delete all product variants
      await conn.query('DELETE FROM product_variants WHERE product_id = ?', [productId]);

      // Delete all variant option types (cascades to variant_option_values)
      await conn.query('DELETE FROM variant_option_types WHERE product_id = ?', [productId]);

      // Set has_variants = false
      await conn.query('UPDATE products SET has_variants = false WHERE id = ?', [productId]);

      await conn.commit();

      return res.json({ status: 'success', message: 'Variants removed.' });
    } catch (err) {
      await conn.rollback();
      throw err;
    }
  } finally {
    conn.release();
  }
});

// ============ CSV IMPORT ============
router.post('/products/import', authenticate, requireRole('vendor'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const vendor = await getVendor(conn, req.user!.userId);
    if (!vendor || vendor.status !== 'approved') {
      return res.status(403).json({ status: 'error', message: 'Vendor not approved', errors: [] });
    }

    const { csvData } = req.body;
    if (!csvData) return res.status(400).json({ status: 'error', message: 'No CSV data provided', errors: [] });

    const lines = csvData.trim().split('\n');
    if (lines.length < 2) return res.status(400).json({ status: 'error', message: 'CSV must have header and at least one data row', errors: [] });

    const headers = lines[0].split(',').map((h: string) => h.trim().replace(/"/g, ''));
    const results: any[] = [];
    let created = 0;
    let errors = 0;

    const [categories] = await conn.query('SELECT id, name FROM categories') as any[];
    const categoryMap: Record<string, number> = {};
    for (const cat of categories as any[]) categoryMap[cat.name.toLowerCase()] = cat.id;

    // Vendor image folder: uploads/vendors/{store_slug}/
    const vendorSlug = vendor.store_slug || `vendor-${vendor.id}`;
    const vendorFolder = path.join(__dirname, '../../uploads/vendors', vendorSlug);

    // Resolve image URL: if it starts with http, use as-is; otherwise look in vendor folder
    const resolveImageUrl = (value: string): string | null => {
      if (!value) return null;
      if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/uploads/')) {
        return value;
      }
      // Treat as filename — check if it exists in vendor folder
      const filePath = path.join(vendorFolder, value);
      if (fs.existsSync(filePath)) {
        return `/uploads/vendors/${vendorSlug}/${value}`;
      }
      // File not found in vendor folder, return null
      return null;
    };

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map((v: string) => v.trim().replace(/^"|"$/g, ''));
      const data: Record<string, string> = {};
      headers.forEach((h: string, idx: number) => { data[h] = row[idx] || ''; });

      const rowNum = i + 1;
      const name = data['name'];
      const price = parseFloat(data['price']);
      const categoryName = data['category_name'];
      const stock = parseInt(data['stock']);

      if (!name) { results.push({ row: rowNum, name: name || 'Unknown', status: 'error', message: 'Name is required' }); errors++; continue; }
      if (isNaN(price) || price <= 0) { results.push({ row: rowNum, name, status: 'error', message: 'Price must be > 0' }); errors++; continue; }
      if (!categoryName) { results.push({ row: rowNum, name, status: 'error', message: 'Category name is required' }); errors++; continue; }

      const categoryId = categoryMap[categoryName.toLowerCase()];
      if (!categoryId) { results.push({ row: rowNum, name, status: 'error', message: `Category "${categoryName}" not found` }); errors++; continue; }

      const wholesaleEnabled = ['true', '1', 'yes'].includes((data['wholesale_enabled'] || '').toLowerCase());
      let wholesalePrice = null, wholesaleMinQty = null;

      if (wholesaleEnabled) {
        wholesalePrice = parseFloat(data['wholesale_price']);
        wholesaleMinQty = parseInt(data['wholesale_min_qty']);
        if (isNaN(wholesalePrice) || wholesalePrice <= 0 || wholesalePrice >= price) {
          results.push({ row: rowNum, name, status: 'error', message: 'Invalid wholesale_price' }); errors++; continue;
        }
        if (isNaN(wholesaleMinQty) || wholesaleMinQty < 2) {
          results.push({ row: rowNum, name, status: 'error', message: 'wholesale_min_qty must be >= 2' }); errors++; continue;
        }
      }

      const [result] = await conn.query(
        `INSERT INTO products (vendor_id, category_id, name, description, price, stock_quantity, status, wholesale_enabled, wholesale_price, wholesale_min_qty)
         VALUES (?, ?, ?, ?, ?, ?, 'pending_approval', ?, ?, ?)`,
        [vendor.id, categoryId, name, data['description'] || '', price, isNaN(stock) ? 0 : stock,
         wholesaleEnabled ? 1 : 0, wholesaleEnabled ? wholesalePrice : null, wholesaleEnabled ? wholesaleMinQty : null]
      ) as any[];

      const productId = result.insertId;
      const imageUrls = [data['image_url'], data['image_url_2'], data['image_url_3']]
        .map(v => resolveImageUrl(v))
        .filter(Boolean) as string[];
      for (let j = 0; j < imageUrls.length; j++) {
        await conn.query('INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)',
          [productId, imageUrls[j], j === 0, j]);
      }

      results.push({ row: rowNum, name, status: 'created', images: imageUrls.length });
      created++;
    }

    return res.json({
      status: 'success',
      message: `Import complete: ${created} created, ${errors} failed`,
      created, errors, results,
      vendorFolder: `/uploads/vendors/${vendorSlug}/`,
    });
  } finally {
    conn.release();
  }
});

router.get('/products/import/template', authenticate, requireRole('vendor'), (req, res) => {
  const csv = `name,description,price,category_name,stock,image_url,image_url_2,image_url_3,wholesale_enabled,wholesale_price,wholesale_min_qty
"Wireless Bluetooth Headphones","Premium over-ear headphones with ANC",2999,Electronics,50,headphones.jpg,,,false,,
"USB-C Fast Charger 65W","GaN technology fast charger",1499,Electronics,120,charger.jpg,,,false,,
"Classic Cotton T-Shirt","100% organic cotton unisex t-shirt",799,Clothing,200,tshirt.jpg,,,false,,
"Slim Fit Chino Pants","Comfortable slim-fit chinos",1999,Clothing,80,chinos.jpg,,,false,,
"Bulk Office Paper A4","500 sheets per ream premium paper",499,Books,500,paper.jpg,,,true,399,10`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="product_import_template.csv"');
  return res.send(csv);
});

export default router;
