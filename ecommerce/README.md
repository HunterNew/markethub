# 🛒 MarketHub — Multi-Vendor eCommerce Platform

A full-stack multi-vendor eCommerce platform built with **React + Vite**, **Node.js/Express**, and **MySQL**. Mirrors the functionality of Amazon/Flipkart with three distinct user roles.

---

## 🏗️ Architecture

```
frontend/     React 18 + Vite + TypeScript + Tailwind CSS
backend/      Express + TypeScript + MySQL2
```

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, React Router v6 |
| Backend | Node.js, Express, TypeScript |
| Database | MySQL 8+ |
| Auth | JWT (24h expiry), bcrypt (cost 10) |
| Payments | Stripe, Razorpay, Cash on Delivery |

---

## 👥 User Roles

| Role | Capabilities |
|------|-------------|
| **Customer** | Browse, search, cart, checkout, track orders, coupons |
| **Vendor** | Manage products, orders, coupons, withdrawals, CSV import |
| **Admin** | Approve vendors/products, commissions, reports, settings |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8+

### 1. Clone and install
```bash
git clone <repo>
cd multivendor-ecommerce

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Configure environment
```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials and JWT secret
```

### 3. Setup database
```bash
cd backend
npm run migrate    # Creates DB + all tables
npm run seed       # Seeds demo data
```

### 4. Start development servers
```bash
# Terminal 1 — Backend (port 5000)
cd backend && npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend && npm run dev
```

Open **http://localhost:5173**

---

## 🔐 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@marketplace.com | admin123 |
| Vendor 1 | vendor1@shop.com | vendor123 |
| Vendor 2 | vendor2@boutique.com | vendor123 |
| Customer | customer1@email.com | customer123 |

---

## 📋 Features Implemented

### ✅ Core Platform
- [x] JWT authentication (register/login/role guards)
- [x] Three-role RBAC (Customer, Vendor, Admin)
- [x] Vendor registration → Admin approval workflow
- [x] Product creation → Admin approval workflow
- [x] Soft deletes for products

### ✅ Storefront
- [x] Product listing with search, category, price range filters
- [x] Pagination (20 items/page)
- [x] Product detail with images gallery
- [x] Vendor store public pages
- [x] Homepage sections (Featured, New Arrivals, Best Sellers, On Sale)

### ✅ Shopping & Checkout
- [x] Persistent cart (DB-backed for authenticated users)
- [x] Wholesale price switching based on quantity
- [x] Stock cap enforcement
- [x] Multi-step checkout (Address → Payment → Review)
- [x] Stripe / Razorpay / Cash on Delivery
- [x] Coupon code application

### ✅ Order Management
- [x] Order placement with commission calculation
- [x] Tax calculation (per-product rates or default)
- [x] Stock decrement + out_of_stock flagging
- [x] Order status timeline/audit log
- [x] Customer order cancellation + refund initiation

### ✅ Vendor Dashboard
- [x] Product CRUD with wholesale pricing
- [x] CSV bulk import with per-row error reporting
- [x] CSV template download
- [x] Order management (mark shipped/delivered)
- [x] Coupon creation and management
- [x] Product-level offers (sale prices with dates)
- [x] Earnings overview + withdrawal requests

### ✅ Admin Dashboard
- [x] Vendor approval/rejection with reasons
- [x] Product approval/rejection queue with preview
- [x] Feature/unfeature products
- [x] All orders with manual status override
- [x] Commission reports (per-vendor)
- [x] Vendor performance reports
- [x] Top 10 products report
- [x] Tax configuration (enable/disable, named rates)
- [x] Wholesale settings (global toggle, visibility)
- [x] Homepage section toggles
- [x] Withdrawal management

### ✅ Advanced Features
- [x] Wholesale pricing with eligibility checks
- [x] Tax snapshots on orders and order items
- [x] Commission snapshots at order creation
- [x] Search autocomplete (debounced 300ms)
- [x] Recent search history (DB + localStorage fallback)
- [x] Sale badges and offer prices

---

## 📡 API Reference

All endpoints at `/api/v1/`. Protected routes require `Authorization: Bearer <token>`.

### Auth
```
POST /auth/register     Public  Register Customer or Vendor
POST /auth/login        Public  Login, returns JWT
GET  /auth/me           Any     Get current user profile
```

### Products
```
GET  /products                  Public    Paginated product listing
GET  /products/:id              Public    Product detail
GET  /products/featured         Public    Featured products
GET  /products/new-arrivals     Public    New arrivals
GET  /products/best-sellers     Public    Best sellers
GET  /products/on-sale          Public    Products with active offers
POST /products                  Vendor    Create product
PUT  /products/:id              Vendor    Update product
DELETE /products/:id            Vendor    Soft delete
GET  /vendor/products/mine      Vendor    Own products
```

### Orders
```
POST /orders            Customer  Place order
GET  /orders/my         Customer  Own orders
GET  /orders/vendor     Vendor    Vendor's orders
GET  /orders            Admin     All orders
GET  /orders/:id        Any       Order detail
PUT  /orders/:id/status Any       Update status
POST /orders/:id/cancel Customer  Cancel order
```

### Admin
```
GET   /admin/vendors              List vendors (filter by status)
PATCH /admin/vendors/:id/approve  Approve vendor
PATCH /admin/vendors/:id/reject   Reject vendor
GET   /admin/products             Product approval queue
PATCH /admin/products/:id/approve Approve product
PATCH /admin/products/:id/reject  Reject product
GET   /admin/reports/summary      Dashboard metrics
GET   /admin/reports/sales        Sales report
GET   /admin/reports/top-products Top products
GET   /admin/reports/vendors      Vendor performance
GET   /admin/settings             All platform settings
PUT   /admin/settings/:key        Update setting
```

---

## 🗄️ Database Schema

20+ tables including:
`users`, `vendors`, `categories`, `products`, `product_images`, `cart`, `cart_items`, `orders`, `order_items`, `order_status_log`, `commissions`, `withdrawals`, `tax_config`, `platform_settings`, `coupons`, `product_offers`, `featured_products`, `search_history`

---

## 🔧 Environment Variables

```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=yourpassword
DB_NAME=multivendor_ecommerce
JWT_SECRET=your-super-secret-key
STRIPE_SECRET_KEY=sk_test_...
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
FRONTEND_URL=http://localhost:5173
```

---

## 🧪 Testing

Property-based tests use **fast-check** (54 properties defined in design doc).

```bash
cd backend
npm test                           # All tests
npm run test:properties            # Property tests only
```

Tag format: `// Feature: react-multivendor-ecommerce, Property N: <text>`

