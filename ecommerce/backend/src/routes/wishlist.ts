import { Router, Response } from 'express';
import pool from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/v1/wishlist - Get user's wishlist
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [items] = await conn.query(
      `SELECT w.id, w.product_id, w.created_at,
        p.name, p.price, p.stock_quantity, p.status,
        pi.image_url as primary_image,
        v.store_name,
        po.offer_price,
        CASE WHEN po.id IS NOT NULL THEN true ELSE false END as is_on_sale,
        COALESCE(rv.avg_rating, 0) as avg_rating
      FROM wishlist w
      JOIN products p ON p.id = w.product_id
      JOIN vendors v ON v.id = p.vendor_id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
      LEFT JOIN product_offers po ON po.product_id = p.id AND po.starts_at <= NOW() AND po.ends_at >= NOW()
      LEFT JOIN (SELECT product_id, AVG(rating) as avg_rating FROM product_reviews GROUP BY product_id) rv ON rv.product_id = p.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC`,
      [req.user!.userId]
    ) as any[];
    return res.json({ status: 'success', items });
  } finally {
    conn.release();
  }
});

// GET /api/v1/wishlist/ids - Get just product IDs (for quick check)
router.get('/ids', authenticate, async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT product_id FROM wishlist WHERE user_id = ?', [req.user!.userId]) as any[];
    const ids = (rows as any[]).map((r: any) => r.product_id);
    return res.json({ status: 'success', ids });
  } finally {
    conn.release();
  }
});

// POST /api/v1/wishlist - Add to wishlist
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ status: 'error', message: 'Product ID required', errors: [] });

  const conn = await pool.getConnection();
  try {
    await conn.query(
      'INSERT IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)',
      [req.user!.userId, productId]
    );
    return res.json({ status: 'success', message: 'Added to wishlist' });
  } finally {
    conn.release();
  }
});

// DELETE /api/v1/wishlist/:productId - Remove from wishlist
router.delete('/:productId', authenticate, async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.query('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', [req.user!.userId, req.params.productId]);
    return res.json({ status: 'success', message: 'Removed from wishlist' });
  } finally {
    conn.release();
  }
});

export default router;
