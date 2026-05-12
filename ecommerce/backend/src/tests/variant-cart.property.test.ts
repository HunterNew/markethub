// Feature: product-variants, Property 6: Zero-Stock Variant Cart Rejection
// Feature: product-variants, Property 7: Cart Variant Round-Trip
// Feature: product-variants, Property 8: Different Variants Create Separate Cart Items
// Feature: product-variants, Property 9: Same Variant Increments Quantity
// Validates: Requirements 4.1, 4.3, 4.4, 9.3

process.env.NODE_ENV = 'test';

import request from 'supertest';
import fc from 'fast-check';
import app from '../index';
import pool from '../db/pool';

const API_BASE = '/api/v1';

async function setupVendorWithVariantProduct(): Promise<{
  vendorToken: string;
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

  const conn = await pool.getConnection();
  try {
    await conn.query("UPDATE vendors SET status = 'approved' WHERE user_id = ?", [vendorUserId]);
  } finally {
    conn.release();
  }

  const prodRes = await request(app)
    .post(`${API_BASE}/products`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: `Cart Test Product ${Date.now()}`,
      description: 'A test product for cart property tests',
      price: 100,
      categoryId: 1,
      stockQuantity: 50,
    });

  const productId = prodRes.body.product?.id || prodRes.body.productId;

  const conn2 = await pool.getConnection();
  try {
    await conn2.query("UPDATE products SET status = 'active' WHERE id = ?", [productId]);
  } finally {
    conn2.release();
  }

  return { vendorToken: token, productId, vendorUserId };
}

