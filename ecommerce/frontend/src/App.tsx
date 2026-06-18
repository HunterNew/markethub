import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { ThemeProvider } from './context/ThemeContext'
import { WishlistProvider } from './context/WishlistContext'
import api from './api/client'
import ProtectedRoute from './components/layout/ProtectedRoute'
import { ThemedHeader, ThemedFooter, ThemedHome } from './components/themes'

// Eagerly loaded (homepage + common)
import ProductsPage from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import SellPage from './pages/SellPage'

// Lazy loaded pages
const InvoicePage = lazy(() => import('./pages/Invoice'))
const CartPage = lazy(() => import('./pages/Cart'))
const CheckoutPage = lazy(() => import('./pages/Checkout'))
const VendorStorePage = lazy(() => import('./pages/VendorStore'))
const WishlistPage = lazy(() => import('./pages/Wishlist'))

// Auth - lazy
const AuthPages = lazy(() => import('./pages/auth/Auth').then(m => ({ default: m.LoginPage })))
const RegisterPageLazy = lazy(() => import('./pages/auth/Auth').then(m => ({ default: m.RegisterPage })))
const VendorRegisterPageLazy = lazy(() => import('./pages/auth/Auth').then(m => ({ default: m.VendorRegisterPage })))
const ForgotPasswordPageLazy = lazy(() => import('./pages/auth/Auth').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPageLazy = lazy(() => import('./pages/auth/Auth').then(m => ({ default: m.ResetPasswordPage })))

// Customer - lazy
const CustomerDashboardLazy = lazy(() => import('./pages/customer/CustomerPages').then(m => ({ default: m.CustomerDashboard })))
const CustomerOrdersPageLazy = lazy(() => import('./pages/customer/CustomerPages').then(m => ({ default: m.CustomerOrdersPage })))
const CustomerOrderDetailPageLazy = lazy(() => import('./pages/customer/CustomerPages').then(m => ({ default: m.CustomerOrderDetailPage })))
const OrderConfirmationPageLazy = lazy(() => import('./pages/customer/CustomerPages').then(m => ({ default: m.OrderConfirmationPage })))

// Profile - lazy
const CustomerProfilePageLazy = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.CustomerProfilePage })))
const VendorProfilePageLazy = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.VendorProfilePage })))
const AdminProfilePageLazy = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.AdminProfilePage })))

// Vendor - lazy
const VendorDashboardLazy = lazy(() => import('./pages/vendor/VendorPages').then(m => ({ default: m.VendorDashboard })))
const VendorProductsLazy = lazy(() => import('./pages/vendor/VendorPages').then(m => ({ default: m.VendorProducts })))
const VendorOrdersLazy = lazy(() => import('./pages/vendor/VendorPages').then(m => ({ default: m.VendorOrders })))
const VendorCouponsLazy = lazy(() => import('./pages/vendor/VendorPages').then(m => ({ default: m.VendorCoupons })))
const VendorEarningsLazy = lazy(() => import('./pages/vendor/VendorPages').then(m => ({ default: m.VendorEarnings })))
const VendorOffersLazy = lazy(() => import('./pages/vendor/VendorPages').then(m => ({ default: m.VendorOffers })))
const VendorReviewsLazy = lazy(() => import('./pages/vendor/VendorPages').then(m => ({ default: m.VendorReviews })))
const VendorNotificationsLazy = lazy(() => import('./pages/vendor/VendorPages').then(m => ({ default: m.VendorNotifications })))

// Admin - lazy
const AdminDashboardLazy = lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminDashboard })))
const AdminVendorsLazy = lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminVendors })))
const AdminProductsLazy = lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminProducts })))
const AdminOrdersLazy = lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminOrders })))
const AdminReportsLazy = lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminReports })))
const AdminSettingsLazy = lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminSettings })))
const AdminWithdrawalsLazy = lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminWithdrawals })))
const AdminCategoriesLazy = lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminCategories })))
const AdminCouponsLazy = lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminCoupons })))
const AdminBannersLazy = lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminBanners })))
const AdminPromoCardsLazy = lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminPromoCards })))
const AdminReturnsLazy = lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminReturns })))
const AdminReviewsLazy = lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminReviews })))
const AdminNotificationsLazy = lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminNotifications })))
const AdminBrandsLazy = lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminBrands })))