---

## 📁 Project Structure

```
multivendor-ecommerce/
├── backend/
│   └── src/
│       ├── db/
│       │   ├── migrations/     SQL migration files
│       │   ├── migrate.ts      Migration runner
│       │   ├── seed.ts         Seed data
│       │   └── pool.ts         DB connection pool
│       ├── middleware/
│       │   └── auth.ts         JWT + role guards
│       ├── routes/
│       │   ├── auth.ts         Authentication
│       │   ├── products.ts     Products + storefront
│       │   ├── cart.ts         Cart management
│       │   ├── orders.ts       Orders
│       │   ├── admin.ts        Admin endpoints
│       │   ├── vendor.ts       Vendor endpoints
│       │   └── categories.ts   Categories + search
│       └── index.ts            Express app entry
├── frontend/
│   └── src/
│       ├── api/client.ts       Axios instance
│       ├── context/            Auth + Cart contexts
│       ├── components/
│       │   ├── layout/         Header, Footer, Sidebars
│       │   ├── ui/             Shared UI components
│       │   └── storefront/     ProductCard etc.
│       ├── pages/
│       │   ├── Home.tsx        Homepage
│       │   ├── Products.tsx    Product listing
│       │   ├── ProductDetail   Product detail
│       │   ├── Cart.tsx        Cart
│       │   ├── Checkout.tsx    Checkout
│       │   ├── auth/           Login/Register
│       │   ├── customer/       Customer dashboard
│       │   ├── vendor/         Vendor dashboard
│       │   └── admin/          Admin dashboard
│       ├── utils/helpers.ts    Formatting utilities
│       └── App.tsx             Router + routes
└── package.json                Monorepo root
```