async function setupCustomer(): Promise<{ customerToken: string; customerUserId: number }> {
  const email = `customer_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;
  const regRes = await request(app)
    .post(`${API_BASE}/auth/register`)
    .send({
      email,
      password: 'testpass123',
      role: 'customer',
      firstName: 'Test',
      lastName: 'Customer',
    });

  return { customerToken: regRes.body.token, customerUserId: regRes.body.user.id };
}

async function setupVariantsOnProduct(
  vendorToken: string,
  productId: number,
  optionTypes: { name: string; position: number; values: string[] }[],
  variants: { optionValues: Record<string, string>; price: number; stockQuantity: number }[]
): Promise<any[]> {
  const putRes = await request(app)
    .put(`${API_BASE}/vendor/products/${productId}/variants`)
    .set('Authorization', `Bearer ${vendorToken}`)
    .send({ optionTypes, variants });

  expect(putRes.status).toBe(200);
  return putRes.body.variants;
}

async function clearCart(customerToken: string): Promise<void> {
  await request(app)
    .delete(`${API_BASE}/cart`)
    .set('Authorization', `Bearer ${customerToken}`);
}

const arbitraryValidPrice = fc.integer({ min: 1, max: 999999 }).map((v) => v / 100);
const arbitraryPositiveStock = fc.integer({ min: 5, max: 100 });

function findVariantByOption(variants: any[], key: string, value: string): any {
  return variants.find((v: any) => {
    const combo = typeof v.option_combination === 'string'
      ? JSON.parse(v.option_combination)
      : v.option_combination;
    return combo[key] === value;
  });
}

describe('Variant Cart Property Tests', () => {
  let vendorToken: string;
  let productId: number;
  let vendorUserId: number;
  let customerToken: string;
  let customerUserId: number;

  beforeAll(async () => {
    const vendorSetup = await setupVendorWithVariantProduct();
    vendorToken = vendorSetup.vendorToken;
    productId = vendorSetup.productId;
    vendorUserId = vendorSetup.vendorUserId;

    const customerSetup = await setupCustomer();
    customerToken = customerSetup.customerToken;
    customerUserId = customerSetup.customerUserId;
  });

  afterAll(async () => {
    const conn = await pool.getConnection();
    try {
      await conn.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM cart WHERE user_id = ?)', [customerUserId]);
      await conn.query('DELETE FROM cart WHERE user_id = ?', [customerUserId]);
      await conn.query('DELETE FROM product_variants WHERE product_id = ?', [productId]);
      await conn.query('DELETE FROM variant_option_types WHERE product_id = ?', [productId]);
      await conn.query('DELETE FROM products WHERE id = ?', [productId]);
      await conn.query('DELETE FROM vendors WHERE user_id = ?', [vendorUserId]);
      await conn.query('DELETE FROM users WHERE id IN (?, ?)', [vendorUserId, customerUserId]);
    } finally {
      conn.release();
    }
    await pool.end();
  });

  it('Property 6: adding a zero-stock variant to cart fails', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryValidPrice, async (price) => {
        const optionTypes = [{ name: 'size', position: 0, values: ['S', 'M'] }];
        const variants = [
          { optionValues: { size: 'S' }, price, stockQuantity: 0 },
          { optionValues: { size: 'M' }, price, stockQuantity: 10 },
        ];

        const created = await setupVariantsOnProduct(vendorToken, productId, optionTypes, variants);
        const zeroStock = findVariantByOption(created, 'size', 'S');
        expect(zeroStock).toBeDefined();

        await clearCart(customerToken);

        const cartRes = await request(app)
          .post(`${API_BASE}/cart/items`)
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ productId, variantId: zeroStock.id, quantity: 1 });

        expect(cartRes.status).toBe(400);
        expect(cartRes.body.message).toContain('out of stock');

        const getCartRes = await request(app)
          .get(`${API_BASE}/cart`)
          .set('Authorization', `Bearer ${customerToken}`);

        const items = getCartRes.body.items.filter((i: any) => i.product_id === productId);
        expect(items.length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 7: cart returns correct variant_id and price', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryValidPrice, arbitraryPositiveStock, async (price, stock) => {
        const optionTypes = [{ name: 'color', position: 0, values: ['RED', 'BLUE'] }];
        const variants = [
          { optionValues: { color: 'RED' }, price, stockQuantity: stock },
          { optionValues: { color: 'BLUE' }, price: price + 1, stockQuantity: stock },
        ];

        const created = await setupVariantsOnProduct(vendorToken, productId, optionTypes, variants);
        const target = findVariantByOption(created, 'color', 'RED');
        expect(target).toBeDefined();

        await clearCart(customerToken);

        const addRes = await request(app)
          .post(`${API_BASE}/cart/items`)
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ productId, variantId: target.id, quantity: 1 });
        expect(addRes.status).toBe(200);

        const getCartRes = await request(app)
          .get(`${API_BASE}/cart`)
          .set('Authorization', `Bearer ${customerToken}`);
        expect(getCartRes.status).toBe(200);

        const cartItem = getCartRes.body.items.find(
          (i: any) => i.product_id === productId && i.variant_id === target.id
        );
        expect(cartItem).toBeDefined();
        expect(cartItem.variant_id).toBe(target.id);
        expect(Number(cartItem.unit_price)).toBeCloseTo(price, 2);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 8: different variants create separate cart items', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryValidPrice, arbitraryPositiveStock, async (price, stock) => {
        const optionTypes = [{ name: 'weight', position: 0, values: ['1KG', '2KG'] }];
        const variants = [
          { optionValues: { weight: '1KG' }, price, stockQuantity: stock },
          { optionValues: { weight: '2KG' }, price: price + 5, stockQuantity: stock },
        ];

        const created = await setupVariantsOnProduct(vendorToken, productId, optionTypes, variants);
        const varA = findVariantByOption(created, 'weight', '1KG');
        const varB = findVariantByOption(created, 'weight', '2KG');
        expect(varA).toBeDefined();
        expect(varB).toBeDefined();

        await clearCart(customerToken);

        const addA = await request(app)
          .post(`${API_BASE}/cart/items`)
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ productId, variantId: varA.id, quantity: 1 });
        expect(addA.status).toBe(200);

        const addB = await request(app)
          .post(`${API_BASE}/cart/items`)
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ productId, variantId: varB.id, quantity: 1 });
        expect(addB.status).toBe(200);

        const getCartRes = await request(app)
          .get(`${API_BASE}/cart`)
          .set('Authorization', `Bearer ${customerToken}`);
        expect(getCartRes.status).toBe(200);

        const items = getCartRes.body.items.filter((i: any) => i.product_id === productId);
        expect(items.length).toBe(2);

        const vIds = items.map((i: any) => i.variant_id);
        expect(vIds).toContain(varA.id);
        expect(vIds).toContain(varB.id);
        expect(new Set(items.map((i: any) => i.id)).size).toBe(2);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 9: adding same variant twice merges quantity', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryValidPrice,
        fc.integer({ min: 10, max: 100 }),
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 1, max: 3 }),
        async (price, stock, qty1, qty2) => {
          const optionTypes = [{ name: 'material', position: 0, values: ['WOOD', 'METAL'] }];
          const variants = [
            { optionValues: { material: 'WOOD' }, price, stockQuantity: stock },
            { optionValues: { material: 'METAL' }, price: price + 2, stockQuantity: stock },
          ];

          const created = await setupVariantsOnProduct(vendorToken, productId, optionTypes, variants);
          const target = findVariantByOption(created, 'material', 'WOOD');
          expect(target).toBeDefined();

          await clearCart(customerToken);

          const add1 = await request(app)
            .post(`${API_BASE}/cart/items`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ productId, variantId: target.id, quantity: qty1 });
          expect(add1.status).toBe(200);

          const add2 = await request(app)
            .post(`${API_BASE}/cart/items`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ productId, variantId: target.id, quantity: qty2 });
          expect(add2.status).toBe(200);

          const getCartRes = await request(app)
            .get(`${API_BASE}/cart`)
            .set('Authorization', `Bearer ${customerToken}`);
          expect(getCartRes.status).toBe(200);

          const items = getCartRes.body.items.filter(
            (i: any) => i.product_id === productId && i.variant_id === target.id
          );
          expect(items.length).toBe(1);

          const expectedQty = Math.min(qty1 + qty2, stock);
          expect(items[0].quantity).toBe(expectedQty);
        }
      ),
      { numRuns: 100 }
    );
  });
});