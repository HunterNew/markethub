// Feature: product-variants, Property 10: Order Variant Snapshot Persistence
// Feature: product-variants, Property 11: Order Placement Deducts Variant Stock
// Feature: product-variants, Property 12: Order Rejects Excess Quantity
// Validates: Requirements 5.2, 9.1, 9.2

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
      name: `Order Test Product ${Date.now()}`,
      description: 'A test product for order property tests',
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

async function addToCart(customerToken: string, productId: number, variantId: number, quantity: number): Promise<any> {
  return request(app)
    .post(`${API_BASE}/cart/items`)
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ productId, variantId, quantity });
}

async function placeOrder(customerToken: string): Promise<any> {
  return request(app)
    .post(`${API_BASE}/orders`)
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      shippingAddress: { street: '123 Test St', city: 'Testville', state: 'TS', zip: '12345', country: 'US' },
      paymentMethod: 'cod',
    });
}

async function getVariantStock(variantId: number): Promise<number> {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT stock_quantity FROM product_variants WHERE id = ?', [variantId]) as any[];
    return rows.length > 0 ? rows[0].stock_quantity : 0;
  } finally {
    conn.release();
  }
}

function findVariantByOption(variants: any[], key: string, value: string): any {
  return variants.find((v: any) => {
    const combo = typeof v.option_combination === 'string'
      ? JSON.parse(v.option_combination)
      : v.option_combination;
    return combo[key] === value;
  });
}

const arbitraryValidPrice = fc.integer({ min: 100, max: 99999 }).map((v) => v / 100);
const arbitraryStock = fc.integer({ min: 5, max: 50 });

describe('Variant Order Property Tests', () => {
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
      await conn.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)', [customerUserId]);
      await conn.query('DELETE FROM order_status_log WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)', [customerUserId]);
      await conn.query('DELETE FROM orders WHERE user_id = ?', [customerUserId]);
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

  it('Property 10: order variant snapshot matches variant state at order time', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryValidPrice, arbitraryStock, async (price, stock) => {
        const optionTypes = [{ name: 'size', position: 0, values: ['S', 'M'] }];
        const variants = [
          { optionValues: { size: 'S' }, price, stockQuantity: stock },
          { optionValues: { size: 'M' }, price: price + 5, stockQuantity: stock },
        ];

        const created = await setupVariantsOnProduct(vendorToken, productId, optionTypes, variants);
        const target = findVariantByOption(created, 'size', 'S');
        expect(target).toBeDefined();

        await clearCart(customerToken);
        const addRes = await addToCart(customerToken, productId, target.id, 1);
        expect(addRes.status).toBe(200);

        const orderRes = await placeOrder(customerToken);
        expect(orderRes.status).toBe(201);

        const orderId = orderRes.body.orderId;
        const detailRes = await request(app)
          .get(`${API_BASE}/orders/${orderId}`)
          .set('Authorization', `Bearer ${customerToken}`);
        expect(detailRes.status).toBe(200);

        const orderItem = detailRes.body.order.items.find(
          (i: any) => i.product_id === productId && i.variant_id === target.id
        );
        expect(orderItem).toBeDefined();
        expect(orderItem.variant_snapshot).toBeDefined();

        const snapshot = typeof orderItem.variant_snapshot === 'string'
          ? JSON.parse(orderItem.variant_snapshot)
          : orderItem.variant_snapshot;

        expect(snapshot.size).toBe('S');
        expect(snapshot.price).toBeCloseTo(price, 2);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 11: order placement deducts variant stock by ordered quantity', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryValidPrice,
        fc.integer({ min: 10, max: 50 }),
        fc.integer({ min: 1, max: 5 }),
        async (price, stock, qty) => {
          const optionTypes = [{ name: 'color', position: 0, values: ['RED', 'BLUE'] }];
          const variants = [
            { optionValues: { color: 'RED' }, price, stockQuantity: stock },
            { optionValues: { color: 'BLUE' }, price: price + 2, stockQuantity: stock },
          ];

          const created = await setupVariantsOnProduct(vendorToken, productId, optionTypes, variants);
          const target = findVariantByOption(created, 'color', 'RED');
          expect(target).toBeDefined();

          const stockBefore = await getVariantStock(target.id);
          expect(stockBefore).toBe(stock);

          await clearCart(customerToken);
          const addRes = await addToCart(customerToken, productId, target.id, qty);
          expect(addRes.status).toBe(200);

          const orderRes = await placeOrder(customerToken);
          expect(orderRes.status).toBe(201);

          const stockAfter = await getVariantStock(target.id);
          expect(stockAfter).toBe(stock - qty);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 12: order rejects quantity exceeding variant stock', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryValidPrice,
        fc.integer({ min: 1, max: 3 }),
        async (price, stock) => {
          const excessQty = stock + 1;

          const optionTypes = [{ name: 'weight', position: 0, values: ['1KG', '2KG'] }];
          const variants = [
            { optionValues: { weight: '1KG' }, price, stockQuantity: stock },
            { optionValues: { weight: '2KG' }, price: price + 3, stockQuantity: 50 },
          ];

          const created = await setupVariantsOnProduct(vendorToken, productId, optionTypes, variants);
          const target = findVariantByOption(created, 'weight', '1KG');
          expect(target).toBeDefined();

          await clearCart(customerToken);

          // Add excess quantity directly via DB to bypass cart stock cap
          const conn = await pool.getConnection();
          try {
            const [carts] = await conn.query('SELECT id FROM cart WHERE user_id = ?', [customerUserId]) as any[];
            let cartId: number;
            if (carts.length > 0) {
              cartId = carts[0].id;
            } else {
              const [result] = await conn.query('INSERT INTO cart (user_id) VALUES (?)', [customerUserId]) as any[];
              cartId = result.insertId;
            }
            await conn.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
            await conn.query(
              'INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
              [cartId, productId, target.id, excessQty, price]
            );
          } finally {
            conn.release();
          }

          const stockBefore = await getVariantStock(target.id);

          const orderRes = await placeOrder(customerToken);
          expect(orderRes.status).toBe(400);
          expect(orderRes.body.message).toContain('Insufficient stock for variant');

          // Stock should remain unchanged
          const stockAfter = await getVariantStock(target.id);
          expect(stockAfter).toBe(stockBefore);
        }
      ),
      { numRuns: 100 }
    );
  });
});
