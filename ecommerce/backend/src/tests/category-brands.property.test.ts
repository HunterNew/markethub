// Feature: category-brands, Property 1: Brand creation round-trip
// Validates: Requirements 1.1, 2.1, 2.2

process.env.NODE_ENV = 'test';

import request from 'supertest';
import fc from 'fast-check';
import app from '../index';
import pool from '../db/pool';

const API_BASE = '/api/v1';

// Helper: register an admin and get token
async function setupAdmin(): Promise<{ adminToken: string; adminUserId: number }> {
  const email = `admin_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;
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

  // Promote to admin directly in DB
  const conn = await pool.getConnection();
  try {
    await conn.query("UPDATE users SET role = 'admin' WHERE id = ?", [adminUserId]);
  } finally {
    conn.release();
  }

  // Login to get a token with admin role
  const loginRes = await request(app)
    .post(`${API_BASE}/auth/login`)
    .send({ email, password: 'testpass123' });

  return { adminToken: loginRes.body.token, adminUserId };
}

// Helper: generate slug from name (mirrors backend logic)
function expectedSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

// Arbitrary: valid brand name (non-empty alphanumeric + spaces, starting with a letter)
const arbitraryBrandName = fc
  .tuple(
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 1, maxLength: 3 }),
    fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789 '.split('')),
      { minLength: 0, maxLength: 20 }
    )
  )
  .map(([prefix, rest]) => `${prefix}${rest}`.trim())
  .filter((name) => name.length >= 1 && name.length <= 100);

// Arbitrary: optional logo URL (either undefined or a valid-looking URL)
const arbitraryLogoUrl = fc.oneof(
  fc.constant(undefined),
  fc.webUrl().map((url) => url)
);

describe('Category Brands Property Tests', () => {
  let adminToken: string;
  let adminUserId: number;
  const createdBrandIds: number[] = [];

  beforeAll(async () => {
    const setup = await setupAdmin();
    adminToken = setup.adminToken;
    adminUserId = setup.adminUserId;
  });

  afterAll(async () => {
    const conn = await pool.getConnection();
    try {
      // Clean up created brands
      if (createdBrandIds.length > 0) {
        await conn.query('DELETE FROM brand_categories WHERE brand_id IN (?)', [createdBrandIds]);
        await conn.query('DELETE FROM brands WHERE id IN (?)', [createdBrandIds]);
      }
      await conn.query('DELETE FROM users WHERE id = ?', [adminUserId]);
    } finally {
      conn.release();
    }
    await pool.end();
  });

  // Feature: category-brands, Property 2: Slug generation produces URL-safe output
  // Validates: Requirements 1.3
  it('Property 2: Slug generation produces URL-safe output', () => {
    // Arbitrary: any string including special characters, unicode, spaces
    const arbitraryString = fc.string({ minLength: 0, maxLength: 200 });

    fc.assert(
      fc.property(arbitraryString, (name: string) => {
        const slug = expectedSlug(name);

        // If the name produces an empty slug (e.g., all special chars), that's valid
        if (slug.length === 0) {
          return true;
        }

        // 1. Slug contains only [a-z0-9-] characters
        expect(slug).toMatch(/^[a-z0-9-]+$/);

        // 2. Slug does not start with a hyphen
        expect(slug.startsWith('-')).toBe(false);

        // 3. Slug does not end with a hyphen
        expect(slug.endsWith('-')).toBe(false);

        // 4. Slug does not contain consecutive hyphens
        expect(slug).not.toMatch(/--/);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  // Feature: category-brands, Property 3: Unique name enforcement
  // Validates: Requirements 1.4
  it('Property 3: Unique name enforcement', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryBrandName, async (name) => {
        // Make name unique per iteration to avoid cross-iteration conflicts
        const uniqueName = `${name}_dup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        // Create the first brand
        const createRes = await request(app)
          .post(`${API_BASE}/brands`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: uniqueName });

        expect(createRes.status).toBe(201);
        expect(createRes.body.status).toBe('success');
        createdBrandIds.push(createRes.body.brandId);

        // Attempt to create a second brand with the same name (exact case)
        const duplicateRes = await request(app)
          .post(`${API_BASE}/brands`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: uniqueName });

        expect(duplicateRes.status).toBe(409);
        expect(duplicateRes.body.message).toBe('A brand with this name already exists');

        // Attempt to create a brand with same name in different case (case-insensitive check)
        const caseVariant = uniqueName.toUpperCase() === uniqueName
          ? uniqueName.toLowerCase()
          : uniqueName.toUpperCase();

        const caseInsensitiveRes = await request(app)
          .post(`${API_BASE}/brands`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: caseVariant });

        expect(caseInsensitiveRes.status).toBe(409);
        expect(caseInsensitiveRes.body.message).toBe('A brand with this name already exists');
      }),
      { numRuns: 100 }
    );
  });

  // Feature: category-brands, Property 4: Brand-subcategory association round-trip
  // Validates: Requirements 1.2, 2.4
  it('Property 4: Brand-subcategory association round-trip', async () => {
    // Fetch subcategories (categories with a parent_id) from the database
    const conn = await pool.getConnection();
    let subcategoryIds: number[] = [];
    try {
      const [rows] = await conn.query('SELECT id FROM categories WHERE parent_id IS NOT NULL') as any[];
      subcategoryIds = (rows as any[]).map((r: any) => r.id);
    } finally {
      conn.release();
    }

    // If no subcategories exist, create some test ones
    if (subcategoryIds.length < 3) {
      const setupConn = await pool.getConnection();
      try {
        // Create a parent category
        const [parentResult] = await setupConn.query(
          "INSERT INTO categories (name, slug) VALUES (?, ?)",
          [`TestParent_${Date.now()}`, `test-parent-${Date.now()}`]
        ) as any[];
        const parentId = parentResult.insertId;

        // Create subcategories
        for (let i = 0; i < 5; i++) {
          const [subResult] = await setupConn.query(
            "INSERT INTO categories (name, slug, parent_id) VALUES (?, ?, ?)",
            [`TestSub_${Date.now()}_${i}`, `test-sub-${Date.now()}-${i}`, parentId]
          ) as any[];
          subcategoryIds.push(subResult.insertId);
        }
      } finally {
        setupConn.release();
      }
    }

    // Ensure we have at least 2 subcategories for the test to be meaningful
    expect(subcategoryIds.length).toBeGreaterThanOrEqual(2);

    // Arbitrary: a non-empty subset of subcategory IDs
    const arbitrarySubcategorySubset = fc
      .subarray(subcategoryIds, { minLength: 1, maxLength: Math.min(subcategoryIds.length, 5) })
      .filter((arr) => arr.length >= 1);

    await fc.assert(
      fc.asyncProperty(arbitraryBrandName, arbitrarySubcategorySubset, async (name, selectedSubcatIds) => {
        // Make name unique per iteration
        const uniqueName = `${name}_assoc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        // Create a brand with the selected subcategory associations
        const createRes = await request(app)
          .post(`${API_BASE}/brands`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: uniqueName, subcategoryIds: selectedSubcatIds });

        expect(createRes.status).toBe(201);
        expect(createRes.body.status).toBe('success');
        const brandId = createRes.body.brandId;
        createdBrandIds.push(brandId);

        // For each subcategory in the assigned set, verify the brand appears in filtered results
        for (const subcatId of selectedSubcatIds) {
          const filterRes = await request(app)
            .get(`${API_BASE}/brands?subcategoryId=${subcatId}`);

          expect(filterRes.status).toBe(200);
          const brandIds = filterRes.body.brands.map((b: any) => b.id);
          expect(brandIds).toContain(brandId);
        }

        // Pick a subcategory NOT in the assigned set and verify the brand is excluded
        const excludedSubcats = subcategoryIds.filter((id) => !selectedSubcatIds.includes(id));
        if (excludedSubcats.length > 0) {
          const excludedSubcatId = excludedSubcats[0];
          const excludeRes = await request(app)
            .get(`${API_BASE}/brands?subcategoryId=${excludedSubcatId}`);

          expect(excludeRes.status).toBe(200);
          const excludedBrandIds = excludeRes.body.brands.map((b: any) => b.id);
          expect(excludedBrandIds).not.toContain(brandId);
        }
      }),
      { numRuns: 100 }
    );
  });

  // Feature: category-brands, Property 5: Brand deletion nullifies product references
  // Validates: Requirements 2.3
  it('Property 5: Brand deletion nullifies product references', async () => {
    // Arbitrary: number of products to associate with a brand (1-3)
    const arbitraryProductCount = fc.integer({ min: 1, max: 3 });

    await fc.assert(
      fc.asyncProperty(arbitraryBrandName, arbitraryProductCount, async (name, productCount) => {
        const uniqueName = `${name}_del_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        // Create a brand via API
        const createRes = await request(app)
          .post(`${API_BASE}/brands`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: uniqueName });

        expect(createRes.status).toBe(201);
        const brandId = createRes.body.brandId;

        // Insert test products directly in DB with this brand_id
        const conn = await pool.getConnection();
        const productIds: number[] = [];
        try {
          // Get a vendor_id and category_id to satisfy FK constraints
          const [vendors] = await conn.query('SELECT id FROM vendors LIMIT 1') as any[];
          const [categories] = await conn.query('SELECT id FROM categories WHERE parent_id IS NOT NULL LIMIT 1') as any[];

          let vendorId: number;
          let categoryId: number;

          if ((vendors as any[]).length === 0) {
            // Create a test user and vendor
            const [userResult] = await conn.query(
              "INSERT INTO users (email, password, role, first_name, last_name) VALUES (?, 'hash', 'vendor', 'Test', 'Vendor')",
              [`vendorprop5_${Date.now()}@test.com`]
            ) as any[];
            const [vendorResult] = await conn.query(
              "INSERT INTO vendors (user_id, store_name, store_description, status) VALUES (?, 'TestStore', 'desc', 'active')",
              [userResult.insertId]
            ) as any[];
            vendorId = vendorResult.insertId;
          } else {
            vendorId = (vendors as any[])[0].id;
          }

          if ((categories as any[]).length === 0) {
            const [catResult] = await conn.query(
              "INSERT INTO categories (name, slug) VALUES (?, ?)",
              [`TestCatP5_${Date.now()}`, `test-cat-p5-${Date.now()}`]
            ) as any[];
            categoryId = catResult.insertId;
          } else {
            categoryId = (categories as any[])[0].id;
          }

          // Insert products with the brand_id
          for (let i = 0; i < productCount; i++) {
            const [productResult] = await conn.query(
              `INSERT INTO products (vendor_id, category_id, name, price, stock_quantity, status, brand_id)
               VALUES (?, ?, ?, 100, 10, 'active', ?)`,
              [vendorId, categoryId, `TestProd_${Date.now()}_${i}`, brandId]
            ) as any[];
            productIds.push(productResult.insertId);
          }

          // Verify products have the brand_id set
          const [beforeProducts] = await conn.query(
            'SELECT id, brand_id FROM products WHERE id IN (?)',
            [productIds]
          ) as any[];
          for (const p of beforeProducts as any[]) {
            expect(p.brand_id).toBe(brandId);
          }
        } finally {
          conn.release();
        }

        // Delete the brand via API
        const deleteRes = await request(app)
          .delete(`${API_BASE}/brands/${brandId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(deleteRes.status).toBe(200);
        expect(deleteRes.body.status).toBe('success');

        // Verify all products that previously had the brand_id now have brand_id = NULL
        const connAfter = await pool.getConnection();
        try {
          const [afterProducts] = await connAfter.query(
            'SELECT id, brand_id FROM products WHERE id IN (?)',
            [productIds]
          ) as any[];

          expect((afterProducts as any[]).length).toBe(productCount);
          for (const p of afterProducts as any[]) {
            expect(p.brand_id).toBeNull();
          }

          // Clean up test products
          await connAfter.query('DELETE FROM products WHERE id IN (?)', [productIds]);
        } finally {
          connAfter.release();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 1: Brand creation round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryBrandName, arbitraryLogoUrl, async (name, logoUrl) => {
        // Make name unique per iteration to avoid conflicts
        const uniqueName = `${name}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        // Create brand via API
        const createRes = await request(app)
          .post(`${API_BASE}/brands`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: uniqueName, logoUrl: logoUrl || undefined });

        expect(createRes.status).toBe(201);
        expect(createRes.body.status).toBe('success');
        expect(createRes.body.brandId).toBeDefined();

        const brandId = createRes.body.brandId;
        createdBrandIds.push(brandId);

        // Fetch brand via API
        const getRes = await request(app)
          .get(`${API_BASE}/brands/${brandId}`);

        expect(getRes.status).toBe(200);
        expect(getRes.body.status).toBe('success');

        const brand = getRes.body.brand;

        // Verify round-trip properties
        // Name matches what was sent
        expect(brand.name).toBe(uniqueName);

        // Slug matches expected generation
        expect(brand.slug).toBe(expectedSlug(uniqueName));

        // Logo URL matches
        if (logoUrl) {
          expect(brand.logo_url).toBe(logoUrl);
        } else {
          expect(brand.logo_url).toBeNull();
        }

        // Status is active
        expect(brand.status).toBe('active');

        // Valid timestamps (allow up to 24h clock drift between DB and test process)
        expect(brand.created_at).toBeDefined();
        expect(brand.updated_at).toBeDefined();
        const createdAt = new Date(brand.created_at);
        const updatedAt = new Date(brand.updated_at);
        expect(createdAt.getTime()).not.toBeNaN();
        expect(updatedAt.getTime()).not.toBeNaN();
        // Timestamps should be within a reasonable range (within 24h of now)
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        expect(Math.abs(createdAt.getTime() - now)).toBeLessThan(oneDayMs);
        expect(Math.abs(updatedAt.getTime() - now)).toBeLessThan(oneDayMs);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: category-brands, Property 6: Brand list filtered by subcategory returns only associated brands
  // Validates: Requirements 3.1, 5.1, 7.1
  it('Property 6: Brand list filtered by subcategory returns only associated brands', async () => {
    // Fetch or create subcategories for the test
    const conn = await pool.getConnection();
    let subcategoryIds: number[] = [];
    try {
      const [rows] = await conn.query('SELECT id FROM categories WHERE parent_id IS NOT NULL') as any[];
      subcategoryIds = (rows as any[]).map((r: any) => r.id);

      if (subcategoryIds.length < 3) {
        // Create a parent category and subcategories
        const [parentResult] = await conn.query(
          "INSERT INTO categories (name, slug) VALUES (?, ?)",
          [`TestParentP6_${Date.now()}`, `test-parent-p6-${Date.now()}`]
        ) as any[];
        const parentId = parentResult.insertId;

        for (let i = 0; i < 4; i++) {
          const [subResult] = await conn.query(
            "INSERT INTO categories (name, slug, parent_id) VALUES (?, ?, ?)",
            [`TestSubP6_${Date.now()}_${i}`, `test-sub-p6-${Date.now()}-${i}`, parentId]
          ) as any[];
          subcategoryIds.push(subResult.insertId);
        }
      }
    } finally {
      conn.release();
    }

    expect(subcategoryIds.length).toBeGreaterThanOrEqual(3);

    // Arbitrary: pick a target subcategory index and a disjoint subcategory index
    const arbitrarySubcatIndices = fc
      .tuple(
        fc.integer({ min: 0, max: subcategoryIds.length - 1 }),
        fc.integer({ min: 0, max: subcategoryIds.length - 1 })
      )
      .filter(([a, b]) => a !== b);

    await fc.assert(
      fc.asyncProperty(arbitraryBrandName, arbitraryBrandName, arbitrarySubcatIndices, async (name1, name2, [targetIdx, otherIdx]) => {
        const targetSubcatId = subcategoryIds[targetIdx];
        const otherSubcatId = subcategoryIds[otherIdx];

        // Create brand A associated with targetSubcatId
        const uniqueNameA = `${name1}_p6a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const createResA = await request(app)
          .post(`${API_BASE}/brands`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: uniqueNameA, subcategoryIds: [targetSubcatId] });

        expect(createResA.status).toBe(201);
        const brandIdA = createResA.body.brandId;
        createdBrandIds.push(brandIdA);

        // Create brand B associated ONLY with otherSubcatId (not target)
        const uniqueNameB = `${name2}_p6b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const createResB = await request(app)
          .post(`${API_BASE}/brands`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: uniqueNameB, subcategoryIds: [otherSubcatId] });

        expect(createResB.status).toBe(201);
        const brandIdB = createResB.body.brandId;
        createdBrandIds.push(brandIdB);

        // Query brands filtered by targetSubcatId
        const filterRes = await request(app)
          .get(`${API_BASE}/brands?subcategoryId=${targetSubcatId}`);

        expect(filterRes.status).toBe(200);
        expect(filterRes.body.status).toBe('success');

        const returnedBrands = filterRes.body.brands;
        const returnedBrandIds = returnedBrands.map((b: any) => b.id);

        // Property: Brand A (associated with targetSubcatId) MUST be in the results
        expect(returnedBrandIds).toContain(brandIdA);

        // Property: Brand B (only associated with otherSubcatId) MUST NOT be in the results
        expect(returnedBrandIds).not.toContain(brandIdB);

        // Property: ALL returned brands must have an association with targetSubcatId in brand_categories
        const verifyConn = await pool.getConnection();
        try {
          for (const brand of returnedBrands) {
            const [assocRows] = await verifyConn.query(
              'SELECT id FROM brand_categories WHERE brand_id = ? AND category_id = ?',
              [brand.id, targetSubcatId]
            ) as any[];
            expect((assocRows as any[]).length).toBeGreaterThanOrEqual(1);
          }
        } finally {
          verifyConn.release();
        }
      }),
      { numRuns: 100 }
    );
  });

  // Feature: category-brands, Property 11: Brand filter returns only matching products
  // Validates: Requirements 5.2
  it('Property 11: Brand filter returns only matching products', async () => {
    // Setup: get or create a vendor and category for test products
    const conn = await pool.getConnection();
    let vendorId: number;
    let categoryId: number;
    try {
      const [vendors] = await conn.query("SELECT id FROM vendors WHERE status = 'approved' LIMIT 1") as any[];
      if ((vendors as any[]).length === 0) {
        const [userResult] = await conn.query(
          "INSERT INTO users (email, password, role, first_name, last_name) VALUES (?, 'hash', 'vendor', 'Test', 'Vendor')",
          [`vendorprop11_${Date.now()}@test.com`]
        ) as any[];
        const [vendorResult] = await conn.query(
          "INSERT INTO vendors (user_id, store_name, store_slug, store_description, status) VALUES (?, 'TestStoreP11', 'test-store-p11', 'desc', 'approved')",
          [userResult.insertId]
        ) as any[];
        vendorId = vendorResult.insertId;
      } else {
        vendorId = (vendors as any[])[0].id;
      }

      const [categories] = await conn.query('SELECT id FROM categories LIMIT 1') as any[];
      if ((categories as any[]).length === 0) {
        const [catResult] = await conn.query(
          "INSERT INTO categories (name, slug) VALUES (?, ?)",
          [`TestCatP11_${Date.now()}`, `test-cat-p11-${Date.now()}`]
        ) as any[];
        categoryId = catResult.insertId;
      } else {
        categoryId = (categories as any[])[0].id;
      }
    } finally {
      conn.release();
    }

    // Arbitrary: number of brands to create (2-4)
    const arbitraryBrandCount = fc.integer({ min: 2, max: 4 });
    // Arbitrary: how many of those brands are in the filter subset (1 to brandCount-1)
    const arbitrarySeed = fc.integer({ min: 0, max: 2147483647 });

    await fc.assert(
      fc.asyncProperty(arbitraryBrandCount, arbitrarySeed, async (brandCount, seed) => {
        const iterConn = await pool.getConnection();
        const testBrandIds: number[] = [];
        const testProductIds: number[] = [];

        try {
          // Create brands
          for (let i = 0; i < brandCount; i++) {
            const brandName = `p11brand_${Date.now()}_${seed}_${i}_${Math.random().toString(36).slice(2, 6)}`;
            const [brandResult] = await iterConn.query(
              "INSERT INTO brands (name, slug, status) VALUES (?, ?, 'active')",
              [brandName, brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-')]
            ) as any[];
            testBrandIds.push(brandResult.insertId);
          }

          // Create 1-2 products per brand, all active
          for (const brandId of testBrandIds) {
            const prodName = `p11prod_${Date.now()}_${brandId}_${Math.random().toString(36).slice(2, 6)}`;
            const [prodResult] = await iterConn.query(
              `INSERT INTO products (vendor_id, category_id, name, price, stock_quantity, status, brand_id)
               VALUES (?, ?, ?, 50, 10, 'active', ?)`,
              [vendorId, categoryId, prodName, brandId]
            ) as any[];
            testProductIds.push(prodResult.insertId);
          }

          // Pick a subset of brand IDs to use as the filter (at least 1, at most brandCount-1 to ensure some are excluded)
          const subsetSize = (seed % (brandCount - 1)) + 1; // 1 to brandCount-1
          const filterBrandIds = testBrandIds.slice(0, subsetSize);

          // Query GET /api/v1/products?brandIds=X,Y
          const brandIdsParam = filterBrandIds.join(',');
          const res = await request(app)
            .get(`${API_BASE}/products?brandIds=${brandIdsParam}`);

          expect(res.status).toBe(200);
          expect(res.body.status).toBe('success');

          const products = res.body.products as any[];

          // Property: every product in the response should have a brand_id that is in the requested set
          for (const product of products) {
            expect(filterBrandIds).toContain(product.brand_id);
          }

          // Additionally verify our test products with non-filtered brands are NOT in the response
          const excludedBrandIds = testBrandIds.filter(id => !filterBrandIds.includes(id));
          const returnedProductIds = products.map((p: any) => p.id);
          for (const prodId of testProductIds) {
            // Find which brand this product belongs to
            const [prodRows] = await iterConn.query('SELECT brand_id FROM products WHERE id = ?', [prodId]) as any[];
            if (prodRows.length > 0 && excludedBrandIds.includes(prodRows[0].brand_id)) {
              expect(returnedProductIds).not.toContain(prodId);
            }
          }
        } finally {
          // Cleanup: remove test products and brands
          if (testProductIds.length > 0) {
            await iterConn.query('DELETE FROM products WHERE id IN (?)', [testProductIds]);
          }
          if (testBrandIds.length > 0) {
            await iterConn.query('DELETE FROM brands WHERE id IN (?)', [testBrandIds]);
          }
          iterConn.release();
        }
      }),
      { numRuns: 100 }
    );
  });

  // Feature: category-brands, Property 14: Protected endpoints reject unauthorized access
  // Validates: Requirements 7.2, 7.4, 7.6
  it('Property 14: Protected endpoints reject unauthorized access', async () => {
    // Define admin-only endpoints (method + path)
    const adminEndpoints: Array<{ method: 'post' | 'put' | 'delete' | 'get'; path: string; body?: object }> = [
      { method: 'post', path: `${API_BASE}/brands`, body: { name: 'TestBrand' } },
      { method: 'put', path: `${API_BASE}/brands/1`, body: { name: 'Updated' } },
      { method: 'delete', path: `${API_BASE}/brands/1` },
      { method: 'get', path: `${API_BASE}/brands/requests` },
      { method: 'put', path: `${API_BASE}/brands/requests/1`, body: { status: 'approved' } },
    ];

    // Define vendor-only endpoints (method + path)
    const vendorEndpoints: Array<{ method: 'post' | 'get'; path: string; body?: object }> = [
      { method: 'post', path: `${API_BASE}/brands/request`, body: { brandName: 'TestBrand', categoryId: 1 } },
      { method: 'get', path: `${API_BASE}/brands/my-requests` },
    ];

    // Create a customer token (non-admin, non-vendor)
    const customerEmail = `customer_p14_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;
    const custRegRes = await request(app)
      .post(`${API_BASE}/auth/register`)
      .send({
        email: customerEmail,
        password: 'testpass123',
        role: 'customer',
        firstName: 'Customer',
        lastName: 'User',
        phone: '8888888888',
      });
    const customerUserId = custRegRes.body.user.id;
    const custLoginRes = await request(app)
      .post(`${API_BASE}/auth/login`)
      .send({ email: customerEmail, password: 'testpass123' });
    const customerToken = custLoginRes.body.token;

    // Arbitrary: select an endpoint index and an access scenario
    type AccessScenario = 'no_token' | 'wrong_role';
    const allEndpoints = [...adminEndpoints.map(e => ({ ...e, requiredRole: 'admin' as const })), ...vendorEndpoints.map(e => ({ ...e, requiredRole: 'vendor' as const }))];

    const arbitraryEndpointIndex = fc.integer({ min: 0, max: allEndpoints.length - 1 });
    const arbitraryScenario = fc.constantFrom<AccessScenario>('no_token', 'wrong_role');

    await fc.assert(
      fc.asyncProperty(arbitraryEndpointIndex, arbitraryScenario, async (endpointIdx, scenario) => {
        const endpoint = allEndpoints[endpointIdx];

        let req$: request.Test;

        // Build the base request
        if (endpoint.method === 'get') {
          req$ = request(app).get(endpoint.path);
        } else if (endpoint.method === 'post') {
          req$ = request(app).post(endpoint.path);
        } else if (endpoint.method === 'put') {
          req$ = request(app).put(endpoint.path);
        } else {
          req$ = request(app).delete(endpoint.path);
        }

        // Apply scenario
        if (scenario === 'no_token') {
          // No Authorization header at all
        } else if (scenario === 'wrong_role') {
          // Use customer token (which is neither admin nor vendor)
          req$ = req$.set('Authorization', `Bearer ${customerToken}`);
        }

        // Send body if needed
        if (endpoint.body) {
          req$ = req$.send(endpoint.body);
        }

        const res = await req$;

        // Property: unauthenticated or unauthorized requests should get 401 or 403
        expect([401, 403]).toContain(res.status);
        expect(res.body.status).toBe('error');
      }),
      { numRuns: 100 }
    );

    // Cleanup: remove test customer user
    const cleanupConn = await pool.getConnection();
    try {
      await cleanupConn.query('DELETE FROM users WHERE id = ?', [customerUserId]);
    } finally {
      cleanupConn.release();
    }
  });
});
