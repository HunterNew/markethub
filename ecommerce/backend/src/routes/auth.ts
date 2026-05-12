import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import pool from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, role, firstName, lastName, storeName, description, contactEmail, contactPhone } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({
      status: 'error',
      message: 'Email, password, and role are required.',
      errors: [
        { field: 'email', message: !email ? 'Email is required' : '' },
        { field: 'password', message: !password ? 'Password is required' : '' },
        { field: 'role', message: !role ? 'Role is required' : '' },
      ].filter(e => e.message),
    });
  }

  if (!['customer', 'vendor'].includes(role)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid role. Must be customer or vendor.',
      errors: [{ field: 'role', message: 'Must be customer or vendor' }],
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      status: 'error',
      message: 'Password must be at least 6 characters.',
      errors: [{ field: 'password', message: 'Minimum 6 characters' }],
    });
  }

  const conn = await pool.getConnection();
  try {
    // Check duplicate email
    const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [email]) as any[];
    if (existing.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Email already registered.',
        errors: [{ field: 'email', message: 'Email already registered' }],
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await conn.query(
      'INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
      [email.toLowerCase(), passwordHash, role, firstName || '', lastName || '']
    ) as any[];

    const userId = result.insertId;

    // If vendor, create vendor record
    if (role === 'vendor') {
      if (!storeName) {
        return res.status(400).json({
          status: 'error',
          message: 'Store name is required for vendor registration.',
          errors: [{ field: 'storeName', message: 'Required for vendor' }],
        });
      }
      const slug = storeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + userId;
      await conn.query(
        'INSERT INTO vendors (user_id, store_name, store_slug, description, contact_email, contact_phone) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, storeName, slug, description || '', contactEmail || email, contactPhone || '']
      );

      // Create vendor image folder for CSV imports
      const vendorFolder = path.join(__dirname, '../../uploads/vendors', slug);
      if (!fs.existsSync(vendorFolder)) {
        fs.mkdirSync(vendorFolder, { recursive: true });
      }
    }

    const token = jwt.sign(
      { userId, role, email: email.toLowerCase() },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      status: 'success',
      message: 'Account created successfully.',
      token,
      user: { id: userId, email: email.toLowerCase(), role, firstName, lastName },
    });
  } finally {
    conn.release();
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Email and password are required.',
      errors: [],
    });
  }

  const conn = await pool.getConnection();
  try {
    const [users] = await conn.query(
      'SELECT id, email, password_hash, role, first_name, last_name, wholesale_eligible FROM users WHERE email = ?',
      [email.toLowerCase()]
    ) as any[];

    if (users.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
        errors: [],
      });
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
        errors: [],
      });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    // Get vendor info if vendor
    let vendorInfo = null;
    if (user.role === 'vendor') {
      const [vendors] = await conn.query(
        'SELECT id, store_name, store_slug, status FROM vendors WHERE user_id = ?',
        [user.id]
      ) as any[];
      if (vendors.length > 0) vendorInfo = vendors[0];
    }

    return res.json({
      status: 'success',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        wholesaleEligible: user.wholesale_eligible,
        vendor: vendorInfo,
      },
    });
  } finally {
    conn.release();
  }
});

// GET /api/v1/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [users] = await conn.query(
      'SELECT id, email, role, first_name, last_name, wholesale_eligible, phone, created_at FROM users WHERE id = ?',
      [req.user!.userId]
    ) as any[];

    if (users.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found', errors: [] });
    }

    const user = users[0];
    let vendorInfo = null;
    if (user.role === 'vendor') {
      const [vendors] = await conn.query(
        'SELECT id, store_name, store_slug, status, commission_rate, description, contact_email, logo_url FROM vendors WHERE user_id = ?',
        [user.id]
      ) as any[];
      if (vendors.length > 0) vendorInfo = vendors[0];
    }

    return res.json({
      status: 'success',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        wholesaleEligible: user.wholesale_eligible,
        createdAt: user.created_at,
        vendor: vendorInfo,
      },
    });
  } finally {
    conn.release();
  }
});

// PUT /api/v1/auth/me - Update profile
router.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const { firstName, lastName, phone } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.query(
      'UPDATE users SET first_name = ?, last_name = ?, phone = ? WHERE id = ?',
      [firstName || '', lastName || '', phone || null, req.user!.userId]
    );
    return res.json({ status: 'success', message: 'Profile updated.' });
  } finally {
    conn.release();
  }
});

// GET /api/v1/auth/addresses
router.get('/addresses', authenticate, async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const [addresses] = await conn.query(
      'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
      [req.user!.userId]
    ) as any[];
    return res.json({ status: 'success', addresses });
  } finally {
    conn.release();
  }
});

// POST /api/v1/auth/addresses
router.post('/addresses', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, phone, address, city, state, pincode, landmark, isDefault } = req.body;
  if (!name || !phone || !address || !city || !state || !pincode) {
    return res.status(400).json({ status: 'error', message: 'All required fields must be filled.', errors: [] });
  }
  const conn = await pool.getConnection();
  try {
    if (isDefault) {
      await conn.query('UPDATE addresses SET is_default = false WHERE user_id = ?', [req.user!.userId]);
    }
    const [result] = await conn.query(
      'INSERT INTO addresses (user_id, name, phone, address, city, state, pincode, landmark, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user!.userId, name, phone, address, city, state, pincode, landmark || null, isDefault ? true : false]
    ) as any[];
    return res.status(201).json({ status: 'success', message: 'Address added.', addressId: result.insertId });
  } finally {
    conn.release();
  }
});

// PUT /api/v1/auth/addresses/:id
router.put('/addresses/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, phone, address, city, state, pincode, landmark, isDefault } = req.body;
  const conn = await pool.getConnection();
  try {
    if (isDefault) {
      await conn.query('UPDATE addresses SET is_default = false WHERE user_id = ?', [req.user!.userId]);
    }
    await conn.query(
      'UPDATE addresses SET name=?, phone=?, address=?, city=?, state=?, pincode=?, landmark=?, is_default=? WHERE id=? AND user_id=?',
      [name, phone, address, city, state, pincode, landmark || null, isDefault ? true : false, req.params.id, req.user!.userId]
    );
    return res.json({ status: 'success', message: 'Address updated.' });
  } finally {
    conn.release();
  }
});

// DELETE /api/v1/auth/addresses/:id
router.delete('/addresses/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.query('DELETE FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user!.userId]);
    return res.json({ status: 'success', message: 'Address deleted.' });
  } finally {
    conn.release();
  }
});

export default router;
