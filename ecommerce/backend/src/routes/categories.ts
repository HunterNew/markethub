import { Router, Response } from 'express';
import pool from '../db/pool';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/v1/categories
router.get('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [categories] = await conn.query(
      `SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.status = 'active'
      GROUP BY c.id
      ORDER BY c.name`
    ) as any[];
    return res.json({ status: 'success', categories });
  } finally {
    conn.release();
  }
});

router.post('/', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { name, description, imageUrl, parentId } = req.body;
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const conn = await pool.getConnection();
  try {
    await conn.query('INSERT INTO categories (name, slug, description, image_url, parent_id) VALUES (?, ?, ?, ?, ?)', [name, slug, description || '', imageUrl || null, parentId || null]);
    return res.status(201).json({ status: 'success', message: 'Category created.' });
  } finally {
    conn.release();
  }
});

router.put('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { name, description, imageUrl } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.query('UPDATE categories SET name=?, description=?, image_url=? WHERE id=?', [name, description, imageUrl, req.params.id]);
    return res.json({ status: 'success', message: 'Category updated.' });
  } finally {
    conn.release();
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    return res.json({ status: 'success', message: 'Category deleted.' });
  } finally {
    conn.release();
  }
});

// Category-to-variant-suggestion mapping
const CATEGORY_VARIANT_SUGGESTIONS: Record<string, { name: string; values: string[] }[]> = {
  clothing: [{ name: 'Size', values: ['S', 'M', 'L', 'XL', 'XXL'] }],
  food: [{ name: 'Weight', values: ['0.5kg', '1kg', '2kg'] }],
  grocery: [{ name: 'Weight', values: ['0.5kg', '1kg', '2kg'] }],
  electronics: [
    { name: 'Storage', values: ['64GB', '128GB', '256GB'] },
    { name: 'RAM', values: ['4GB', '8GB', '16GB'] },
  ],
};

function matchCategorySuggestions(name: string): { name: string; values: string[] }[] {
  const lower = name.toLowerCase();
  for (const [key, suggestions] of Object.entries(CATEGORY_VARIANT_SUGGESTIONS)) {
    if (lower.includes(key)) {
      return suggestions;
    }
  }
  return [];
}

// GET /api/v1/categories/:id/variant-suggestions
router.get('/:id/variant-suggestions', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT id, name, slug FROM categories WHERE id = ?', [req.params.id]) as any[];
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ status: 'error', message: 'Category not found', errors: [] });
    }
    const category = (rows as any[])[0];
    const suggestions = matchCategorySuggestions(category.name) || matchCategorySuggestions(category.slug) || [];
    return res.json({ status: 'success', suggestions });
  } finally {
    conn.release();
  }
});

export { router as categoryRouter };

// Search routes
const searchRouter = Router();

searchRouter.get('/suggestions', async (req, res) => {
  const { q } = req.query;
  if (!q || String(q).length < 2) {
    return res.json({ status: 'success', suggestions: [] });
  }
  const conn = await pool.getConnection();
  try {
    const [suggestions] = await conn.query(
      `SELECT p.id as productId, p.name, ANY_VALUE(c.name) as categoryName
      FROM products p JOIN categories c ON c.id = p.category_id
      WHERE p.name LIKE ? AND p.status = 'active'
      GROUP BY p.id LIMIT 8`,
      [`%${q}%`]
    ) as any[];
    return res.json({ status: 'success', suggestions });
  } finally {
    conn.release();
  }
});

searchRouter.get('/history', authenticate, async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [history] = await conn.query(
      'SELECT term FROM search_history WHERE user_id = ? ORDER BY searched_at DESC LIMIT 5',
      [req.user!.userId]
    ) as any[];
    return res.json({ status: 'success', history: (history as any[]).map((h: any) => h.term) });
  } finally {
    conn.release();
  }
});

searchRouter.post('/history', authenticate, async (req: AuthRequest, res: Response) => {
  const { term } = req.body;
  if (!term) return res.status(400).json({ status: 'error', message: 'Term required', errors: [] });
  const conn = await pool.getConnection();
  try {
    await conn.query(
      'INSERT INTO search_history (user_id, term, searched_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE searched_at = NOW()',
      [req.user!.userId, term]
    );
    // Enforce 10-term limit
    await conn.query(
      `DELETE FROM search_history WHERE user_id = ? AND id NOT IN (SELECT id FROM (SELECT id FROM search_history WHERE user_id = ? ORDER BY searched_at DESC LIMIT 10) t)`,
      [req.user!.userId, req.user!.userId]
    );
    return res.json({ status: 'success' });
  } finally {
    conn.release();
  }
});

searchRouter.delete('/history/:term', authenticate, async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.query('DELETE FROM search_history WHERE user_id = ? AND term = ?', [req.user!.userId, decodeURIComponent(req.params.term)]);
    return res.json({ status: 'success' });
  } finally {
    conn.release();
  }
});

searchRouter.delete('/history', authenticate, async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.query('DELETE FROM search_history WHERE user_id = ?', [req.user!.userId]);
    return res.json({ status: 'success' });
  } finally {
    conn.release();
  }
});

export { searchRouter };
