import React from 'react'
import { Link } from 'react-router-dom'

export default function DarkGlassFooter() {
  return (
    <footer className="mt-16 border-t border-white/[0.05] bg-black/20">
      <div className="dg-container py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="GoMarts" className="h-6 w-6" />
            <span className="font-extrabold text-sm"><span className="text-white">Go</span><span className="text-primary-500">Marts</span></span>
          </Link>
          <div className="flex flex-wrap items-center gap-5 text-xs">
            <Link to="/products" className="text-gray-500 hover:text-primary-400 transition-colors">Shop</Link>
            <Link to="/sell" className="text-gray-500 hover:text-primary-400 transition-colors">Sell on GoMarts</Link>
            <Link to="#" className="text-gray-500 hover:text-primary-400 transition-colors">Support</Link>
            <Link to="#" className="text-gray-500 hover:text-primary-400 transition-colors">Legal</Link>
          </div>
          <span className="text-[10px] text-gray-600">© {new Date().getFullYear()} GoMarts</span>
        </div>
      </div>
    </footer>
  )
}
