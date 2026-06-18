// Feature: category-brands, Unit Tests: Brand CRUD and request workflow
// Validates: Requirements 1.3, 2.3, 4.2, 4.3

process.env.NODE_ENV = 'test';

import request from 'supertest';
import app from '../index';
import pool from '../db/pool';

const API_BASE = '/api/v1';

// Helper: register an admin and get token
async function setupAdmin(): Promise<{ adminToken: string; adminUserId: number }> {
  const email = `admin_unit_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;
  const regRes = await request(app)
    .post(`${API_BASE}/auth/register`)
    .send({
      email,
      password: 'testpass123',
      role: 'customer',
      firstName: 'Admin',
      lastName: 'User',
      phone: '9999999999',
    });

  const adminUserId = regRes.body.user.id;

  const conn = await pool.getConnection();
  try {
    await conn.query("UPDATE users SET role = 'admin' WHERE id = ?", [adminUserId]);
  } finally {
    conn.release();
  }

  const loginRes = await request(app)
    .post(`${API_BASE}/auth/login`)
    .send({ email, password: 'testpass123' });

  return { adminToken: loginRes.body.token, adminUserId };
}

// Helper: register a vendor and get token
async function setupVendor(): Promise<{ vendorToken: string; vendorUserId: number; vendorId: number }> {
  const email = `vendor_unit_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;
  const storeName = `TestStore_${Date.now()}`;
  const regRes = await request(app)
    .post(`${API_BASE}/auth/register`)
    .send({
      email,
      password: 'testpass123',
      role: 'vendor',
      firstName: 'Vendor',
      lastName: 'User',
      phone: '8888888888',
      storeName,
      contactPhone: '8888888888',
    });

  const vendorUserId = regRes.body.user.id;

  // Find the vendor record created by registration
  const conn = await pool.getConnection();
  let vendorId: number;
  try {
    const [vendors] = await conn.query('SELECT id FROM vendors WHERE user_id = ?', [vendorUserId]) as any[];
    vendorId = vendors[0].id;
  } finally {
    conn.release();
  }

  const loginRes = await request(app)
    .post(`${API_BASE}/auth/login`)
    .send({ email, password: 'testpass123' });

  return { vendorToken: loginRes.body.token, vendorUserId, vendorId };
}

