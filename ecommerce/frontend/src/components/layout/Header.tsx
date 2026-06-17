import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search, ShoppingCart, User, Menu, X, ChevronDown,
  Package, LayoutDashboard, LogOut, Heart, Store
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useWishlist } from '../../context/WishlistContext'
import api from '../../api/client'
import { debounce } from '../../utils/helpers'

export default function Header() {
  const { user, logout } = useAuth()
  const { itemCount } = useCart()
  const { count: wishlistCount } = useWishlist()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('search') || '')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [showCatModal, setShowCatModal] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data.categories || [])).catch(() => {})
  }, [])

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
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      {/* Main header row */}
      <div className="page-container">
        <div className="flex items-center gap-3 sm:gap-4 h-14 sm:h-16">
          {/* Mobile menu */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 hover:bg-gray-100 rounded-xl flex-shrink-0">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 flex-shrink-0">
            <img src="/logo.png" alt="GoMarts" className="h-12 w-12 object-contain" />
            <div className="hidden sm:block" style={{ marginTop: '10px' }}>
              <span className="font-bold text-xl block" style={{ marginBottom: '-10px' }}>
                <span className="text-[#1e3a5f]">Go</span><span className="text-primary-500">Marts</span>
              </span>
              <span className="text-[9px] text-gray-400 font-medium tracking-wide">Shop Easy. Go Fast.</span>
            </div>
          </Link>

          {/* Search bar - center */}
          <div className="hidden md:flex flex-1 relative" ref={searchRef}>
            <div className="relative flex items-center w-full">
              <Search size={16} className="absolute left-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={handleQueryChange}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                placeholder="Search products, brands, categories..."
                className="input pl-10 pr-20 h-11 bg-gray-50 border-gray-200 focus:bg-white w-full"
              />
              <button
                onClick={() => handleSearch(query)}
                className="absolute right-1 bg-primary-500 hover:bg-primary-600 text-white rounded-lg px-4 h-9 text-sm font-medium transition-colors"
              >
                Search
              </button>
            </div>

            {/* Search Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-100 shadow-xl z-50 overflow-hidden">
                <div className="p-2">
                  {suggestions.map((s: any) => (
                    <div
                      key={s.productId}
                      onClick={() => { navigate(`/products/${s.productId}`); setShowDropdown(false) }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <Search size={14} className="text-gray-400 flex-shrink-0" />
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

          {/* Mobile search icon */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 hover:bg-gray-100 rounded-xl ml-auto">
            <Search size={20} className="text-gray-700" />
          </button>

          {/* Right actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Wishlist */}
            <Link to="/wishlist" className="hidden sm:flex relative p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <Heart size={20} className="text-gray-600" />
              {wishlistCount > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{wishlistCount > 9 ? '9+' : wishlistCount}</span>
              )}
            </Link>

            {/* Cart */}
            {(!user || user.role === 'customer') && (
              <Link to="/cart" className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <ShoppingCart size={21} className="text-gray-700" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-bounce-subtle">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </Link>
            )}

            {/* User menu */}
            {user ? (
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2 sm:px-3 py-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {user.firstName?.[0] || user.email[0].toUpperCase()}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-semibold text-gray-800">{user.firstName || 'User'}</p>
                    <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                  </div>
                  <ChevronDown size={14} className="text-gray-400 hidden md:block" />
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
              <Link to="/auth/login" className="btn-primary text-sm py-2 px-4">Login</Link>
            )}
          </div>
        </div>

        {/* Category nav bar - below header */}
        <nav className="hidden md:flex items-center gap-0 py-0 border-t border-gray-50 relative">
          <Link to="/products" className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-primary-600 border-b-2 border-transparent hover:border-primary-500 transition-colors">All</Link>
          {categories.filter(c => !c.parent_id).slice(0, 8).map(cat => (
            <Link key={cat.id} to={`/products?categoryId=${cat.id}`} className="px-4 py-2.5 text-sm text-gray-600 hover:text-primary-600 border-b-2 border-transparent hover:border-primary-500 transition-colors">
              {cat.name}
            </Link>
          ))}
          {categories.filter(c => !c.parent_id).length > 8 && (
            <div className="relative group">
              <button className="flex items-center gap-1 px-4 py-2.5 text-sm text-gray-600 hover:text-primary-600 border-b-2 border-transparent group-hover:border-primary-500 transition-colors">
                More <ChevronDown size={12} className="opacity-50" />
              </button>
              <div className="absolute top-full right-0 pt-0 hidden group-hover:block z-50">
                <div className="bg-white border border-gray-200 rounded-lg shadow-xl py-3 px-3 max-w-[90vw] overflow-x-auto">
                  <div className="flex gap-4">
                    {(() => {
                      const moreCats = categories.filter(c => !c.parent_id).slice(8)
                      const columns: any[][] = []
                      for (let i = 0; i < moreCats.length; i += 10) {
                        columns.push(moreCats.slice(i, i + 10))
                      }
                      return columns.map((col, colIdx) => (
                        <div key={colIdx} className="min-w-[160px] flex-shrink-0">
                          {col.map(cat => (
                            <Link key={cat.id} to={`/products?categoryId=${cat.id}`} className="block px-3 py-2 text-sm text-gray-600 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors whitespace-nowrap">{cat.name}</Link>
                          ))}
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="ml-auto">
            {!user && (
              <Link to="/sell" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                <Store size={14} /> Sell on GoMarts
              </Link>
            )}
          </div>
        </nav>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white p-4 animate-slide-up">
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={query} onChange={handleQueryChange}
              onKeyDown={(e) => { if (e.key === 'Enter') { handleSearch(query); setMobileOpen(false) } }}
              placeholder="Search products..." className="input pl-9 pr-4 h-10 w-full text-sm"
            />
          </div>
          <nav className="flex flex-col gap-1">
            <Link to="/products" onClick={() => setMobileOpen(false)} className="sidebar-link font-semibold">All Products</Link>
            {categories.filter(c => !c.parent_id).map(cat => (
              <Link key={cat.id} to={`/products?categoryId=${cat.id}`} onClick={() => setMobileOpen(false)} className="sidebar-link">{cat.name}</Link>
            ))}
          </nav>
          {!user && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Link to="/sell" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-sm text-primary-600 font-medium">
                <Store size={14} /> Sell on GoMarts
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
