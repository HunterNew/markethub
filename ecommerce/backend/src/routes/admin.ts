import { Router, Response } from 'express';
import pool from '../db/pool';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// ============ VENDORS ============
router.get('/vendors', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  const conn = await pool.getConnection();
  try {
    let where = '';
    const params: any[] = [];
    if (status) { where = 'WHERE v.status = ?'; params.push(status); }
    const [vendors] = await conn.query(
      `SELECT v.*, ANY_VALUE(u.email) as email, ANY_VALUE(u.first_name) as first_name, ANY_VALUE(u.last_name) as last_name,
        COUNT(p.id) as product_count
      FROM vendors v
      JOIN users u ON u.id = v.user_id
      LEFT JOIN products p ON p.vendor_id = v.id AND p.status != 'deleted'
      ${where}
      GROUP BY v.id
      ORDER BY v.created_at DESC`,
      params
    ) as any[];
    return res.json({ status: 'success', vendors });
  } finally {
    conn.release();
  }
});

router.patch('/vendors/:id/approve', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.query('UPDATE vendors SET status = "approved", rejection_reason = NULL WHERE id = ?', [req.params.id]);
    return res.json({ status: 'success', message: 'Vendor approved.' });
  } finally {
    conn.release();
  }
});

router.patch('/vendors/:id/reject', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { reason } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.query('UPDATE vendors SET status = "rejected", rejection_reason = ? WHERE id = ?', [reason, req.params.id]);
    return res.json({ status: 'success', message: 'Vendor rejected.' });
  } finally {
    conn.release();
  }
});

router.patch('/vendors/:id/commission', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { commissionRate } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.query('UPDATE vendors SET commission_rate = ? WHERE id = ?', [commissionRate, req.params.id]);
    return res.json({ status: 'success', message: 'Commission rate updated.' });
  } finally {
    conn.release();
  }
});

