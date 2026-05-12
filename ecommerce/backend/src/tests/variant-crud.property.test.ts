// Feature: product-variants, Property 1: Maximum Option Types Constraint
// Feature: product-variants, Property 3: Variant Combination Cartesian Product
// Feature: product-variants, Property 4: Variant Price and Stock Validation
// Feature: product-variants, Property 14: has_variants Flag Consistency
// Validates: Requirements 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 7.2

process.env.NODE_ENV = 'test';

import request from 'supertest';
import fc from 'fast-check';
import app from '../index';
import pool from '../db/pool';

const API_BASE = '/api/v1';

// Helper: register a vendor and get token + create a product
async function setupVendorWithProduct(): Promise<{
  token: string;
  productId: number;
  vendorUserId: number;
}> {
  const email = `vendor_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;
  const regRes = await request(app)
    .post(`${API_BASE}/auth/register`)
    .send({
      email,
      password: 'testpass123',
      role: 'vendor',
      firstName: 'Test',
      lastName: 'Vendor',
      storeName: `Store ${Date.now()}`,
    });

  const token = regRes.body.token;
  const vendorUserId = regRes.body.user.id;

  // Approve the vendor directly in DB
  const conn = await pool.getConnection();
  try {
    await conn.query("UPDATE vendors SET status = 'approved' WHERE user_id = ?", [vendorUserId]);
  } finally {
    conn.release();
  }

  // Create a product
  const prodRes = await request(app)
    .post(`${API_BASE}/products`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: `Test Product ${Date.now()}`,
      description: 'A test product for property tests',
      price: 100,
      categoryId: 1,
      stockQuantity: 50,
    });

  const productId = prodRes.body.product?.id || prodRes.body.productId;

  return { token, productId, vendorUserId };
}

// Helper: generate cartesian product of option values
function cartesianProduct(arrays: string[][]): string[][] {
  if (arrays.length === 0) return [[]];
  return arrays.reduce<string[][]>(
    (acc, curr) => acc.flatMap((combo) => curr.map((val) => [...combo, val])),
    [[]]
  );
}

// Arbitrary: generate option type names (unique)
const arbitraryOptionTypeName = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 3, maxLength: 10 }
);

// Arbitrary: generate option values (non-empty, unique strings)
const arbitraryOptionValues = fc.uniqueArray(
  fc.stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')), {
    minLength: 1,
    maxLength: 5,
  }),
  { minLength: 1, maxLength: 5 }
);

// Arbitrary: generate 1-3 valid option types
const arbitraryValidOptionTypes = fc
  .uniqueArray(arbitraryOptionTypeName, { minLength: 1, maxLength: 3 })
  .chain((names) =>
    fc.tuple(...names.map(() => arbitraryOptionValues)).map((valuesArr) =>
      names.map((name, i) => ({
        name,
        position: i,
        values: valuesArr[i],
      }))
    )
  );

// Arbitrary: generate 4-5 option types (exceeds max)
const arbitraryExcessOptionTypes = fc
  .uniqueArray(arbitraryOptionTypeName, { minLength: 4, maxLength: 5 })
  .chain((names) =>
    fc.tuple(...names.map(() => arbitraryOptionValues)).map((valuesArr) =>
      names.map((name, i) => ({
        name,
        position: i,
        values: valuesArr[i],
      }))
    )
  );

// Arbitrary: generate valid price (positive)
const arbitraryValidPrice = fc.double({ min: 0.01, max: 9999.99, noNaN: true });

// Arbitrary: generate valid stock (non-negative integer)
const arbitraryValidStock = fc.integer({ min: 0, max: 1000 });

// Arbitrary: generate invalid price (zero or negative)
const arbitraryInvalidPrice = fc.double({ min: -1000, max: 0, noNaN: true });

// Arbitrary: generate invalid stock (negative integer)
const arbitraryInvalidStock = fc.integer({ min: -1000, max: -1 });

// Build variants from option types with given price/stock generators
function buildVariants(
  optionTypes: { name: string; values: string[] }[],
  price: number,
  stock: number
): { optionValues: Record<string, string>; price: number; stockQuantity: number }[] {
  const valueArrays = optionTypes.map((ot) => ot.values);
  const combinations = cartesianProduct(valueArrays);

  return combinations.map((combo) => {
    const optionValues: Record<string, string> = {};
    optionTypes.forEach((ot, i) => {
      optionValues[ot.name] = combo[i] as string;
    });
    return { optionValues, price, stockQuantity: stock };
  });
}

describe('Variant CRUD Property Tests', () => {
  let vendorToken: string;
  let productId: number;
  let vendorUserId: number;

  beforeAll(async () => {
    const setup = await setupVendorWithProduct();
    vendorToken = setup.token;
    productId = setup.productId;
    vendorUserId = setup.vendorUserId;
  });

  afterAll(async () => {
    // Clean up test data
    const conn = await pool.getConnection();
    try {
      await conn.query('DELETE FROM product_variants WHERE product_id = ?', [productId]);
      await conn.query('DELETE FROM variant_option_types WHERE product_id = ?', [productId]);
      await conn.query('DELETE FROM products WHERE id = ?', [productId]);
      await conn.query('DELETE FROM vendors WHERE user_id = ?', [vendorUserId]);
      await conn.query('DELETE FROM users WHERE id = ?', [vendorUserId]);
    } finally {
      conn.release();
    }
    await pool.end();
  });

  // Feature: product-variants, Property 1: Maximum Option Types Constraint
  // **Validates: Requirements 1.3**
  it('Property 1: submitting > 3 option types is rejected', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryExcessOptionTypes, async (optionTypes) => {
        // Build valid variants for the excess option types
        const variants = buildVariants(optionTypes, 10.0, 5);

        const res = await request(app)
          .put(`${API_BASE}/vendor/products/${productId}/variants`)
          .set('Authorization', `Bearer ${vendorToken}`)
          .send({ optionTypes, variants });

        // Should be rejected with 400
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Maximum 3 option types');
      }),
      { numRuns: 100 }
    );
  });

  // Feature: product-variants, Property 3: Variant Combination Cartesian Product
  // **Validates: Requirements 2.1**
  it('Property 3: generated combinations equal V1 × V2 × ... × VN', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryValidOptionTypes, async (optionTypes) => {
        // Calculate expected count: product of all value counts
        const expectedCount = optionTypes.reduce((acc, ot) => acc * ot.values.length, 1);

        // Build all variant combinations
        const variants = buildVariants(optionTypes, 25.0, 10);

        const res = await request(app)
          .put(`${API_BASE}/vendor/products/${productId}/variants`)
          .set('Authorization', `Bearer ${vendorToken}`)
          .send({ optionTypes, variants });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');

        // Verify the number of returned variants equals the cartesian product
        expect(res.body.variants.length).toBe(expectedCount);

        // Verify each combination is unique
        const combinationStrings = res.body.variants.map((v: any) =>
          JSON.stringify(v.option_combination)
        );
        const uniqueCombinations = new Set(combinationStrings);
        expect(uniqueCombinations.size).toBe(expectedCount);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: product-variants, Property 4: Variant Price and Stock Validation
  // **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
  it('Property 4: variants with price ≤ 0 or stock < 0 are rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryValidOptionTypes,
        fc.oneof(
          // Case 1: invalid price
          fc.record({
            price: arbitraryInvalidPrice,
            stock: arbitraryValidStock,
          }),
          // Case 2: invalid stock
          fc.record({
            price: arbitraryValidPrice,
            stock: arbitraryInvalidStock,
          }),
          // Case 3: both invalid
          fc.record({
            price: arbitraryInvalidPrice,
            stock: arbitraryInvalidStock,
          })
        ),
        async (optionTypes, { price, stock }) => {
          const variants = buildVariants(optionTypes, price, stock);

          const res = await request(app)
            .put(`${API_BASE}/vendor/products/${productId}/variants`)
            .set('Authorization', `Bearer ${vendorToken}`)
            .send({ optionTypes, variants });

          // Should be rejected with 400
          expect(res.status).toBe(400);
          expect(res.body.message).toContain('variants must have a price > 0 and stock >= 0');
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: product-variants, Property 14: has_variants Flag Consistency
  // **Validates: Requirements 7.2**
  it('Property 14: has_variants flag is true after PUT and false after DELETE', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryValidOptionTypes, async (optionTypes) => {
        const variants = buildVariants(optionTypes, 15.0, 5);

        // PUT variants - should set has_variants = true
        const putRes = await request(app)
          .put(`${API_BASE}/vendor/products/${productId}/variants`)
          .set('Authorization', `Bearer ${vendorToken}`)
          .send({ optionTypes, variants });

        expect(putRes.status).toBe(200);

        // Check has_variants flag in DB
        const conn = await pool.getConnection();
        try {
          const [rows] = (await conn.query(
            'SELECT has_variants FROM products WHERE id = ?',
            [productId]
          )) as any[];
          expect(rows[0].has_variants).toBe(1); // MySQL returns 1 for true
        } finally {
          conn.release();
        }

        // DELETE variants - should set has_variants = false
        const delRes = await request(app)
          .delete(`${API_BASE}/vendor/products/${productId}/variants`)
          .set('Authorization', `Bearer ${vendorToken}`);

        expect(delRes.status).toBe(200);

        // Check has_variants flag in DB again
        const conn2 = await pool.getConnection();
        try {
          const [rows] = (await conn2.query(
            'SELECT has_variants FROM products WHERE id = ?',
            [productId]
          )) as any[];
          expect(rows[0].has_variants).toBe(0); // MySQL returns 0 for false
        } finally {
          conn2.release();
        }
      }),
      { numRuns: 100 }
    );
  });
});