function PageLoader() {
  return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <ThemedHeader />
      <main className="flex-1">{children}</main>
      <ThemedFooter />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
          <ThemeProvider>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Auth pages - no header/footer */}
            <Route path="/auth/login" element={<AuthPages />} />
            <Route path="/auth/register" element={<RegisterPageLazy />} />
            <Route path="/auth/register/vendor" element={<VendorRegisterPageLazy />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPageLazy />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPageLazy />} />

            {/* Public pages with header/footer */}
            <Route path="/" element={<MainLayout><ThemedHome /></MainLayout>} />
            <Route path="/sell" element={<SellPage />} />
            <Route path="/products" element={<MainLayout><ProductsPage /></MainLayout>} />
            <Route path="/products/:id" element={<MainLayout><ProductDetail /></MainLayout>} />
            <Route path="/vendor/:slug" element={<MainLayout><VendorStorePage /></MainLayout>} />

            {/* Order confirmation */}
            <Route path="/order-confirmation/:id" element={
              <ProtectedRoute roles={['customer']}>
                <MainLayout><OrderConfirmationPageLazy /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/invoice/:id" element={
              <ProtectedRoute roles={['customer', 'vendor', 'admin']}>
                <InvoicePage />
              </ProtectedRoute>
            } />

            {/* Cart - accessible to everyone, Checkout - customer only */}
            <Route path="/cart" element={
              <MainLayout><CartPage /></MainLayout>
            } />
            <Route path="/wishlist" element={
              <MainLayout><WishlistPage /></MainLayout>
            } />
            <Route path="/checkout" element={
              <ProtectedRoute roles={['customer']}>
                <MainLayout><CheckoutPage /></MainLayout>
              </ProtectedRoute>
            } />

            {/* Customer dashboard */}
            <Route path="/customer" element={
              <ProtectedRoute roles={['customer']}>
                <CustomerDashboardLazy />
              </ProtectedRoute>
            } />
            <Route path="/customer/orders" element={
              <ProtectedRoute roles={['customer']}>
                <CustomerOrdersPageLazy />
              </ProtectedRoute>
            } />
            <Route path="/customer/orders/:id" element={
              <ProtectedRoute roles={['customer']}>
                <CustomerOrderDetailPageLazy />
              </ProtectedRoute>
            } />
            <Route path="/customer/profile" element={
              <ProtectedRoute roles={['customer']}>
                <CustomerProfilePageLazy />
              </ProtectedRoute>
            } />

            {/* Vendor dashboard */}
            <Route path="/vendor" element={
              <ProtectedRoute roles={['vendor']}>
                <VendorDashboardLazy />
              </ProtectedRoute>
            } />
            <Route path="/vendor/products" element={
              <ProtectedRoute roles={['vendor']}>
                <VendorProductsLazy />
              </ProtectedRoute>
            } />
            <Route path="/vendor/orders" element={
              <ProtectedRoute roles={['vendor']}>
                <VendorOrdersLazy />
              </ProtectedRoute>
            } />
            <Route path="/vendor/coupons" element={
              <ProtectedRoute roles={['vendor']}>
                <VendorCouponsLazy />
              </ProtectedRoute>
            } />
            <Route path="/vendor/offers" element={
              <ProtectedRoute roles={['vendor']}>
                <VendorOffersLazy />
              </ProtectedRoute>
            } />
            <Route path="/vendor/reviews" element={
              <ProtectedRoute roles={['vendor']}>
                <VendorReviewsLazy />
              </ProtectedRoute>
            } />
            <Route path="/vendor/notifications" element={
              <ProtectedRoute roles={['vendor']}>
                <VendorNotificationsLazy />
              </ProtectedRoute>
            } />
            <Route path="/vendor/earnings" element={
              <ProtectedRoute roles={['vendor']}>
                <VendorEarningsLazy />
              </ProtectedRoute>
            } />
            <Route path="/vendor/withdrawals" element={
              <ProtectedRoute roles={['vendor']}>
                <VendorEarningsLazy />
              </ProtectedRoute>
            } />
            <Route path="/vendor/profile" element={
              <ProtectedRoute roles={['vendor']}>
                <VendorProfilePageLazy />
              </ProtectedRoute>
            } />

            {/* Admin dashboard */}
            <Route path="/admin" element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboardLazy />
              </ProtectedRoute>
            } />
            <Route path="/admin/vendors" element={
              <ProtectedRoute roles={['admin']}>
                <AdminVendorsLazy />
              </ProtectedRoute>
            } />
            <Route path="/admin/products" element={
              <ProtectedRoute roles={['admin']}>
                <AdminProductsLazy />
              </ProtectedRoute>
            } />
            <Route path="/admin/categories" element={
              <ProtectedRoute roles={['admin']}>
                <AdminCategoriesLazy />
              </ProtectedRoute>
            } />
            <Route path="/admin/orders" element={
              <ProtectedRoute roles={['admin']}>
                <AdminOrdersLazy />
              </ProtectedRoute>
            } />
            <Route path="/admin/coupons" element={
              <ProtectedRoute roles={['admin']}>
                <AdminCouponsLazy />
              </ProtectedRoute>
            } />
            <Route path="/admin/banners" element={
              <ProtectedRoute roles={['admin']}>
                <AdminBannersLazy />
              </ProtectedRoute>
            } />
            <Route path="/admin/promo-cards" element={
              <ProtectedRoute roles={['admin']}>
                <AdminPromoCardsLazy />
              </ProtectedRoute>
            } />
            <Route path="/admin/returns" element={
              <ProtectedRoute roles={['admin']}>
                <AdminReturnsLazy />
              </ProtectedRoute>
            } />
            <Route path="/admin/reviews" element={
              <ProtectedRoute roles={['admin']}>
                <AdminReviewsLazy />
              </ProtectedRoute>
            } />
            <Route path="/admin/notifications" element={
              <ProtectedRoute roles={['admin']}>
                <AdminNotificationsLazy />
              </ProtectedRoute>
            } />
            <Route path="/admin/brands" element={
              <ProtectedRoute roles={['admin']}>
                <AdminBrandsLazy />
              </ProtectedRoute>
            } />
            <Route path="/admin/reports" element={
              <ProtectedRoute roles={['admin']}>
                <AdminReportsLazy />
              </ProtectedRoute>
            } />
            <Route path="/admin/withdrawals" element={
              <ProtectedRoute roles={['admin']}>
                <AdminWithdrawalsLazy />
              </ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute roles={['admin']}>
                <AdminSettingsLazy />
              </ProtectedRoute>
            } />
            <Route path="/admin/settings/tax" element={
              <ProtectedRoute roles={['admin']}>
                <AdminSettingsLazy />
              </ProtectedRoute>
            } />
            <Route path="/admin/settings/wholesale" element={
              <ProtectedRoute roles={['admin']}>
                <AdminSettingsLazy />
              </ProtectedRoute>
            } />
            <Route path="/admin/settings/homepage" element={
              <ProtectedRoute roles={['admin']}>
                <AdminSettingsLazy />
              </ProtectedRoute>
            } />
            <Route path="/admin/profile" element={
              <ProtectedRoute roles={['admin']}>
                <AdminProfilePageLazy />
              </ProtectedRoute>
            } />

            {/* 404 */}
            <Route path="*" element={
              <MainLayout>
                <div className="page-container py-24 text-center">
                  <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
                  <h2 className="text-2xl font-bold text-gray-700 mb-4">Page Not Found</h2>
                  <a href="/" className="btn-primary">Go Home</a>
                </div>
              </MainLayout>
            } />
          </Routes>
          </Suspense>
          </ThemeProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
