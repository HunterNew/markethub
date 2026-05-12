import React from 'react'
import { Link } from 'react-router-dom'
import { Store, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="page-container py-10 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <Store size={16} className="text-white" />
              </div>
              <span className="font-bold text-white text-lg">Market<span className="text-primary-400">Hub</span></span>
            </div>
            <p className="text-sm text-gray-400 mb-3">India's fastest-growing multi-vendor marketplace.</p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                <button key={i} className="w-8 h-8 bg-gray-800 hover:bg-primary-600 rounded-lg flex items-center justify-center transition-colors">
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-semibold text-white mb-3 text-sm">Shop</h3>
            <ul className="space-y-1.5 text-xs sm:text-sm">
              {[
                { label: 'All Products', to: '/products' },
                { label: 'New Arrivals', to: '/products?sort=newest' },
                { label: 'Best Sellers', to: '/products?sort=popular' },
                { label: 'Sale Items', to: '/products?on-sale=true' },
              ].map(link => (
                <li key={link.label}>
                  <Link to={link.to} className="hover:text-primary-400 transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Sellers */}
          <div>
            <h3 className="font-semibold text-white mb-3 text-sm">For Sellers</h3>
            <ul className="space-y-1.5 text-xs sm:text-sm">
              {[
                { label: 'Start Selling', to: '/auth/register?role=vendor' },
                { label: 'Vendor Dashboard', to: '/vendor' },
                { label: 'Pricing & Fees', to: '#' },
              ].map(link => (
                <li key={link.label}>
                  <Link to={link.to} className="hover:text-primary-400 transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-2 lg:col-span-1">
            <h3 className="font-semibold text-white mb-3 text-sm">Contact</h3>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li className="flex items-start gap-2">
                <MapPin size={14} className="text-primary-400 mt-0.5 flex-shrink-0" />
                <span>123 Market Street, Mumbai 400001</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-primary-400 flex-shrink-0" />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-primary-400 flex-shrink-0" />
                <span>support@markethub.com</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-800">
        <div className="page-container py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <span>© 2025 MarketHub. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="#" className="hover:text-primary-400">Privacy</Link>
            <Link to="#" className="hover:text-primary-400">Terms</Link>
            <Link to="#" className="hover:text-primary-400">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
