import bcrypt from 'bcrypt';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/postgres',
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    console.log('🌱 Seeding database...');

    // Clear all data in reverse dependency order
    console.log('🗑️  Clearing existing data...');
    const tables = [
      'commissions', 'order_items', 'order_status_log', 'orders',
      'cart_items', 'cart', 'featured_products', 'product_images',
      'product_offers', 'products', 'coupons', 'withdrawals',
      'vendors', 'users', 'categories', 'tax_config', 'search_history',
    ];
    for (const table of tables) {
      try {
        await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
      } catch {
        // Table might not exist yet
      }
    }

    const adminHash = await bcrypt.hash('admin123', 10);
    const vendorHash = await bcrypt.hash('vendor123', 10);
    const customerHash = await bcrypt.hash('customer123', 10);

    // Users - use explicit IDs to ensure FK references work
    await client.query(
      `INSERT INTO users (id, email, password_hash, role, first_name, last_name, wholesale_eligible) VALUES
      (1, $1, $2, 'admin', 'Admin', 'User', false),
      (2, $3, $4, 'vendor', 'Alice', 'Smith', false),
      (3, $5, $6, 'vendor', 'Bob', 'Johnson', false),
      (4, $7, $8, 'customer', 'Carol', 'Williams', true),
      (5, $9, $10, 'customer', 'David', 'Brown', false)
      ON CONFLICT (email) DO NOTHING`,
      [
        'admin@marketplace.com', adminHash,
        'vendor1@shop.com', vendorHash,
        'vendor2@boutique.com', vendorHash,
        'customer1@email.com', customerHash,
        'customer2@email.com', customerHash,
      ]
    );

    // Reset user sequence
    await client.query(`SELECT setval('users_id_seq', 5, true)`);

    // Vendors
    await client.query(
      `INSERT INTO vendors (user_id, store_name, store_slug, description, contact_email, status, commission_rate) VALUES
      (2, 'Alice Electronics', 'alice-electronics', 'Premium electronics and gadgets store', 'vendor1@shop.com', 'approved', NULL),
      (3, 'Bob Fashion', 'bob-fashion', 'Trendy clothing and accessories', 'vendor2@boutique.com', 'approved', 8.00)
      ON CONFLICT DO NOTHING`
    );

    // Categories
    await client.query(
      `INSERT INTO categories (name, slug, description, image_url) VALUES
      ('Electronics', 'electronics', 'Gadgets, devices, and tech accessories', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200'),
      ('Clothing', 'clothing', 'Fashion for men, women, and kids', 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=200'),
      ('Books', 'books', 'Educational and entertainment books', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200'),
      ('Home & Garden', 'home-garden', 'Home decor and gardening supplies', 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200'),
      ('Sports', 'sports', 'Sports equipment and fitness gear', 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=200'),
      ('Beauty', 'beauty', 'Skincare, makeup, and personal care', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200'),
      ('Toys', 'toys', 'Toys and games for all ages', 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=200'),
      ('Food & Grocery', 'food-grocery', 'Fresh and packaged food items', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200')
      ON CONFLICT (slug) DO NOTHING`
    );

    // Tax config
    await client.query(
      `INSERT INTO tax_config (name, rate, is_default) VALUES
      ('Standard Rate', 18.00, true),
      ('Reduced Rate', 5.00, false)
      ON CONFLICT DO NOTHING`
    );

    // Products for vendor 1
    await client.query(
      `INSERT INTO products (vendor_id, category_id, name, description, price, stock_quantity, status, wholesale_enabled, wholesale_price, wholesale_min_qty) VALUES
      (1, 1, 'Wireless Bluetooth Headphones Pro', 'Premium ANC headphones with 40-hour battery life, hi-fi audio, and foldable design.', 2999.00, 50, 'active', true, 2499.00, 5),
      (1, 1, 'Smart Watch Series X', 'Advanced smartwatch with health monitoring, GPS, AMOLED display, and 7-day battery.', 8999.00, 30, 'active', false, NULL, NULL),
      (1, 1, 'USB-C Fast Charger 65W GaN', 'Ultra-compact GaN charger for laptop, phone, and tablet.', 1299.00, 200, 'active', true, 999.00, 10),
      (1, 1, 'Mechanical Gaming Keyboard RGB', 'Tactile mechanical switches, per-key RGB, N-key rollover, and aluminum frame.', 4499.00, 45, 'active', false, NULL, NULL),
      (1, 1, 'Noise Cancelling Earbuds TWS', 'True wireless earbuds with ANC, 30-hour playtime, and IPX5 water resistance.', 1999.00, 100, 'active', false, NULL, NULL)
      ON CONFLICT DO NOTHING`
    );

    // Products for vendor 2
    await client.query(
      `INSERT INTO products (vendor_id, category_id, name, description, price, stock_quantity, status) VALUES
      (2, 2, 'Classic Oxford Cotton Shirt', '100% premium Egyptian cotton, formal cut, non-iron finish.', 1499.00, 150, 'active'),
      (2, 2, 'Slim Fit Denim Jeans', 'Sustainable denim, slim fit, stretch fabric for maximum comfort.', 2199.00, 80, 'active'),
      (2, 2, 'Women''s Floral Wrap Dress', 'Elegant floral pattern, midi length, adjustable wrap design.', 1899.00, 60, 'active'),
      (2, 2, 'Leather Crossbody Bag', 'Genuine leather, spacious compartments, adjustable strap.', 3499.00, 40, 'active'),
      (2, 3, 'Full Stack Development Guide', 'Comprehensive guide covering React, Node.js, MySQL, and deployment.', 599.00, 500, 'active')
      ON CONFLICT DO NOTHING`
    );

    // Product images
    await client.query(
      `INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES
      (1, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600', true, 0),
      (2, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600', true, 0),
      (3, 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600', true, 0),
      (4, 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=600', true, 0),
      (5, 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600', true, 0),
      (6, 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600', true, 0),
      (7, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600', true, 0),
      (8, 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600', true, 0),
      (9, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600', true, 0),
      (10, 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600', true, 0)
      ON CONFLICT DO NOTHING`
    );

    // Featured products
    await client.query(
      `INSERT INTO featured_products (product_id) VALUES (1), (2), (4), (8)
      ON CONFLICT DO NOTHING`
    );

    // Sample order
    await client.query(
      `INSERT INTO orders (id, user_id, status, payment_method, payment_status, subtotal, tax_amount, total, shipping_address) VALUES
      (1, 4, 'delivered', 'cod', 'pending', 2999.00, 0, 2999.00, '{"name":"Carol Williams","address":"123 Main St","city":"Mumbai","state":"Maharashtra","pincode":"400001","phone":"9876543210"}')
      ON CONFLICT DO NOTHING`
    );

    await client.query(
      `INSERT INTO order_items (order_id, product_id, vendor_id, product_name, unit_price, quantity) VALUES
      (1, 1, 1, 'Wireless Bluetooth Headphones Pro', 2999.00, 1)
      ON CONFLICT DO NOTHING`
    );

    await client.query(
      `INSERT INTO commissions (order_id, vendor_id, order_total, commission_rate, commission_amount) VALUES
      (1, 1, 2999.00, 10.00, 299.90)
      ON CONFLICT DO NOTHING`
    );

    console.log('✅ Database seeded successfully!');
    console.log('\n📋 Login credentials:');
    console.log('  Admin:    admin@marketplace.com / admin123');
    console.log('  Vendor 1: vendor1@shop.com / vendor123');
    console.log('  Vendor 2: vendor2@boutique.com / vendor123');
    console.log('  Customer: customer1@email.com / customer123');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    process.exit(0);
  }
}

seed();
