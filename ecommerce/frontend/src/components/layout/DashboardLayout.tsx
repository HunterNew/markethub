import React, { ReactNode, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingBag, DollarSign, Users,
  Tag, Settings, BarChart2, Wallet, CreditCard, Star,
  Home, ClipboardList, User, Percent, FileText, ToggleLeft, LogOut, Store, Image, LayoutGrid, RefreshCw, Menu, X, Bell
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Header from './Header'

interface SidebarItem {
  label: string
  to: string
  icon: ReactNode
  badge?: number
}

function SidebarLayout({ title, items, children, showHelp = true, helpRole = 'admin' }: { title: string; items: SidebarItem[]; children: ReactNode; showHelp?: boolean; helpRole?: string }) {
  const { logout } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {/* Mobile nav bar */}
      <div className="md:hidden border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
        <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wider">{title}</h2>
        <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
          {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile nav dropdown */}
      {mobileNavOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-2 animate-slide-up">
          <nav className="flex flex-wrap gap-1">
            {items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to.split('/').length <= 2}
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) => `flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 mt-1"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-1 w-full">
        {/* Desktop Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-100 flex-shrink-0 hidden md:flex flex-col">
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wider">{title}</h2>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to.split('/').length <= 2}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="bg-primary-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-100">
            {showHelp && (
              <a href={`/help-guide.html?role=${helpRole}`} target="_blank" rel="noopener noreferrer"
                className="sidebar-link w-full text-gray-600 hover:bg-gray-50 mb-1">
                <span className="flex-shrink-0">❓</span>
                <span className="flex-1">Help Guide</span>
              </a>
            )}
            <button
              onClick={logout}
              className="sidebar-link w-full text-red-600 hover:bg-red-50"
            >
              <span className="flex-shrink-0"><LogOut size={18} /></span>
              <span className="flex-1">Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-x-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}

export function CustomerLayout({ children }: { children: ReactNode }) {
  const items: SidebarItem[] = [
    { label: 'Dashboard', to: '/customer', icon: <LayoutDashboard size={18} /> },
    { label: 'My Orders', to: '/customer/orders', icon: <ShoppingBag size={18} /> },
    { label: 'Profile', to: '/customer/profile', icon: <User size={18} /> },
  ]
  return <SidebarLayout title="My Account" items={items} showHelp={false}>{children}</SidebarLayout>
}

export function VendorLayout({ children }: { children: ReactNode }) {
  const items: SidebarItem[] = [
    { label: 'Dashboard', to: '/vendor', icon: <LayoutDashboard size={18} /> },
    { label: 'Products', to: '/vendor/products', icon: <Package size={18} /> },
    { label: 'Orders', to: '/vendor/orders', icon: <ShoppingBag size={18} /> },
    { label: 'Offers', to: '/vendor/offers', icon: <Tag size={18} /> },
    { label: 'Reviews', to: '/vendor/reviews', icon: <Star size={18} /> },
    { label: 'Notifications', to: '/vendor/notifications', icon: <Bell size={18} /> },
    { label: 'Coupons', to: '/vendor/coupons', icon: <CreditCard size={18} /> },
    { label: 'Earnings', to: '/vendor/earnings', icon: <DollarSign size={18} /> },
    { label: 'Withdrawals', to: '/vendor/withdrawals', icon: <Wallet size={18} /> },
    { label: 'Profile', to: '/vendor/profile', icon: <User size={18} /> },
  ]
  return <SidebarLayout title="Vendor Panel" items={items} helpRole="vendor">{children}</SidebarLayout>
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const items: SidebarItem[] = [
    { label: 'Dashboard', to: '/admin', icon: <LayoutDashboard size={18} /> },
    { label: 'Vendors', to: '/admin/vendors', icon: <Users size={18} /> },
    { label: 'Products', to: '/admin/products', icon: <Package size={18} /> },
    { label: 'Categories', to: '/admin/categories', icon: <ClipboardList size={18} /> },
    { label: 'Brands', to: '/admin/brands', icon: <Tag size={18} /> },
    { label: 'Orders', to: '/admin/orders', icon: <ShoppingBag size={18} /> },
    { label: 'Coupons', to: '/admin/coupons', icon: <Tag size={18} /> },
    { label: 'Banners', to: '/admin/banners', icon: <Image size={18} /> },
    { label: 'Promo Cards', to: '/admin/promo-cards', icon: <LayoutGrid size={18} /> },
    { label: 'Returns', to: '/admin/returns', icon: <RefreshCw size={18} /> },
    { label: 'Reviews', to: '/admin/reviews', icon: <Star size={18} /> },
    { label: 'Notifications', to: '/admin/notifications', icon: <Bell size={18} /> },
    { label: 'Withdrawals', to: '/admin/withdrawals', icon: <Wallet size={18} /> },
    { label: 'Reports', to: '/admin/reports', icon: <BarChart2 size={18} /> },
    { label: 'Tax Config', to: '/admin/settings/tax', icon: <Percent size={18} /> },
    { label: 'Wholesale', to: '/admin/settings/wholesale', icon: <ToggleLeft size={18} /> },
    { label: 'Homepage', to: '/admin/settings/homepage', icon: <Home size={18} /> },
    { label: 'Settings', to: '/admin/settings', icon: <Settings size={18} /> },
  ]
  return <SidebarLayout title="Admin Panel" items={items}>{children}</SidebarLayout>
}