// ============ PRODUCTS ============
router.get('/products', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { status = 'pending_approval', page = 1 } = req.query;
  const limit = 20;
  const offset = (Number(page) - 1) * limit;
  const conn = await pool.getConnection();
  try {
    const [products] = await conn.query(
      `SELECT p.*, v.store_name, c.name as category_name, pi.image_url as primary_image
      FROM products p
      JOIN vendors v ON p.vendor_id = v.id
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
      WHERE p.status = ?
      ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [status, limit, offset]
    ) as any[];
    return res.json({ status: 'success', products });
  } finally {
    conn.release();
  }
});

router.get('/products/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [products] = await conn.query(
      `SELECT p.*, v.store_name, c.name as category_name FROM products p JOIN vendors v ON p.vendor_id = v.id JOIN categories c ON p.category_id = c.id WHERE p.id = ?`,
      [req.params.id]
    ) as any[];
    if (products.length === 0) return res.status(404).json({ status: 'error', message: 'Not found', errors: [] });
    const [images] = await conn.query('SELECT * FROM product_images WHERE product_id = ?', [req.params.id]) as any[];
    return res.json({ status: 'success', product: { ...(products as any[])[0], images } });
  } finally {
    conn.release();
  }
});

router.patch('/products/:id/approve', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.query('UPDATE products SET status = "active", rejection_reason = NULL WHERE id = ?', [req.params.id]);
    return res.json({ status: 'success', message: 'Product approved.' });
  } finally {
    conn.release();
  }
});

router.patch('/products/:id/reject', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { reason } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.query('UPDATE products SET status = "rejected", rejection_reason = ? WHERE id = ?', [reason, req.params.id]);
    return res.json({ status: 'success', message: 'Product rejected.' });
  } finally {
    conn.release();
  }
});

router.post('/products/:id/feature', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.query('INSERT IGNORE INTO featured_products (product_id) VALUES (?)', [req.params.id]);
    return res.json({ status: 'success', message: 'Product featured.' });
  } finally {
    conn.release();
  }
});

router.delete('/products/:id/feature', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.query('DELETE FROM featured_products WHERE product_id = ?', [req.params.id]);
    return res.json({ status: 'success', message: 'Product unfeatured.' });
  } finally {
    conn.release();
  }
});

// ============ REPORTS ============
router.get('/reports/summary', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [revenue] = await conn.query(`SELECT COALESCE(SUM(total), 0) as total_revenue, COUNT(*) as total_orders FROM orders WHERE status != 'cancelled'`) as any[];
    const [commissions] = await conn.query(`SELECT COALESCE(SUM(commission_amount), 0) as total_commissions FROM commissions`) as any[];
    const [vendors] = await conn.query(`SELECT COUNT(*) as active_vendors FROM vendors WHERE status = 'approved'`) as any[];
    const [customers] = await conn.query(`SELECT COUNT(*) as total_customers FROM users WHERE role = 'customer'`) as any[];
    const [pendingProducts] = await conn.query(`SELECT COUNT(*) as pending_products FROM products WHERE status = 'pending_approval'`) as any[];

    return res.json({
      status: 'success',
      summary: {
        totalRevenue: revenue[0].total_revenue,
        totalOrders: revenue[0].total_orders,
        totalCommissions: commissions[0].total_commissions,
        activeVendors: vendors[0].active_vendors,
        totalCustomers: customers[0].total_customers,
        pendingProducts: pendingProducts[0].pending_products,
      },
    });
  } finally {
    conn.release();
  }
});

router.get('/reports/sales', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { groupBy = 'day', from, to } = req.query;
  const conn = await pool.getConnection();
  try {
    let dateFormat = '%Y-%m-%d';
    if (groupBy === 'week') dateFormat = '%Y-%u';
    if (groupBy === 'month') dateFormat = '%Y-%m';

    let where = "WHERE o.status != 'cancelled'";
    const params: any[] = [];
    if (from) { where += ' AND o.created_at >= ?'; params.push(from); }
    if (to) { where += ' AND o.created_at <= ?'; params.push(to); }

    const [sales] = await conn.query(
      `SELECT DATE_FORMAT(o.created_at, '${dateFormat}') as period, 
        SUM(o.total) as revenue, 
        COUNT(*) as orders,
        COALESCE(SUM(c_agg.commission), 0) as commission
      FROM orders o
      LEFT JOIN (
        SELECT order_id, SUM(commission_amount) as commission FROM commissions GROUP BY order_id
      ) c_agg ON c_agg.order_id = o.id
      ${where}
      GROUP BY period ORDER BY period DESC LIMIT 30`,
      params
    ) as any[];

    return res.json({ status: 'success', sales });
  } finally {
    conn.release();
  }
});

router.get('/reports/top-products', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [products] = await conn.query(
      `SELECT p.id, ANY_VALUE(p.name) as name, ANY_VALUE(v.store_name) as store_name, SUM(oi.quantity) as units_sold, SUM(oi.unit_price * oi.quantity) as revenue
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN vendors v ON v.id = oi.vendor_id
      JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelled'
      GROUP BY p.id ORDER BY units_sold DESC LIMIT 10`
    ) as any[];
    return res.json({ status: 'success', products });
  } finally {
    conn.release();
  }
});

router.get('/reports/vendors', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [vendors] = await conn.query(
      `SELECT v.id, ANY_VALUE(v.store_name) as store_name, COUNT(DISTINCT o.id) as total_orders, 
        SUM(oi.unit_price * oi.quantity) as total_sales,
        SUM(c.commission_amount) as total_commission
      FROM vendors v
      LEFT JOIN order_items oi ON oi.vendor_id = v.id
      LEFT JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelled'
      LEFT JOIN commissions c ON c.vendor_id = v.id
      WHERE v.status = 'approved'
      GROUP BY v.id ORDER BY total_sales DESC`
    ) as any[];
    return res.json({ status: 'success', vendors });
  } finally {
    conn.release();
  }
});

// ============ SETTINGS ============
router.get('/settings', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [settings] = await conn.query('SELECT * FROM platform_settings') as any[];
    const sm: Record<string, any> = {};
    for (const s of settings as any[]) sm[s.key] = JSON.parse(s.value);
    return res.json({ status: 'success', settings: sm });
  } finally {
    conn.release();
  }
});

router.put('/settings/:key', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { value } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.query(
      'INSERT INTO platform_settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?, updated_at = NOW()',
      [req.params.key, JSON.stringify(value), JSON.stringify(value)]
    );
    return res.json({ status: 'success', message: 'Setting updated.' });
  } finally {
    conn.release();
  }
});

// Tax rates
router.get('/settings/tax/rates', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [rates] = await conn.query('SELECT * FROM tax_config ORDER BY is_default DESC') as any[];
    return res.json({ status: 'success', rates });
  } finally {
    conn.release();
  }
});

router.post('/settings/tax/rates', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { name, rate, isDefault } = req.body;
  if (!rate || Number(rate) <= 0 || Number(rate) > 100) {
    return res.status(400).json({ status: 'error', message: 'Rate must be > 0 and <= 100', errors: [{ field: 'rate', message: 'Invalid rate' }] });
  }
  const conn = await pool.getConnection();
  try {
    if (isDefault) await conn.query('UPDATE tax_config SET is_default = false');
    await conn.query('INSERT INTO tax_config (name, rate, is_default) VALUES (?, ?, ?)', [name, rate, isDefault ? 1 : 0]);
    return res.status(201).json({ status: 'success', message: 'Tax rate created.' });
  } finally {
    conn.release();
  }
});

// Withdrawals (admin)
router.get('/withdrawals', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  const conn = await pool.getConnection();
  try {
    let where = '';
    const params: any[] = [];
    if (status) { where = 'WHERE w.status = ?'; params.push(status); }
    const [withdrawals] = await conn.query(
      `SELECT w.*, v.store_name, v.bank_account_name, v.bank_account_number, v.bank_ifsc, v.bank_name, u.email
      FROM withdrawals w
      JOIN vendors v ON v.id = w.vendor_id
      JOIN users u ON u.id = v.user_id
      ${where}
      ORDER BY w.created_at DESC`,
      params
    ) as any[];
    return res.json({ status: 'success', withdrawals });
  } finally {
    conn.release();
  }
});

router.patch('/withdrawals/:id/approve', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.query('UPDATE withdrawals SET status = "approved" WHERE id = ?', [req.params.id]);
    return res.json({ status: 'success', message: 'Withdrawal approved.' });
  } finally {
    conn.release();
  }
});

router.patch('/withdrawals/:id/complete', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.query('UPDATE withdrawals SET status = "completed" WHERE id = ?', [req.params.id]);
    return res.json({ status: 'success', message: 'Withdrawal completed.' });
  } finally {
    conn.release();
  }
});

router.patch('/withdrawals/:id/reject', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { reason } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.query('UPDATE withdrawals SET status = "rejected", note = ? WHERE id = ?', [reason || null, req.params.id]);
    return res.json({ status: 'success', message: 'Withdrawal rejected.' });
  } finally {
    conn.release();
  }
});

// ============ BANNERS ============
router.get('/banners', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [banners] = await conn.query('SELECT * FROM homepage_banners ORDER BY sort_order ASC, id ASC') as any[];
    return res.json({ status: 'success', banners });
  } finally {
    conn.release();
  }
});

router.post('/banners', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { image_url, title, subtitle, description, link_url, sort_order } = req.body;
  if (!image_url) {
    return res.status(400).json({ status: 'error', message: 'Image URL is required.', errors: [{ field: 'image_url', message: 'Required' }] });
  }
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(
      'INSERT INTO homepage_banners (image_url, title, subtitle, description, link_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [image_url, title || null, subtitle || null, description || null, link_url || null, sort_order || 0]
    ) as any[];
    return res.status(201).json({ status: 'success', message: 'Banner created.', bannerId: result.insertId });
  } finally {
    conn.release();
  }
});

router.put('/banners/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { image_url, title, subtitle, description, link_url, sort_order, is_active } = req.body;
  const conn = await pool.getConnection();
  try {
    const fields: string[] = [];
    const params: any[] = [];
    if (image_url !== undefined) { fields.push('image_url = ?'); params.push(image_url); }
    if (title !== undefined) { fields.push('title = ?'); params.push(title || null); }
    if (subtitle !== undefined) { fields.push('subtitle = ?'); params.push(subtitle || null); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description || null); }
    if (link_url !== undefined) { fields.push('link_url = ?'); params.push(link_url || null); }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); params.push(sort_order); }
    if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active ? 1 : 0); }
    if (fields.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No fields to update.', errors: [] });
    }
    params.push(req.params.id);
    await conn.query(`UPDATE homepage_banners SET ${fields.join(', ')} WHERE id = ?`, params);
    return res.json({ status: 'success', message: 'Banner updated.' });
  } finally {
    conn.release();
  }
});

router.delete('/banners/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.query('DELETE FROM homepage_banners WHERE id = ?', [req.params.id]);
    return res.json({ status: 'success', message: 'Banner deleted.' });
  } finally {
    conn.release();
  }
});

// Users wholesale
router.put('/users/:id/wholesale-eligible', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { wholesaleEligible } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.query('UPDATE users SET wholesale_eligible = ? WHERE id = ?', [wholesaleEligible ? 1 : 0, req.params.id]);
    return res.json({ status: 'success', message: 'Wholesale eligibility updated.' });
  } finally {
    conn.release();
  }
});

// Coupons (admin)
router.get('/coupons', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [coupons] = await conn.query(
      `SELECT c.*, v.store_name FROM coupons c JOIN vendors v ON v.id = c.vendor_id ORDER BY c.created_at DESC`
    ) as any[];
    return res.json({ status: 'success', coupons });
  } finally {
    conn.release();
  }
});

router.patch('/coupons/:id/deactivate', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.query('UPDATE coupons SET is_active = false WHERE id = ?', [req.params.id]);
    return res.json({ status: 'success', message: 'Coupon deactivated.' });
  } finally {
    conn.release();
  }
});

router.patch('/coupons/:id/reactivate', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.query('UPDATE coupons SET is_active = true WHERE id = ?', [req.params.id]);
    return res.json({ status: 'success', message: 'Coupon reactivated.' });
  } finally {
    conn.release();
  }
});

// ============ PROMO CARDS ============
router.get('/promo-cards', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [cards] = await conn.query('SELECT * FROM promo_cards ORDER BY sort_order ASC, id ASC') as any[];
    return res.json({ status: 'success', cards });
  } finally {
    conn.release();
  }
});

router.post('/promo-cards', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { image_url, title, subtitle, link_url, sort_order } = req.body;
  if (!image_url || !title) {
    return res.status(400).json({ status: 'error', message: 'Image and title are required.', errors: [] });
  }
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(
      'INSERT INTO promo_cards (image_url, title, subtitle, link_url, sort_order) VALUES (?, ?, ?, ?, ?)',
      [image_url, title, subtitle || null, link_url || null, sort_order || 0]
    ) as any[];
    return res.json({ status: 'success', message: 'Promo card created.', id: result.insertId });
  } finally {
    conn.release();
  }
});

router.put('/promo-cards/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { image_url, title, subtitle, link_url, sort_order, is_active } = req.body;
  const conn = await pool.getConnection();
  try {
    const fields: string[] = [];
    const params: any[] = [];
    if (image_url !== undefined) { fields.push('image_url = ?'); params.push(image_url); }
    if (title !== undefined) { fields.push('title = ?'); params.push(title); }
    if (subtitle !== undefined) { fields.push('subtitle = ?'); params.push(subtitle); }
    if (link_url !== undefined) { fields.push('link_url = ?'); params.push(link_url); }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); params.push(sort_order); }
    if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active); }
    if (fields.length === 0) return res.status(400).json({ status: 'error', message: 'No fields to update.', errors: [] });
    params.push(req.params.id);
    await conn.query(`UPDATE promo_cards SET ${fields.join(', ')} WHERE id = ?`, params);
    return res.json({ status: 'success', message: 'Promo card updated.' });
  } finally {
    conn.release();
  }
});

router.delete('/promo-cards/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.query('DELETE FROM promo_cards WHERE id = ?', [req.params.id]);
    return res.json({ status: 'success', message: 'Promo card deleted.' });
  } finally {
    conn.release();
  }
});

// ============ NOTIFICATIONS ============

// GET /api/v1/admin/notifications/customers - Get all customer emails for notification
router.get('/notifications/customers', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [customers] = await conn.query(
      'SELECT id, email, first_name, last_name, phone FROM users WHERE role = "customer" ORDER BY created_at DESC'
    ) as any[];
    return res.json({ status: 'success', customers, total: customers.length });
  } finally {
    conn.release();
  }
});

// POST /api/v1/admin/notifications/send-email - Send email to all customers
router.post('/notifications/send-email', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { subject, message } = req.body;
  if (!subject || !message) {
    return res.status(400).json({ status: 'error', message: 'Subject and message are required.', errors: [] });
  }

  const conn = await pool.getConnection();
  try {
    const [customers] = await conn.query(
      'SELECT email, first_name FROM users WHERE role = "customer"'
    ) as any[];

    if (customers.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No customers found.', errors: [] });
    }

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    let sent = 0;
    let failed = 0;

    for (const customer of customers as any[]) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@marketplace.com',
          to: customer.email,
          subject: subject,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:20px;border-radius:12px;margin-bottom:20px;">
                <h1 style="color:white;margin:0;font-size:24px;">GoMarts</h1>
              </div>
              <p style="color:#374151;">Hi ${customer.first_name || 'there'},</p>
              <div style="background:#f9fafb;border-radius:8px;padding:20px;margin:16px 0;border:1px solid #e5e7eb;">
                ${message.replace(/\n/g, '<br/>')}
              </div>
              <p style="color:#6b7280;font-size:12px;margin-top:20px;">You're receiving this because you're a registered customer on GoMarts.</p>
            </div>
          `,
        });
        sent++;
      } catch {
        failed++;
      }
    }

    return res.json({ status: 'success', message: `Sent to ${sent} customers. ${failed > 0 ? `${failed} failed.` : ''}`, sent, failed });
  } finally {
    conn.release();
  }
});

export default router;
