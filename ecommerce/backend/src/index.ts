import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import cartRoutes from './routes/cart';
import orderRoutes from './routes/orders';
import adminRoutes from './routes/admin';
import vendorRoutes from './routes/vendor';
import uploadRoutes from './routes/upload';
import reviewRoutes from './routes/reviews';
import { categoryRouter, searchRouter } from './routes/categories';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 10000 : 100,
  message: { status: 'error', message: 'Too many requests. Please try again later.', errors: [] },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/vendor', vendorRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/categories', categoryRouter);
app.use('/api/v1/search', searchRouter);

// Vendor public store
app.get('/api/v1/vendors/:slug', async (req, res) => {
  const { default: pool } = await import('./db/pool');
  const conn = await pool.getConnection();
  try {
    const [vendors] = await conn.query(
      'SELECT v.*, u.email FROM vendors v JOIN users u ON u.id = v.user_id WHERE v.store_slug = ? AND v.status = "approved"',
      [req.params.slug]
    ) as any[];
    if ((vendors as any[]).length === 0) return res.status(404).json({ status: 'error', message: 'Vendor not found', errors: [] });
    return res.json({ status: 'success', vendor: (vendors as any[])[0] });
  } finally {
    conn.release();
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ status: 'error', message: 'Resource already exists.', errors: [] });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ status: 'error', message: 'Invalid token.', errors: [] });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ status: 'error', message: 'Token expired.', errors: [] });
  }

  return res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error.',
    errors: [],
  });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📖 API base: http://localhost:${PORT}/api/v1/`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

export default app;
