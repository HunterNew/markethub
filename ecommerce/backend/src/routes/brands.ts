import { Router, Response } from 'express';
import pool from '../db/pool';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Slug generation utility
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

// GET /api/v1/brands - List brands (public shows active only, admin sees all)
router.get('/', async (req: any, res) => {
  const { subcategoryId, showAll } = req.query;
  const conn = await pool.getConnection();
  try {
    let query: string;
    let params: any[] = [];
    const statusFilter = showAll === 'true' ? '' : "WHERE b.status = 'active'";
    const statusFilterAnd = showAll === 'true' ? '' : "AND b.status = 'active'";

    if (subcategoryId) {
      query = `SELECT b.*, COUNT(DISTINCT p.id) as product_count
        FROM brands b
        JOIN brand_categories bc ON bc.brand_id = b.id
        LEFT JOIN products p ON p.brand_id = b.id AND p.status = 'active'
        WHERE bc.category_id = ? ${showAll === 'true' ? '' : "AND b.status = 'active'"}
        GROUP BY b.id
        ORDER BY b.name`;
      params = [Number(subcategoryId)];
    } else {
      query = `SELECT b.*, COUNT(DISTINCT p.id) as product_count
        FROM brands b
        LEFT JOIN products p ON p.brand_id = b.id AND p.status = 'active'
        ${statusFilter}
        GROUP BY b.id
        ORDER BY b.name`;
    }

    const [brands] = await conn.query(query, params) as any[];
    return res.json({ status: 'success', brands });
  } finally {
    conn.release();
  }
});

// GET /api/v1/brands/requests - Admin list all brand requests
router.get('/requests', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [requests] = await conn.query(
      `SELECT br.*, v.store_name as vendor_name, c.name as category_name
       FROM brand_requests br
       JOIN vendors v ON v.id = br.vendor_id
       JOIN categories c ON c.id = br.category_id
       ORDER BY br.created_at DESC`
    ) as any[];
    return res.json({ status: 'success', requests });
  } finally {
    conn.release();
  }
});

// GET /api/v1/brands/my-requests - Vendor's own brand requests
router.get('/my-requests', authenticate, requireRole('vendor'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [vendors] = await conn.query('SELECT id FROM vendors WHERE user_id = ?', [req.user!.userId]) as any[];
    if (vendors.length === 0) return res.status(403).json({ status: 'error', message: 'Vendor not found', errors: [] });

    const [requests] = await conn.query(
      `SELECT br.*, c.name as category_name
       FROM brand_requests br
       JOIN categories c ON c.id = br.category_id
       WHERE br.vendor_id = ?
       ORDER BY br.created_at DESC`,
      [vendors[0].id]
    ) as any[];
    return res.json({ status: 'success', requests });
  } finally {
    conn.release();
  }
});

// GET /api/v1/brands/:id - Get single brand detail
router.get('/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [brands] = await conn.query(
      'SELECT * FROM brands WHERE id = ?',
      [req.params.id]
    ) as any[];
    if ((brands as any[]).length === 0) {
      return res.status(404).json({ status: 'error', message: 'Brand not found', errors: [] });
    }
    const brand = (brands as any[])[0];

    const [categories] = await conn.query(
      `SELECT c.id, c.name FROM brand_categories bc JOIN categories c ON c.id = bc.category_id WHERE bc.brand_id = ?`,
      [brand.id]
    ) as any[];

    return res.json({ status: 'success', brand: { ...brand, categories } });
  } finally {
    conn.release();
  }
});

// POST /api/v1/brands - Admin create brand
router.post('/', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { name, logoUrl, subcategoryIds } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ status: 'error', message: 'Brand name is required', errors: [] });
  }

  const slug = generateSlug(name);
  const conn = await pool.getConnection();
  try {
    // Check duplicate name
    const [existing] = await conn.query('SELECT id FROM brands WHERE LOWER(name) = LOWER(?)', [name.trim()]) as any[];
    if ((existing as any[]).length > 0) {
      return res.status(409).json({ status: 'error', message: 'A brand with this name already exists', errors: [] });
    }

    const [result] = await conn.query(
      'INSERT INTO brands (name, slug, logo_url, status) VALUES (?, ?, ?, "active")',
      [name.trim(), slug, logoUrl || null]
    ) as any[];
    const brandId = result.insertId;

    // Insert brand_categories associations
    if (subcategoryIds && Array.isArray(subcategoryIds) && subcategoryIds.length > 0) {
      for (const catId of subcategoryIds) {
        await conn.query('INSERT INTO brand_categories (brand_id, category_id) VALUES (?, ?)', [brandId, catId]);
      }
    }

    return res.status(201).json({ status: 'success', message: 'Brand created.', brandId });
  } finally {
    conn.release();
  }
});

