import { Router, Response } from 'express';
import pool from '../db/pool';
import { authenticate, optionalAuth, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/v1/reviews/product/:productId - Public: get reviews for a product
router.get('/product/:productId', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [reviews] = await conn.query(
      `SELECT r.*, u.first_name, u.last_name
      FROM product_reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC`,
      [req.params.productId]
    ) as any[];

    const [stats] = await conn.query(
      `SELECT COUNT(*) as total_reviews, COALESCE(AVG(rating), 0) as avg_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as stars_5,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as stars_4,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as stars_3,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as stars_2,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as stars_1
      FROM product_reviews WHERE product_id = ?`,
      [req.params.productId]
    ) as any[];

    return res.json({
      status: 'success',
      reviews,
      stats: {
        totalReviews: Number(stats[0].total_reviews),
        avgRating: Math.round(Number(stats[0].avg_rating) * 10) / 10,
        distribution: {
          5: Number(stats[0].stars_5) || 0,
          4: Number(stats[0].stars_4) || 0,
          3: Number(stats[0].stars_3) || 0,
          2: Number(stats[0].stars_2) || 0,
          1: Number(stats[0].stars_1) || 0,
        },
      },
    });
  } finally {
    conn.release();
  }
});

// POST /api/v1/reviews - Customer: submit a review
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { productId, orderId, rating, title, comment } = req.body;

  if (!productId || !orderId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ status: 'error', message: 'Product, order, and rating (1-5) are required.', errors: [] });
  }

  const conn = await pool.getConnection();
  try {
    // Verify the user purchased this product in this order
    const [orderItems] = await conn.query(
      `SELECT oi.id FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.order_id = ? AND oi.product_id = ? AND o.user_id = ? AND o.status NOT IN ('cancelled')`,
      [orderId, productId, req.user!.userId]
    ) as any[];

    if (orderItems.length === 0) {
      return res.status(403).json({ status: 'error', message: 'You can only review products you have purchased.', errors: [] });
    }

    // Check if already reviewed
    const [existing] = await conn.query(
      'SELECT id FROM product_reviews WHERE user_id = ? AND product_id = ? AND order_id = ?',
      [req.user!.userId, productId, orderId]
    ) as any[];

    if (existing.length > 0) {
      // Update existing review
      await conn.query(
        'UPDATE product_reviews SET rating = ?, title = ?, comment = ?, updated_at = NOW() WHERE id = ?',
        [rating, title || null, comment || null, existing[0].id]
      );
      return res.json({ status: 'success', message: 'Review updated.' });
    }

    await conn.query(
      'INSERT INTO product_reviews (product_id, user_id, order_id, rating, title, comment) VALUES (?, ?, ?, ?, ?, ?)',
      [productId, req.user!.userId, orderId, rating, title || null, comment || null]
    );

    return res.status(201).json({ status: 'success', message: 'Review submitted.' });
  } finally {
    conn.release();
  }
});

// GET /api/v1/reviews/my - Customer: get products they can review
router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [reviewable] = await conn.query(
      `SELECT oi.product_id, oi.product_name, oi.order_id, o.created_at as order_date,
        pi.image_url as product_image,
        r.id as review_id, r.rating, r.title, r.comment
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id AND o.user_id = ?
      LEFT JOIN product_images pi ON pi.product_id = oi.product_id AND pi.is_primary = true
      LEFT JOIN product_reviews r ON r.product_id = oi.product_id AND r.user_id = ? AND r.order_id = oi.order_id
      WHERE o.status IN ('delivered', 'confirmed', 'shipped')
      ORDER BY o.created_at DESC`,
      [req.user!.userId, req.user!.userId]
    ) as any[];

    return res.json({ status: 'success', items: reviewable });
  } finally {
    conn.release();
  }
});

// DELETE /api/v1/reviews/:id - Customer: delete own review
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.query('DELETE FROM product_reviews WHERE id = ? AND user_id = ?', [req.params.id, req.user!.userId]);
    return res.json({ status: 'success', message: 'Review deleted.' });
  } finally {
    conn.release();
  }
});

// GET /api/v1/reviews/vendor - Vendor: see all reviews for their products
router.get('/vendor', authenticate, requireRole('vendor'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [vendors] = await conn.query('SELECT id FROM vendors WHERE user_id = ?', [req.user!.userId]) as any[];
    if (vendors.length === 0) return res.status(403).json({ status: 'error', message: 'Vendor not found', errors: [] });

    const [reviews] = await conn.query(
      `SELECT r.*, u.first_name, u.last_name, p.name as product_name, pi.image_url as product_image
       FROM product_reviews r
       JOIN users u ON u.id = r.user_id
       JOIN products p ON p.id = r.product_id AND p.vendor_id = ?
       LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
       ORDER BY r.created_at DESC`,
      [vendors[0].id]
    ) as any[];

    // Stats
    const [stats] = await conn.query(
      `SELECT COUNT(*) as total, COALESCE(AVG(r.rating), 0) as avg_rating
       FROM product_reviews r
       JOIN products p ON p.id = r.product_id AND p.vendor_id = ?`,
      [vendors[0].id]
    ) as any[];

    return res.json({
      status: 'success',
      reviews,
      stats: { total: Number(stats[0].total), avgRating: Math.round(Number(stats[0].avg_rating) * 10) / 10 }
    });
  } finally {
    conn.release();
  }
});

// GET /api/v1/reviews/admin - Admin: see all reviews
router.get('/admin', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [reviews] = await conn.query(
      `SELECT r.*, u.first_name, u.last_name, u.email as customer_email,
        p.name as product_name, v.store_name as vendor_name, pi.image_url as product_image
       FROM product_reviews r
       JOIN users u ON u.id = r.user_id
       JOIN products p ON p.id = r.product_id
       JOIN vendors v ON v.id = p.vendor_id
       LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
       ORDER BY r.created_at DESC`
    ) as any[];

    const [stats] = await conn.query(
      `SELECT COUNT(*) as total, COALESCE(AVG(rating), 0) as avg_rating FROM product_reviews`
    ) as any[];

    return res.json({
      status: 'success',
      reviews,
      stats: { total: Number(stats[0].total), avgRating: Math.round(Number(stats[0].avg_rating) * 10) / 10 }
    });
  } finally {
    conn.release();
  }
});

// DELETE /api/v1/reviews/admin/:id - Admin: delete any review
router.delete('/admin/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.query('DELETE FROM product_reviews WHERE id = ?', [req.params.id]);
    return res.json({ status: 'success', message: 'Review deleted.' });
  } finally {
    conn.release();
  }
});

export default router;
