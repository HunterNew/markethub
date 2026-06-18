import React from 'react'
import { Link } from 'react-router-dom'
import { Facebook, Instagram, Twitter, Youtube } from 'lucide-react'

export default function TekMartsFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-12">
      <div className="tk-container py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="GoMarts" className="h-8 w-8 object-contain" />
            <span className="font-bold text-lg">
              <span className="text-white">Go</span><span className="text-primary-400">Marts</span>
            </span>
          </Link>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm">
            <Link to="/products" className="hover:text-white transition-colors">Shop</Link>
            <Link to="/sell" className="hover:text-white transition-colors">Company</Link>
            <Link to="#" className="hover:text-white transition-colors">Support</Link>
            <Link to="#" className="hover:text-white transition-colors">Legal</Link>
          </div>

          {/* Social */}
          <div className="flex items-center gap-2.5">
            {[Facebook, Instagram, Twitter, Youtube].map((Icon, i) => (
              <button key={i} className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-800 hover:bg-primary-600 rounded-full flex items-center justify-center transition-colors">
                <Icon size={13} />
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-800 mt-6 pt-5 text-center text-[10px] sm:text-xs text-gray-500">
          © {new Date().getFullYear()} GoMarts. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
