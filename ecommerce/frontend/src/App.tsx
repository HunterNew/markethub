import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'

// Pages
import HomePage from './pages/Home'
import ProductsPage from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import CartPage from './pages/Cart'
import CheckoutPage from './pages/Checkout'
import VendorStorePage from './pages/VendorStore'
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage } from './pages/auth/Auth'
import {
  CustomerDashboard, CustomerOrdersPage,
  CustomerOrderDetailPage, OrderConfirmationPage
} from './pages/customer/CustomerPages'
import { CustomerProfilePage, VendorProfilePage, AdminProfilePage } from './pages/ProfilePage'
import {
  VendorDashboard, VendorProducts, VendorOrders,
  VendorCoupons, VendorEarnings
} from './pages/vendor/VendorPages'
import {
  AdminDashboard, AdminVendors, AdminProducts,
  AdminOrders, AdminReports, AdminSettings, AdminWithdrawals,
  AdminCategories, AdminCoupons
} from './pages/admin/AdminPages'

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* Auth pages - no header/footer */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

            {/* Public pages with header/footer */}
            <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
            <Route path="/products" element={<MainLayout><ProductsPage /></MainLayout>} />
            <Route path="/products/:id" element={<MainLayout><ProductDetail /></MainLayout>} />
            <Route path="/vendor/:slug" element={<MainLayout><VendorStorePage /></MainLayout>} />

            {/* Order confirmation */}
            <Route path="/order-confirmation/:id" element={
              <ProtectedRoute roles={['customer']}>
                <MainLayout><OrderConfirmationPage /></MainLayout>
              </ProtectedRoute>
            } />

            {/* Cart - accessible to everyone, Checkout - customer only */}
            <Route path="/cart" element={
              <MainLayout><CartPage /></MainLayout>
            } />
            <Route path="/checkout" element={
              <ProtectedRoute roles={['customer']}>
                <MainLayout><CheckoutPage /></MainLayout>
              </ProtectedRoute>
            } />

            {/* Customer dashboard */}
            <Route path="/customer" element={
              <ProtectedRoute roles={['customer']}>
                <CustomerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/customer/orders" element={
              <ProtectedRoute roles={['customer']}>
                <CustomerOrdersPage />
              </ProtectedRoute>
            } />
            <Route path="/customer/orders/:id" element={
              <ProtectedRoute roles={['customer']}>
                <CustomerOrderDetailPage />
              </ProtectedRoute>
            } />
            <Route path="/customer/profile" element={
              <ProtectedRoute roles={['customer']}>
                <CustomerProfilePage />
              </ProtectedRoute>
            } />

            {/* Vendor dashboard */}
            <Route path="/vendor" element={
              <ProtectedRoute roles={['vendor']}>
                <VendorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/vendor/products" element={
              <ProtectedRoute roles={['vendor']}>
                <VendorProducts />
              </ProtectedRoute>
            } />
            <Route path="/vendor/orders" element={
              <ProtectedRoute roles={['vendor']}>
                <VendorOrders />
              </ProtectedRoute>
            } />
            <Route path="/vendor/coupons" element={
              <ProtectedRoute roles={['vendor']}>
                <VendorCoupons />
              </ProtectedRoute>
            } />
            <Route path="/vendor/earnings" element={
              <ProtectedRoute roles={['vendor']}>
                <VendorEarnings />
              </ProtectedRoute>
            } />
            <Route path="/vendor/withdrawals" element={
              <ProtectedRoute roles={['vendor']}>
                <VendorEarnings />
              </ProtectedRoute>
            } />
            <Route path="/vendor/profile" element={
              <ProtectedRoute roles={['vendor']}>
                <VendorProfilePage />
              </ProtectedRoute>
            } />

            {/* Admin dashboard */}
            <Route path="/admin" element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/vendors" element={
              <ProtectedRoute roles={['admin']}>
                <AdminVendors />
              </ProtectedRoute>
            } />
            <Route path="/admin/products" element={
              <ProtectedRoute roles={['admin']}>
                <AdminProducts />
              </ProtectedRoute>
            } />
            <Route path="/admin/categories" element={
              <ProtectedRoute roles={['admin']}>
                <AdminCategories />
              </ProtectedRoute>
            } />
            <Route path="/admin/orders" element={
              <ProtectedRoute roles={['admin']}>
                <AdminOrders />
              </ProtectedRoute>
            } />
            <Route path="/admin/coupons" element={
              <ProtectedRoute roles={['admin']}>
                <AdminCoupons />
              </ProtectedRoute>
            } />
            <Route path="/admin/reports" element={
              <ProtectedRoute roles={['admin']}>
                <AdminReports />
              </ProtectedRoute>
            } />
            <Route path="/admin/withdrawals" element={
              <ProtectedRoute roles={['admin']}>
                <AdminWithdrawals />
              </ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute roles={['admin']}>
                <AdminSettings />
              </ProtectedRoute>
            } />
            <Route path="/admin/settings/tax" element={
              <ProtectedRoute roles={['admin']}>
                <AdminSettings />
              </ProtectedRoute>
            } />
            <Route path="/admin/settings/wholesale" element={
              <ProtectedRoute roles={['admin']}>
                <AdminSettings />
              </ProtectedRoute>
            } />
            <Route path="/admin/settings/homepage" element={
              <ProtectedRoute roles={['admin']}>
                <AdminSettings />
              </ProtectedRoute>
            } />
            <Route path="/admin/profile" element={
              <ProtectedRoute roles={['admin']}>
                <AdminProfilePage />
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
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
