import React, { ReactNode } from 'react'
import { NavLink, Link } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingBag, DollarSign, Users,
  Tag, Settings, BarChart2, Wallet, CreditCard, Star,
  Home, ClipboardList, User, Percent, FileText, ToggleLeft, LogOut, Store
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Header from './Header'

interface SidebarItem {
  label: string
  to: string
  icon: ReactNode
  badge?: number
}

function SidebarLayout({ title, items, children }: { title: string; items: SidebarItem[]; children: ReactNode }) {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex flex-1">
        {/* Sidebar */}
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
        <main className="flex-1 overflow-auto">
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
  return <SidebarLayout title="My Account" items={items}>{children}</SidebarLayout>
}

export function VendorLayout({ children }: { children: ReactNode }) {
  const items: SidebarItem[] = [
    { label: 'Dashboard', to: '/vendor', icon: <LayoutDashboard size={18} /> },
    { label: 'Products', to: '/vendor/products', icon: <Package size={18} /> },
    { label: 'Orders', to: '/vendor/orders', icon: <ShoppingBag size={18} /> },
    { label: 'Coupons', to: '/vendor/coupons', icon: <Tag size={18} /> },
    { label: 'Earnings', to: '/vendor/earnings', icon: <DollarSign size={18} /> },
    { label: 'Withdrawals', to: '/vendor/withdrawals', icon: <Wallet size={18} /> },
    { label: 'Profile', to: '/vendor/profile', icon: <User size={18} /> },
  ]
  return <SidebarLayout title="Vendor Panel" items={items}>{children}</SidebarLayout>
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const items: SidebarItem[] = [
    { label: 'Dashboard', to: '/admin', icon: <LayoutDashboard size={18} /> },
    { label: 'Vendors', to: '/admin/vendors', icon: <Users size={18} /> },
    { label: 'Products', to: '/admin/products', icon: <Package size={18} /> },
    { label: 'Categories', to: '/admin/categories', icon: <ClipboardList size={18} /> },
    { label: 'Orders', to: '/admin/orders', icon: <ShoppingBag size={18} /> },
    { label: 'Coupons', to: '/admin/coupons', icon: <Tag size={18} /> },
    { label: 'Withdrawals', to: '/admin/withdrawals', icon: <Wallet size={18} /> },
    { label: 'Reports', to: '/admin/reports', icon: <BarChart2 size={18} /> },
    { label: 'Tax Config', to: '/admin/settings/tax', icon: <Percent size={18} /> },
    { label: 'Wholesale', to: '/admin/settings/wholesale', icon: <ToggleLeft size={18} /> },
    { label: 'Homepage', to: '/admin/settings/homepage', icon: <Home size={18} /> },
    { label: 'Settings', to: '/admin/settings', icon: <Settings size={18} /> },
  ]
  return <SidebarLayout title="Admin Panel" items={items}>{children}</SidebarLayout>
}
