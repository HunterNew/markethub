import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/pool';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// POST /api/v1/upload - Single image upload
router.post('/', authenticate, upload.single('image'), (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'No file uploaded', errors: [] });
  }
  const url = `/uploads/${req.file.filename}`;
  return res.json({ status: 'success', url });
});

// POST /api/v1/upload/multiple - Multiple image upload (max 5)
router.post('/multiple', authenticate, upload.array('images', 5), (req: AuthRequest, res: Response) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ status: 'error', message: 'No files uploaded', errors: [] });
  }
  const urls = files.map(f => `/uploads/${f.filename}`);
  return res.json({ status: 'success', urls });
});

// POST /api/v1/upload/vendor-images - Upload images to vendor's folder (keeps original filename)
const vendorStorage = multer.diskStorage({
  destination: async (req: any, _file, cb) => {
    try {
      const conn = await pool.getConnection();
      try {
        const [vendors] = await conn.query('SELECT store_slug FROM vendors WHERE user_id = ?', [req.user?.userId]) as any[];
        if (vendors.length === 0) return cb(new Error('Vendor not found'), '');
        const vendorFolder = path.join(__dirname, '../../uploads/vendors', vendors[0].store_slug);
        if (!fs.existsSync(vendorFolder)) fs.mkdirSync(vendorFolder, { recursive: true });
        cb(null, vendorFolder);
      } finally { conn.release(); }
    } catch (err: any) { cb(err, ''); }
  },
  filename: (_req, file, cb) => {
    // Keep original filename but sanitize it
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, sanitized);
  },
});

const vendorUpload = multer({
  storage: vendorStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

router.post('/vendor-images', authenticate, requireRole('vendor'), vendorUpload.single('image'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'No file uploaded', errors: [] });
  }
  const conn = await pool.getConnection();
  try {
    const [vendors] = await conn.query('SELECT store_slug FROM vendors WHERE user_id = ?', [req.user!.userId]) as any[];
    const slug = vendors[0]?.store_slug || '';
    const filename = req.file.filename;
    const url = `/uploads/vendors/${slug}/${filename}`;
    return res.json({ status: 'success', url, filename });
  } finally { conn.release(); }
});

export default router;
