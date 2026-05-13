# MarketHub — Testing Checklist & Future Requirements

## Testing Checklist

### 1. Authentication & Users

| # | Test Case | Status |
|---|-----------|--------|
| 1.1 | Customer registration with valid data | ☐ |
| 1.2 | Vendor registration with store name | ☐ |
| 1.3 | Login with correct credentials | ☐ |
| 1.4 | Login with wrong password shows error | ☐ |
| 1.5 | JWT token expires after 24h | ☐ |
| 1.6 | Protected routes redirect to login | ☐ |
| 1.7 | Role-based access (customer can't access vendor pages) | ☐ |
| 1.8 | Role-based access (vendor can't access admin pages) | ☐ |
| 1.9 | Profile update (name, phone) | ☐ |
| 1.10 | Address add/edit/delete/set default | ☐ |
| 1.11 | Forgot password - valid email sends reset link | ☐ |
| 1.12 | Forgot password - invalid email shows "create account" message | ☐ |
| 1.13 | Reset password - valid token allows password change | ☐ |
| 1.14 | Reset password - expired/invalid token shows error | ☐ |
| 1.15 | Reset password - redirects to login after success | ☐ |

### 2. Product Browsing (Customer)

| # | Test Case | Status |
|---|-----------|--------|
| 2.1 | Homepage loads featured products | ☐ |
| 2.2 | Homepage loads on-sale products | ☐ |
| 2.3 | Category grid shows all categories with images | ☐ |
| 2.4 | Products page shows all active products | ☐ |
| 2.5 | Filter by category works | ☐ |
| 2.6 | Filter by price range (min only) | ☐ |
| 2.7 | Filter by price range (min + max) | ☐ |
| 2.8 | Sort by newest/price asc/price desc/popular | ☐ |
| 2.9 | Search by product name | ☐ |
| 2.10 | Search suggestions appear while typing | ☐ |
| 2.11 | Pagination works correctly | ☐ |
| 2.12 | Product detail page shows all info | ☐ |
| 2.13 | Product images carousel/slider works | ☐ |
| 2.14 | Reviews display on product page | ☐ |
| 2.15 | Vendor store page shows vendor products | ☐ |

### 3. Product Variants

| # | Test Case | Status |
|---|-----------|--------|
| 3.1 | Variant selector shows on product with variants | ☐ |
| 3.2 | Selecting variant updates displayed price | ☐ |
| 3.3 | Selecting variant updates stock display | ☐ |
| 3.4 | Out-of-stock variant shows OOS badge and is disabled | ☐ |
| 3.5 | "Add to Cart" disabled until variant selected | ☐ |
| 3.6 | Price range shows when no variant selected | ☐ |
| 3.7 | Product card shows variant price range in listing | ☐ |
| 3.8 | Product card hides quick "Add to Cart" for variant products | ☐ |

### 4. Wholesale Pricing

| # | Test Case | Status |
|---|-----------|--------|
| 4.1 | Wholesale info shows on product page when enabled | ☐ |
| 4.2 | Price updates when qty meets wholesale minimum | ☐ |
| 4.3 | Wholesale discount applied to variant price correctly | ☐ |
| 4.4 | Cart shows "Wholesale applied" badge when qty qualifies | ☐ |
| 4.5 | Cart shows "Add X more for wholesale" hint | ☐ |
| 4.6 | Increasing qty in cart triggers wholesale price recalculation | ☐ |
| 4.7 | Decreasing qty below minimum removes wholesale discount | ☐ |
| 4.8 | Checkout shows correct wholesale-discounted total | ☐ |

### 5. Cart (Guest)

| # | Test Case | Status |
|---|-----------|--------|
| 5.1 | Add product to guest cart (localStorage) | ☐ |
| 5.2 | Add variant product to guest cart stores variant info | ☐ |
| 5.3 | Cart page shows variant details (e.g., "Storage: 256GB") | ☐ |
| 5.4 | Cart shows correct variant price | ☐ |
| 5.5 | Increase/decrease quantity works | ☐ |
| 5.6 | Remove item from cart | ☐ |
| 5.7 | Clear cart | ☐ |
| 5.8 | Guest cart syncs to server after login | ☐ |
| 5.9 | Different variants create separate cart items | ☐ |

### 6. Cart (Logged-in Customer)

| # | Test Case | Status |
|---|-----------|--------|
| 6.1 | Add product to cart (API) | ☐ |
| 6.2 | Add variant product requires variant selection | ☐ |
| 6.3 | Cart shows variant option_combination | ☐ |
| 6.4 | Same variant added twice merges quantity | ☐ |
| 6.5 | Different variants = separate cart items | ☐ |
| 6.6 | Quantity capped at available stock | ☐ |
| 6.7 | Zero-stock variant rejected | ☐ |
| 6.8 | Coupon code apply/remove works | ☐ |
| 6.9 | Coupon min order amount validation | ☐ |

### 7. Checkout & Orders

| # | Test Case | Status |
|---|-----------|--------|
| 7.1 | Checkout step 1: address selection/entry | ☐ |
| 7.2 | Checkout step 2: payment method selection | ☐ |
| 7.3 | Checkout step 3: review shows items with variant info | ☐ |
| 7.4 | Review shows delivery address | ☐ |
| 7.5 | Review shows price breakdown (subtotal, discount, shipping, total) | ☐ |
| 7.6 | Place order (COD) succeeds | ☐ |
| 7.7 | Order deducts variant stock (not product stock) | ☐ |
| 7.8 | Order stores variant_snapshot | ☐ |
| 7.9 | Order rejects if qty > variant stock | ☐ |
| 7.10 | Coupon discount applied to order total | ☐ |
| 7.11 | Cart cleared after order placed | ☐ |
| 7.12 | Customer can view order history | ☐ |
| 7.13 | Customer can cancel confirmed order | ☐ |

### 8. Vendor Panel

| # | Test Case | Status |
|---|-----------|--------|
| 8.1 | Vendor dashboard shows stats | ☐ |
| 8.2 | Add new product | ☐ |
| 8.3 | Edit existing product | ☐ |
| 8.4 | Delete product | ☐ |
| 8.5 | Upload product image | ☐ |
| 8.6 | Enable variants on product | ☐ |
| 8.7 | Add option types (max 3) | ☐ |
| 8.8 | Generate variant combinations | ☐ |
| 8.9 | Set price/stock per variant | ☐ |
| 8.10 | Save variants persists to DB | ☐ |
| 8.11 | Category suggestions load for variants | ☐ |
| 8.12 | CSV import with ₹ prices | ☐ |
| 8.13 | CSV import with image filenames from vendor folder | ☐ |
| 8.14 | CSV import with full image URLs | ☐ |
| 8.15 | View orders with full details (customer, address, items, variant info) | ☐ |
| 8.16 | Mark order shipped/delivered | ☐ |
| 8.17 | Create/manage coupons | ☐ |
| 8.18 | Wholesale pricing setup | ☐ |

### 9. Admin Panel

| # | Test Case | Status |
|---|-----------|--------|
| 9.1 | Admin dashboard shows platform stats | ☐ |
| 9.2 | Approve/reject vendor applications | ☐ |
| 9.3 | View all orders with full details | ☐ |
| 9.4 | Update order status | ☐ |
| 9.5 | View all products (indicate which have variants) | ☐ |
| 9.6 | Manage platform settings (tax, wholesale) | ☐ |
| 9.7 | Commission calculation on delivery | ☐ |
| 9.8 | Reports: top products, vendor performance | ☐ |

### 10. Mobile Responsiveness

| # | Test Case | Status |
|---|-----------|--------|
| 10.1 | Header: hamburger menu works | ☐ |
| 10.2 | Header: search in mobile menu | ☐ |
| 10.3 | Header: login button visible | ☐ |
| 10.4 | Products page: filter drawer slides in/out | ☐ |
| 10.5 | Products page: 2-column grid on mobile | ☐ |
| 10.6 | Product detail: images, variant selector, cart button | ☐ |
| 10.7 | Cart page: items, quantity controls, summary | ☐ |
| 10.8 | Checkout: all steps usable on mobile | ☐ |
| 10.9 | Footer: 2-column layout on mobile | ☐ |
| 10.10 | No horizontal scroll on any page | ☐ |

---

## Future Requirements

### Phase 2 — Enhanced Features

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| F1 | Wishlist | High | Save products to wishlist, move to cart |
| F2 | Product Reviews | High | Customers can write reviews after purchase, star rating |
| F3 | Order Tracking | High | Real-time status updates with timeline |
| F4 | Email Notifications | High | Order confirmation, shipping, delivery emails |
| F5 | Stripe/Razorpay Integration | High | Real payment processing (currently placeholder) |
| F6 | Inventory Alerts | Medium | Notify vendor when variant stock is low |
| F7 | Bulk Variant Price Update | Medium | Update all variant prices by percentage |
| F8 | Product Comparison | Medium | Compare 2-3 products side by side |
| F9 | Recently Viewed | Medium | Show recently viewed products |
| F10 | Multi-image per Variant | Medium | Different images for each variant (color-specific photos) |

### Phase 3 — Growth Features

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| F11 | Multi-language Support | Medium | Hindi, Tamil, etc. |
| F12 | Push Notifications | Medium | Browser/mobile push for order updates |
| F13 | Vendor Analytics Dashboard | Medium | Sales charts, revenue trends, top products |
| F14 | Customer Loyalty Points | Low | Earn points on purchase, redeem as discount |
| F15 | Flash Sales / Deals | Low | Time-limited deals with countdown |
| F16 | Product Bundles | Low | Buy together at discount |
| F17 | Subscription Orders | Low | Recurring orders for consumables |
| F18 | Chat Support | Low | Customer-vendor messaging |
| F19 | Return/Refund System | High | Request return, vendor approval, refund processing |
| F20 | SEO Optimization | Medium | Meta tags, sitemap, structured data |

### Phase 4 — Scale & Operations

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| F21 | CDN for Images | High | Serve images from CDN for faster loading |
| F22 | Redis Caching | Medium | Cache product listings, categories |
| F23 | Elasticsearch | Medium | Better search with typo tolerance, facets |
| F24 | Rate Limiting per User | Medium | Prevent abuse |
| F25 | Admin Audit Log | Low | Track all admin actions |
| F26 | Automated Testing CI/CD | High | GitHub Actions for tests on every push |
| F27 | Docker Deployment | Medium | Containerized deployment |
| F28 | Database Backups | High | Automated daily backups |
| F29 | Performance Monitoring | Medium | APM, error tracking (Sentry) |
| F30 | Mobile App (React Native) | Low | Native mobile app |

---

## Test Accounts (from seed data)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@markethub.com | admin123 |
| Vendor (Alice Electronics) | vendor1@email.com | vendor123 |
| Vendor (Bob Fashion) | vendor2@email.com | vendor123 |
| Customer | customer1@email.com | customer123 |

---

## How to Run Tests

```bash
# Backend property tests
cd backend && npm test

# Frontend unit tests
cd frontend && npm test

# Manual testing
# 1. Start backend: cd backend && npx ts-node src/index.ts
# 2. Start frontend: cd frontend && npx vite
# 3. Open http://localhost:5173
# 4. Use test accounts above
```