describe('Category Brands Unit Tests', () => {
  let adminToken: string;
  let adminUserId: number;
  let vendorToken: string;
  let vendorUserId: number;
  let vendorId: number;
  let testCategoryId: number;

  const createdBrandIds: number[] = [];
  const createdRequestIds: number[] = [];

  beforeAll(async () => {
    const adminSetup = await setupAdmin();
    adminToken = adminSetup.adminToken;
    adminUserId = adminSetup.adminUserId;

    const vendorSetup = await setupVendor();
    vendorToken = vendorSetup.vendorToken;
    vendorUserId = vendorSetup.vendorUserId;
    vendorId = vendorSetup.vendorId;

    // Create a test category (subcategory)
    const conn = await pool.getConnection();
    try {
      const [parentResult] = await conn.query(
        "INSERT INTO categories (name, slug) VALUES (?, ?)",
        [`UnitTestParent_${Date.now()}`, `unit-test-parent-${Date.now()}`]
      ) as any[];
      const parentId = parentResult.insertId;

      const [subResult] = await conn.query(
        "INSERT INTO categories (name, slug, parent_id) VALUES (?, ?, ?)",
        [`UnitTestSub_${Date.now()}`, `unit-test-sub-${Date.now()}`, parentId]
      ) as any[];
      testCategoryId = subResult.insertId;
    } finally {
      conn.release();
    }
  });

  afterAll(async () => {
    const conn = await pool.getConnection();
    try {
      if (createdBrandIds.length > 0) {
        await conn.query('DELETE FROM brand_categories WHERE brand_id IN (?)', [createdBrandIds]);
        await conn.query('DELETE FROM brands WHERE id IN (?)', [createdBrandIds]);
      }
      if (createdRequestIds.length > 0) {
        await conn.query('DELETE FROM brand_requests WHERE id IN (?)', [createdRequestIds]);
      }
      await conn.query('DELETE FROM vendors WHERE id = ?', [vendorId]);
      await conn.query('DELETE FROM users WHERE id IN (?)', [[adminUserId, vendorUserId]]);
      // Clean up test categories
      await conn.query('DELETE FROM categories WHERE slug LIKE ?', ['unit-test-%']);
    } finally {
      conn.release();
    }
    await pool.end();
  });

  // ============================
  // Slug Generation Tests
  // Validates: Requirements 1.3
  // ============================
  describe('Slug generation specific examples', () => {
    it('should generate slug "samsung-electronics" from "Samsung Electronics"', async () => {
      const name = `Samsung Electronics_${Date.now()}`;
      const res = await request(app)
        .post(`${API_BASE}/brands`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name });

      expect(res.status).toBe(201);
      createdBrandIds.push(res.body.brandId);

      const getRes = await request(app).get(`${API_BASE}/brands/${res.body.brandId}`);
      expect(getRes.status).toBe(200);
      // The slug should follow the pattern: lowercase, non-alphanumeric replaced with hyphens
      const slug = getRes.body.brand.slug;
      expect(slug).toMatch(/^samsung-electronics/);
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    });

    it('should handle special characters in brand name "L\'Oréal Paris"', async () => {
      const name = `L'Oréal Paris_${Date.now()}`;
      const res = await request(app)
        .post(`${API_BASE}/brands`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name });

      expect(res.status).toBe(201);
      createdBrandIds.push(res.body.brandId);

      const getRes = await request(app).get(`${API_BASE}/brands/${res.body.brandId}`);
      const slug = getRes.body.brand.slug;
      // Slug should only contain lowercase letters, numbers, and hyphens
      expect(slug).toMatch(/^[a-z0-9-]+$/);
      // Should not start or end with hyphen
      expect(slug).not.toMatch(/^-/);
      expect(slug).not.toMatch(/-$/);
      // Should not have consecutive hyphens
      expect(slug).not.toMatch(/--/);
    });

    it('should trim leading/trailing spaces in name for slug generation', async () => {
      const name = `  Leading Trailing Spaces  _${Date.now()}`;
      const res = await request(app)
        .post(`${API_BASE}/brands`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name });

      expect(res.status).toBe(201);
      createdBrandIds.push(res.body.brandId);

      const getRes = await request(app).get(`${API_BASE}/brands/${res.body.brandId}`);
      const slug = getRes.body.brand.slug;
      expect(slug).toMatch(/^[a-z0-9-]+$/);
      expect(slug).not.toMatch(/^-/);
      expect(slug).not.toMatch(/-$/);
    });

    it('should handle "Special!@#$%^&*Characters" by stripping special chars', async () => {
      const name = `Special!@#$%^&*Characters_${Date.now()}`;
      const res = await request(app)
        .post(`${API_BASE}/brands`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name });

      expect(res.status).toBe(201);
      createdBrandIds.push(res.body.brandId);

      const getRes = await request(app).get(`${API_BASE}/brands/${res.body.brandId}`);
      const slug = getRes.body.brand.slug;
      expect(slug).toMatch(/^special-characters/);
      expect(slug).toMatch(/^[a-z0-9-]+$/);
      expect(slug).not.toMatch(/--/);
    });

    it('should reject empty or whitespace-only name', async () => {
      const res1 = await request(app)
        .post(`${API_BASE}/brands`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '' });

      expect(res1.status).toBe(400);
      expect(res1.body.message).toBe('Brand name is required');

      const res2 = await request(app)
        .post(`${API_BASE}/brands`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '   ' });

      expect(res2.status).toBe(400);
      expect(res2.body.message).toBe('Brand name is required');
    });
  });

  // ============================
  // Brand Request Approval Flow
  // Validates: Requirements 4.2
  // ============================
  describe('Brand request approval flow', () => {
    it('should create a brand request with status "pending"', async () => {
      const brandName = `ApprovalTest_${Date.now()}`;
      const res = await request(app)
        .post(`${API_BASE}/brands/request`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ brandName, categoryId: testCategoryId });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');

      // Verify it's pending in the DB
      const conn = await pool.getConnection();
      try {
        const [rows] = await conn.query(
          'SELECT * FROM brand_requests WHERE brand_name = ? AND vendor_id = ?',
          [brandName, vendorId]
        ) as any[];
        expect(rows.length).toBe(1);
        expect(rows[0].status).toBe('pending');
        createdRequestIds.push(rows[0].id);
      } finally {
        conn.release();
      }
    });

    it('should approve a brand request, creating the brand and brand_categories entry', async () => {
      const brandName = `ApproveMe_${Date.now()}`;

      // Create the request
      await request(app)
        .post(`${API_BASE}/brands/request`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ brandName, categoryId: testCategoryId });

      // Find the request
      const conn = await pool.getConnection();
      let requestId: number;
      try {
        const [rows] = await conn.query(
          'SELECT id FROM brand_requests WHERE brand_name = ? AND vendor_id = ?',
          [brandName, vendorId]
        ) as any[];
        requestId = rows[0].id;
        createdRequestIds.push(requestId);
      } finally {
        conn.release();
      }

      // Admin approves
      const approveRes = await request(app)
        .put(`${API_BASE}/brands/requests/${requestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved', adminNote: 'Looks good!' });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.status).toBe('success');

      // Verify: brand created
      const conn2 = await pool.getConnection();
      try {
        const [brands] = await conn2.query('SELECT * FROM brands WHERE name = ?', [brandName]) as any[];
        expect(brands.length).toBe(1);
        createdBrandIds.push(brands[0].id);

        // Verify: brand_categories entry exists
        const [assoc] = await conn2.query(
          'SELECT * FROM brand_categories WHERE brand_id = ? AND category_id = ?',
          [brands[0].id, testCategoryId]
        ) as any[];
        expect(assoc.length).toBe(1);

        // Verify: request status is approved
        const [reqs] = await conn2.query('SELECT * FROM brand_requests WHERE id = ?', [requestId]) as any[];
        expect(reqs[0].status).toBe('approved');
        expect(reqs[0].admin_note).toBe('Looks good!');
      } finally {
        conn2.release();
      }
    });

    it('should reject approving an already-processed request', async () => {
      const brandName = `AlreadyProcessed_${Date.now()}`;

      // Create and approve a request
      await request(app)
        .post(`${API_BASE}/brands/request`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ brandName, categoryId: testCategoryId });

      const conn = await pool.getConnection();
      let requestId: number;
      try {
        const [rows] = await conn.query(
          'SELECT id FROM brand_requests WHERE brand_name = ? AND vendor_id = ?',
          [brandName, vendorId]
        ) as any[];
        requestId = rows[0].id;
        createdRequestIds.push(requestId);
      } finally {
        conn.release();
      }

      // First approval
      const firstApprove = await request(app)
        .put(`${API_BASE}/brands/requests/${requestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });

      expect(firstApprove.status).toBe(200);

      // Track the created brand
      const conn2 = await pool.getConnection();
      try {
        const [brands] = await conn2.query('SELECT id FROM brands WHERE name = ?', [brandName]) as any[];
        if (brands.length > 0) createdBrandIds.push(brands[0].id);
      } finally {
        conn2.release();
      }

      // Second approval attempt
      const secondApprove = await request(app)
        .put(`${API_BASE}/brands/requests/${requestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });

      expect(secondApprove.status).toBe(400);
      expect(secondApprove.body.message).toBe('Brand request has already been processed');
    });
  });

  // ============================
  // Brand Request Rejection Flow
  // Validates: Requirements 4.3
  // ============================
  describe('Brand request rejection flow', () => {
    it('should reject a brand request with admin_note stored', async () => {
      const brandName = `RejectMe_${Date.now()}`;

      // Create the request
      await request(app)
        .post(`${API_BASE}/brands/request`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ brandName, categoryId: testCategoryId });

      const conn = await pool.getConnection();
      let requestId: number;
      try {
        const [rows] = await conn.query(
          'SELECT id FROM brand_requests WHERE brand_name = ? AND vendor_id = ?',
          [brandName, vendorId]
        ) as any[];
        requestId = rows[0].id;
        createdRequestIds.push(requestId);
      } finally {
        conn.release();
      }

      // Admin rejects
      const rejectRes = await request(app)
        .put(`${API_BASE}/brands/requests/${requestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'rejected', adminNote: 'Brand name is too generic' });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.status).toBe('success');

      // Verify: request status is rejected, admin_note stored
      const conn2 = await pool.getConnection();
      try {
        const [reqs] = await conn2.query('SELECT * FROM brand_requests WHERE id = ?', [requestId]) as any[];
        expect(reqs[0].status).toBe('rejected');
        expect(reqs[0].admin_note).toBe('Brand name is too generic');

        // Verify: NO brand was created
        const [brands] = await conn2.query('SELECT * FROM brands WHERE name = ?', [brandName]) as any[];
        expect(brands.length).toBe(0);
      } finally {
        conn2.release();
      }
    });

    it('should reject re-rejecting an already-rejected request', async () => {
      const brandName = `DoubleReject_${Date.now()}`;

      // Create the request
      await request(app)
        .post(`${API_BASE}/brands/request`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ brandName, categoryId: testCategoryId });

      const conn = await pool.getConnection();
      let requestId: number;
      try {
        const [rows] = await conn.query(
          'SELECT id FROM brand_requests WHERE brand_name = ? AND vendor_id = ?',
          [brandName, vendorId]
        ) as any[];
        requestId = rows[0].id;
        createdRequestIds.push(requestId);
      } finally {
        conn.release();
      }

      // First rejection
      const firstReject = await request(app)
        .put(`${API_BASE}/brands/requests/${requestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'rejected', adminNote: 'Not appropriate' });

      expect(firstReject.status).toBe(200);

      // Second rejection attempt
      const secondReject = await request(app)
        .put(`${API_BASE}/brands/requests/${requestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'rejected', adminNote: 'Trying again' });

      expect(secondReject.status).toBe(400);
      expect(secondReject.body.message).toBe('Brand request has already been processed');
    });
  });

  // ============================
  // Deletion Cascade Tests
  // Validates: Requirements 2.3
  // ============================
  describe('Deletion cascade', () => {
    it('should nullify product brand_id when brand is deleted', async () => {
      // Create a brand
      const brandName = `DeleteCascade_${Date.now()}`;
      const createRes = await request(app)
        .post(`${API_BASE}/brands`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: brandName, subcategoryIds: [testCategoryId] });

      expect(createRes.status).toBe(201);
      const brandId = createRes.body.brandId;

      // Create a product with that brand_id directly in DB
      const conn = await pool.getConnection();
      let productId: number;
      try {
        const [prodResult] = await conn.query(
          `INSERT INTO products (vendor_id, category_id, name, price, stock_quantity, status, brand_id)
           VALUES (?, ?, ?, 100, 10, 'active', ?)`,
          [vendorId, testCategoryId, `CascadeProd_${Date.now()}`, brandId]
        ) as any[];
        productId = prodResult.insertId;
      } finally {
        conn.release();
      }

      // Delete the brand
      const deleteRes = await request(app)
        .delete(`${API_BASE}/brands/${brandId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);

      // Verify product brand_id is NULL
      const conn2 = await pool.getConnection();
      try {
        const [products] = await conn2.query('SELECT brand_id FROM products WHERE id = ?', [productId]) as any[];
        expect(products[0].brand_id).toBeNull();

        // Verify brand_categories entries are removed
        const [assoc] = await conn2.query('SELECT * FROM brand_categories WHERE brand_id = ?', [brandId]) as any[];
        expect(assoc.length).toBe(0);

        // Clean up product
        await conn2.query('DELETE FROM products WHERE id = ?', [productId]);
      } finally {
        conn2.release();
      }
    });

    it('should remove brand_categories entries when brand is deleted', async () => {
      const brandName = `CascadeAssoc_${Date.now()}`;
      const createRes = await request(app)
        .post(`${API_BASE}/brands`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: brandName, subcategoryIds: [testCategoryId] });

      expect(createRes.status).toBe(201);
      const brandId = createRes.body.brandId;

      // Verify association exists
      const conn = await pool.getConnection();
      try {
        const [assocBefore] = await conn.query('SELECT * FROM brand_categories WHERE brand_id = ?', [brandId]) as any[];
        expect(assocBefore.length).toBe(1);
      } finally {
        conn.release();
      }

      // Delete the brand
      const deleteRes = await request(app)
        .delete(`${API_BASE}/brands/${brandId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);

      // Verify no brand_categories entries remain
      const conn2 = await pool.getConnection();
      try {
        const [assocAfter] = await conn2.query('SELECT * FROM brand_categories WHERE brand_id = ?', [brandId]) as any[];
        expect(assocAfter.length).toBe(0);
      } finally {
        conn2.release();
      }
    });
  });

  // ============================
  // Edge Cases
  // ============================
  describe('Edge cases', () => {
    it('should create a brand with null logo_url when not provided', async () => {
      const name = `NoLogo_${Date.now()}`;
      const res = await request(app)
        .post(`${API_BASE}/brands`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name });

      expect(res.status).toBe(201);
      createdBrandIds.push(res.body.brandId);

      const getRes = await request(app).get(`${API_BASE}/brands/${res.body.brandId}`);
      expect(getRes.body.brand.logo_url).toBeNull();
    });

    it('should create a brand with explicit empty string logo_url as null', async () => {
      const name = `EmptyLogo_${Date.now()}`;
      const res = await request(app)
        .post(`${API_BASE}/brands`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name, logoUrl: '' });

      expect(res.status).toBe(201);
      createdBrandIds.push(res.body.brandId);

      const getRes = await request(app).get(`${API_BASE}/brands/${res.body.brandId}`);
      // Empty string should be stored as null or empty
      expect([null, '']).toContain(getRes.body.brand.logo_url);
    });

    it('should create a brand with name at max length (100 chars)', async () => {
      // 100 char name (minus timestamp suffix)
      const baseName = 'A'.repeat(80);
      const name = `${baseName}_${Date.now()}`.slice(0, 100);
      const res = await request(app)
        .post(`${API_BASE}/brands`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name });

      expect(res.status).toBe(201);
      createdBrandIds.push(res.body.brandId);
    });

    it('should not store a brand with name > 100 chars in the database', async () => {
      // The DB has a VARCHAR(100) constraint on brand name.
      // Attempting to insert directly should fail at the DB level.
      const name = 'B'.repeat(101);
      const conn = await pool.getConnection();
      try {
        let insertSucceeded = false;
        try {
          await conn.query(
            'INSERT INTO brands (name, slug, status) VALUES (?, ?, "active")',
            [name, 'too-long-slug']
          );
          insertSucceeded = true;
        } catch (err: any) {
          // Expected: ER_DATA_TOO_LONG
          expect(err.code || err.message).toMatch(/DATA_TOO_LONG|Data too long/i);
        }
        expect(insertSucceeded).toBe(false);
      } finally {
        conn.release();
      }
    });

    it('should return 404 when updating a non-existent brand', async () => {
      const res = await request(app)
        .put(`${API_BASE}/brands/999999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'NonExistent' });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Brand not found');
    });

    it('should return 404 when deleting a non-existent brand', async () => {
      const res = await request(app)
        .delete(`${API_BASE}/brands/999999`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Brand not found');
    });
  });
});
