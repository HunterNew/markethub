// Feature: product-variants, Property 5: Variant Selection Determines Price and Stock
// Validates: Requirements 3.2, 3.3

process.env.NODE_ENV = 'test';

import request from 'supertest';
import fc from 'fast-check';
import app from '../index';
import pool from '../db/pool';

const API_BASE = '/api/v1';

// Helper: register a vendor, approve, and create a product
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

  // Create a product (status must be active for public detail endpoint)
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

  // Activate the product directly in DB so it shows on public endpoint
  const conn2 = await pool.getConnection();
  try {
    await conn2.query("UPDATE products SET status = 'active' WHERE id = ?", [productId]);
  } finally {
    conn2.release();
  }

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
  { minLength: 1, maxLength: 3 }
);

// Arbitrary: generate 1-3 valid option types with values
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

// Arbitrary: generate a valid price (positive, rounded to 2 decimals)
const arbitraryValidPrice = fc.integer({ min: 1, max: 999999 }).map((v) => v / 100);

// Arbitrary: generate a valid stock quantity (non-negative integer)
const arbitraryValidStock = fc.integer({ min: 0, max: 1000 });

// Build variants from option types with individual random prices and stock
function buildVariantsWithRandomPricesAndStock(
  optionTypes: { name: string; values: string[] }[],
  prices: number[],
  stocks: number[]
): { optionValues: Record<string, string>; price: number; stockQuantity: number }[] {
  const valueArrays = optionTypes.map((ot) => ot.values);
  const combinations = cartesianProduct(valueArrays);

  return combinations.map((combo, idx) => {
    const optionValues: Record<string, string> = {};
    optionTypes.forEach((ot, i) => {
      optionValues[ot.name] = combo[i] as string;
    });
    return {
      optionValues,
      price: prices[idx % prices.length],
      stockQuantity: stocks[idx % stocks.length],
    };
  });
}

describe('Variant Product Detail Property Tests', () => {
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

  // Feature: product-variants, Property 5: Variant Selection Determines Price and Stock
  // **Validates: Requirements 3.2, 3.3**
  it('Property 5: API returns correct price and stock_quantity per variant', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryValidOptionTypes,
        fc.array(arbitraryValidPrice, { minLength: 1, maxLength: 20 }),
        fc.array(arbitraryValidStock, { minLength: 1, maxLength: 20 }),
        async (optionTypes, prices, stocks) => {
          // Build variant combinations with individual prices and stock
          const variants = buildVariantsWithRandomPricesAndStock(optionTypes, prices, stocks);

          // Set up variants via PUT endpoint
          const putRes = await request(app)
            .put(`${API_BASE}/vendor/products/${productId}/variants`)
            .set('Authorization', `Bearer ${vendorToken}`)
            .send({ optionTypes, variants });

          expect(putRes.status).toBe(200);
          expect(putRes.body.status).toBe('success');

          // Call public product detail endpoint
          const detailRes = await request(app).get(`${API_BASE}/products/${productId}`);

          expect(detailRes.status).toBe(200);
          expect(detailRes.body.status).toBe('success');

          const product = detailRes.body.product;

          // Verify has_variants is true
          expect(product.has_variants).toBe(1);

          // Verify variants are returned
          expect(product.variants).toBeDefined();
          expect(product.variants.length).toBe(variants.length);

          // For each variant returned, verify price and stock_quantity match what was submitted
          for (const submittedVariant of variants) {
            const matchingReturnedVariant = product.variants.find((rv: any) => {
              const combo =
                typeof rv.option_combination === 'string'
                  ? JSON.parse(rv.option_combination)
                  : rv.option_combination;
              // Check all option values match
              return Object.entries(submittedVariant.optionValues).every(
                ([key, val]) => combo[key] === val
              );
            });

            expect(matchingReturnedVariant).toBeDefined();
            expect(Number(matchingReturnedVariant.price)).toBeCloseTo(
              submittedVariant.price,
              2
            );
            expect(matchingReturnedVariant.stock_quantity).toBe(
              submittedVariant.stockQuantity
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
