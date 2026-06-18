import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search, ShoppingCart, User, Menu, X,
  Package, LayoutDashboard, LogOut, Heart
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useCart } from '../../../context/CartContext'
import api from '../../../api/client'
import { debounce } from '../../../utils/helpers'

export default function TekMartsHeader() {
  const { user, logout } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('search') || '')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchSuggestions = debounce(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return }
    try {
      const res = await api.get(`/search/suggestions?q=${encodeURIComponent(q)}`)
      setSuggestions(res.data.suggestions || [])
    } catch { setSuggestions([]) }
  }, 300)

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (val.length >= 2) fetchSuggestions(val)
    else setSuggestions([])
  }

  const handleSearch = (term: string) => {
    if (!term.trim()) return
    setShowDropdown(false)
    navigate(`/products?search=${encodeURIComponent(term)}`)
  }

  const dashboardPath = user?.role === 'admin' ? '/admin' : user?.role === 'vendor' ? '/vendor' : '/customer'

  return (
    <header className="sticky top-0 z-50 bg-gray-900">
      <div className="tk-container">
        <div className="flex items-center gap-3 sm:gap-4 h-14 sm:h-16">
          {/* Mobile menu toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 hover:bg-gray-800 rounded-lg text-gray-300">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 flex-shrink-0">
            <img src="/logo.png" alt="GoMarts" className="h-8 w-8 sm:h-9 sm:w-9 object-contain" />
            <span className="font-bold text-base sm:text-lg">
              <span className="text-white">Go</span><span className="text-primary-400">Marts</span>
            </span>
          </Link>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-lg relative" ref={searchRef}>
            <div className="relative flex items-center w-full">
              <Search size={15} className="absolute left-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={handleQueryChange}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                placeholder="Search products, brands & categories..."
                className="w-full pl-10 pr-4 h-9 bg-gray-800 border border-gray-700 rounded-full text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Search Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-100 shadow-xl z-50 overflow-hidden">
                <div className="p-2">
                  {suggestions.map((s: any) => (
                    <div
                      key={s.productId}
                      onClick={() => { navigate(`/products/${s.productId}`); setShowDropdown(false) }}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <Search size={13} className="text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-800 font-medium">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.categoryName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-2 ml-auto flex-shrink-0">
            {/* Mobile search */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 hover:bg-gray-800 rounded-lg text-gray-300">
              <Search size={18} />
            </button>

            <Link to="/products" className="hidden sm:flex p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
              <Heart size={18} />
            </Link>

            {(!user || user.role === 'customer') && (
              <Link to="/cart" className="relative p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white">
                <ShoppingCart size={18} />
                {itemCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-primary-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </Link>
            )}

            {/* User */}
            {user ? (
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-bold ml-1"
                >
                  {user.firstName?.[0] || user.email[0].toUpperCase()}
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-gray-100 shadow-xl z-50 overflow-hidden">
                    <div className="p-3 border-b border-gray-100">
                      <p className="font-semibold text-gray-900 text-sm">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <div className="p-1.5">
                      <Link to={dashboardPath} onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                        <LayoutDashboard size={15} /> Dashboard
                      </Link>
                      {user.role === 'customer' && (
                        <Link to="/customer/orders" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                          <Package size={15} /> My Orders
                        </Link>
                      )}
                      <Link to={`${dashboardPath}/profile`} onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                        <User size={15} /> Profile
                      </Link>
                      <hr className="my-1 border-gray-100" />
                      <button onClick={logout}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg w-full">
                        <LogOut size={15} /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/auth/login" className="bg-primary-500 hover:bg-primary-600 text-white text-xs sm:text-sm font-semibold py-1.5 sm:py-2 px-3 sm:px-4 rounded-full transition-colors ml-1">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-700 bg-gray-900 px-4 py-3">
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={handleQueryChange}
              onKeyDown={(e) => { if (e.key === 'Enter') { handleSearch(query); setMobileOpen(false) } }}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 h-9 bg-gray-800 border border-gray-700 rounded-full text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <nav className="flex flex-col gap-0.5">
            <Link to="/products" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 font-medium text-sm">All Products</Link>
            <Link to="/products?sort=newest" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 text-sm">New Arrivals</Link>
            <Link to="/products?sort=popular" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 text-sm">Best Sellers</Link>
          </nav>
        </div>
      )}
    </header>
  )
}