// PUT /api/v1/brands/requests/:id - Admin approve/reject brand request
router.put('/requests/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { status, adminNote } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ status: 'error', message: 'Status must be approved or rejected', errors: [] });
  }

  const conn = await pool.getConnection();
  try {
    const [requests] = await conn.query('SELECT * FROM brand_requests WHERE id = ?', [req.params.id]) as any[];
    if ((requests as any[]).length === 0) {
      return res.status(404).json({ status: 'error', message: 'Brand request not found', errors: [] });
    }
    const request = (requests as any[])[0];
    if (request.status !== 'pending') {
      return res.status(400).json({ status: 'error', message: 'Brand request has already been processed', errors: [] });
    }

    if (status === 'approved') {
      // Create the brand
      const slug = generateSlug(request.brand_name);
      const [result] = await conn.query(
        'INSERT INTO brands (name, slug, status) VALUES (?, ?, "active")',
        [request.brand_name, slug]
      ) as any[];
      const brandId = result.insertId;

      // Associate with the requested category
      await conn.query('INSERT INTO brand_categories (brand_id, category_id) VALUES (?, ?)', [brandId, request.category_id]);

      // Update request status
      await conn.query('UPDATE brand_requests SET status = "approved", admin_note = ?, updated_at = NOW() WHERE id = ?', [adminNote || null, req.params.id]);
    } else {
      // Reject
      await conn.query('UPDATE brand_requests SET status = "rejected", admin_note = ?, updated_at = NOW() WHERE id = ?', [adminNote || null, req.params.id]);
    }

    return res.json({ status: 'success', message: `Brand request ${status}.` });
  } finally {
    conn.release();
  }
});

// PUT /api/v1/brands/:id - Admin update brand
router.put('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { name, logoUrl, subcategoryIds } = req.body;
  const conn = await pool.getConnection();
  try {
    const [brands] = await conn.query('SELECT * FROM brands WHERE id = ?', [req.params.id]) as any[];
    if ((brands as any[]).length === 0) {
      return res.status(404).json({ status: 'error', message: 'Brand not found', errors: [] });
    }

    const slug = name ? generateSlug(name) : (brands as any[])[0].slug;
    await conn.query(
      'UPDATE brands SET name = ?, slug = ?, logo_url = ?, updated_at = NOW() WHERE id = ?',
      [name || (brands as any[])[0].name, slug, logoUrl !== undefined ? logoUrl : (brands as any[])[0].logo_url, req.params.id]
    );

    // Replace brand_categories
    if (subcategoryIds && Array.isArray(subcategoryIds)) {
      await conn.query('DELETE FROM brand_categories WHERE brand_id = ?', [req.params.id]);
      for (const catId of subcategoryIds) {
        await conn.query('INSERT INTO brand_categories (brand_id, category_id) VALUES (?, ?)', [req.params.id, catId]);
      }
    }

    return res.json({ status: 'success', message: 'Brand updated.' });
  } finally {
    conn.release();
  }
});

// DELETE /api/v1/brands/:id - Admin delete brand
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [brands] = await conn.query('SELECT id FROM brands WHERE id = ?', [req.params.id]) as any[];
    if ((brands as any[]).length === 0) {
      return res.status(404).json({ status: 'error', message: 'Brand not found', errors: [] });
    }

    // Delete brand - CASCADE removes brand_categories, ON DELETE SET NULL nullifies products.brand_id
    await conn.query('DELETE FROM brands WHERE id = ?', [req.params.id]);
    return res.json({ status: 'success', message: 'Brand deleted.' });
  } finally {
    conn.release();
  }
});

// POST /api/v1/brands/request - Vendor submit brand request
router.post('/request', authenticate, requireRole('vendor'), async (req: AuthRequest, res: Response) => {
  const { brandName, categoryId } = req.body;
  if (!brandName || !categoryId) {
    return res.status(400).json({ status: 'error', message: 'Brand name and subcategory are required', errors: [] });
  }

  const conn = await pool.getConnection();
  try {
    const [vendors] = await conn.query('SELECT id FROM vendors WHERE user_id = ?', [req.user!.userId]) as any[];
    if (vendors.length === 0) return res.status(403).json({ status: 'error', message: 'Vendor not found', errors: [] });

    // Check if brand already exists
    const [existing] = await conn.query('SELECT id FROM brands WHERE LOWER(name) = LOWER(?)', [brandName.trim()]) as any[];
    if ((existing as any[]).length > 0) {
      return res.status(409).json({ status: 'error', message: 'A brand with this name already exists', errors: [] });
    }

    await conn.query(
      'INSERT INTO brand_requests (vendor_id, brand_name, category_id, status) VALUES (?, ?, ?, "pending")',
      [vendors[0].id, brandName.trim(), categoryId]
    );

    return res.status(201).json({ status: 'success', message: 'Brand request submitted.' });
  } finally {
    conn.release();
  }
});

// PATCH /api/v1/brands/:id/toggle - Admin enable/disable brand
router.patch('/:id/toggle', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT status FROM brands WHERE id = ?', [req.params.id]) as any[];
    if ((rows as any[]).length === 0) return res.status(404).json({ status: 'error', message: 'Brand not found', errors: [] });
    const current = (rows as any[])[0].status;
    const newStatus = current === 'disabled' ? 'active' : 'disabled';
    await conn.query('UPDATE brands SET status = ? WHERE id = ?', [newStatus, req.params.id]);
    return res.json({ status: 'success', message: `Brand ${newStatus === 'disabled' ? 'disabled' : 'enabled'}.`, newStatus });
  } finally { conn.release(); }
});

export default router;
