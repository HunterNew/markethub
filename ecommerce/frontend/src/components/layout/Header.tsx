import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search, ShoppingCart, User, Menu, X, ChevronDown,
  Package, LayoutDashboard, LogOut, Heart, Bell, Store
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import api from '../../api/client'
import { debounce } from '../../utils/helpers'

export default function Header() {
  const { user, logout } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('search') || '')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  // Load recent searches
  useEffect(() => {
    if (user) {
      api.get('/search/history').then(r => setRecentSearches(r.data.history || [])).catch(() => {})
    } else {
      try { setRecentSearches(JSON.parse(localStorage.getItem('recent_searches') || '[]')) } catch { }
    }
  }, [user])

  // Close dropdowns on outside click
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
    // Save search
    if (user) {
      api.post('/search/history', { term }).catch(() => {})
      setRecentSearches(prev => [term, ...prev.filter(s => s !== term)].slice(0, 5))
    } else {
      const saved = JSON.parse(localStorage.getItem('recent_searches') || '[]')
      const updated = [term, ...saved.filter((s: string) => s !== term)].slice(0, 10)
      localStorage.setItem('recent_searches', JSON.stringify(updated))
      setRecentSearches(updated.slice(0, 5))
    }
    navigate(`/products?search=${encodeURIComponent(term)}`)
  }

  const clearRecentSearch = async (term: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (user) {
      await api.delete(`/search/history/${encodeURIComponent(term)}`).catch(() => {})
    } else {
      const saved = JSON.parse(localStorage.getItem('recent_searches') || '[]')
      localStorage.setItem('recent_searches', JSON.stringify(saved.filter((s: string) => s !== term)))
    }
    setRecentSearches(prev => prev.filter(s => s !== term))
  }

  const dashboardPath = user?.role === 'admin' ? '/admin' : user?.role === 'vendor' ? '/vendor' : '/customer'

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm pt-2">
      {/* Top bar */}
      {/* <div className="bg-gray-900 text-white text-xs py-1.5">
        <div className="page-container flex justify-between items-center">
          <span>🔥 Free shipping on orders above ₹999</span>
          <div className="flex gap-4">
            <Link to="/auth/login" className="hover:text-primary-400 transition-colors">Login</Link>
            <Link to="/auth/register" className="hover:text-primary-400 transition-colors">Register</Link>
          </div>
        </div>
      </div> */}

      {/* Main header */}
      <div className="page-container">
        <div className="flex items-center gap-2 sm:gap-4 h-14 sm:h-16">
          {/* Mobile menu toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 hover:bg-gray-100 rounded-xl flex-shrink-0">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 flex-shrink-0">
            <img src="/logo.png" alt="GoMarts" className="h-14 w-14 object-contain" />
            <div className="hidden sm:block" style={{ marginTop: '12px' }}>
              <span className="font-bold text-xl block" style={{ marginBottom: '-12px' }}>
                <span className="text-[#1e3a5f]">Go</span><span className="text-primary-500">Marts</span>
              </span>
              <span className="text-[9px] text-gray-400 font-medium tracking-wide">Shop Easy. Go Fast.</span>
            </div>
          </Link>

          {/* Search - hidden on mobile, shown in mobile menu */}
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
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden animate-slide-up">
                {query.length < 2 ? (
                  <>
                    {recentSearches.length > 0 && (
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Searches</p>
                          <button
                            onClick={async () => {
                              if (user) await api.delete('/search/history').catch(() => {})
                              else localStorage.removeItem('recent_searches')
                              setRecentSearches([])
                            }}
                            className="text-xs text-primary-500 hover:text-primary-700"
                          >
                            Clear all
                          </button>
                        </div>
                        {recentSearches.map(term => (
                          <div
                            key={term}
                            onClick={() => { setQuery(term); handleSearch(term) }}
                            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer group"
                          >
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Search size={14} className="text-gray-400" />
                              {term}
                            </div>
                            <button
                              onClick={(e) => clearRecentSearch(term, e)}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {recentSearches.length === 0 && (
                      <div className="p-6 text-center text-sm text-gray-400">
                        Start typing to search products...
                      </div>
                    )}
                  </>
                ) : suggestions.length > 0 ? (
                  <div className="p-2">
                    {suggestions.map((s: any) => (
                      <div
                        key={s.productId}
                        onClick={() => navigate(`/products/${s.productId}`)}
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
                ) : (
                  <div className="p-6 text-center text-sm text-gray-400">No suggestions found</div>
                )}
              </div>
            )}
          </div>

          {/* Mobile search icon */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-xl ml-auto"
          >
            <Search size={20} className="text-gray-700" />
          </button>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {(!user || user.role === 'customer') && (
              <Link to="/cart" className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <ShoppingCart size={22} className="text-gray-700" />
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
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden animate-slide-up">
                    <div className="p-3 border-b border-gray-100">
                      <p className="font-semibold text-gray-900 text-sm">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <div className="p-2">
                      <Link to={dashboardPath} onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                        <LayoutDashboard size={16} /> Dashboard
                      </Link>
                      {user.role === 'customer' && (
                        <Link to="/customer/orders" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                          <Package size={16} /> My Orders
                        </Link>
                      )}
                      <Link to={`${dashboardPath}/profile`} onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                        <User size={16} /> Profile
                      </Link>
                      <hr className="my-1 border-gray-100" />
                      <button onClick={logout}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg w-full">
                        <LogOut size={16} /> Sign Out
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

        {/* Category nav */}
        <nav className="hidden md:flex items-center gap-6 py-2 border-t border-gray-50">
          <Link to="/products" className="nav-link text-gray-800 font-semibold hover:text-primary-600">All Products</Link>
          <Link to="/products?categoryId=1" className="nav-link">Electronics</Link>
          <Link to="/products?categoryId=2" className="nav-link">Clothing</Link>
          <Link to="/products?categoryId=3" className="nav-link">Books</Link>
          <Link to="/products?categoryId=4" className="nav-link">Home & Garden</Link>
          <Link to="/products?categoryId=5" className="nav-link">Sports</Link>
          <Link to="/products?categoryId=6" className="nav-link">Beauty</Link>
          <div className="ml-auto">
            {!user && (
              <Link to="/auth/register?role=vendor" className="text-sm text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1">
                <Store size={14} /> Sell on GoMarts
              </Link>
            )}
          </div>
        </nav>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white p-4 animate-slide-up">
          {/* Mobile search */}
          <div className="relative mb-4" ref={searchRef}>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={handleQueryChange}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={(e) => { if (e.key === 'Enter') { handleSearch(query); setMobileOpen(false) } }}
              placeholder="Search products..."
              className="input pl-9 pr-4 h-10 w-full text-sm"
            />
            {/* Mobile search dropdown */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-100 shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto">
                {query.length < 2 ? (
                  <>
                    {recentSearches.length > 0 && (
                      <div className="p-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recent Searches</p>
                        {recentSearches.map(term => (
                          <div
                            key={term}
                            onClick={() => { setQuery(term); handleSearch(term); setMobileOpen(false) }}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
                          >
                            <Search size={14} className="text-gray-400" />
                            {term}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : suggestions.length > 0 ? (
                  <div className="p-2">
                    {suggestions.map((s: any) => (
                      <div
                        key={s.productId}
                        onClick={() => { navigate(`/products/${s.productId}`); setMobileOpen(false); setShowDropdown(false) }}
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
                ) : (
                  <div className="p-4 text-center text-sm text-gray-400">No suggestions found</div>
                )}
              </div>
            )}
          </div>
          <nav className="flex flex-col gap-1">
            <Link to="/products" onClick={() => setMobileOpen(false)} className="sidebar-link">All Products</Link>
            <Link to="/products?categoryId=1" onClick={() => setMobileOpen(false)} className="sidebar-link">Electronics</Link>
            <Link to="/products?categoryId=2" onClick={() => setMobileOpen(false)} className="sidebar-link">Clothing</Link>
            <Link to="/products?categoryId=3" onClick={() => setMobileOpen(false)} className="sidebar-link">Books</Link>
            <Link to="/products?categoryId=4" onClick={() => setMobileOpen(false)} className="sidebar-link">Home & Garden</Link>
            <Link to="/products?categoryId=5" onClick={() => setMobileOpen(false)} className="sidebar-link">Sports</Link>
            <Link to="/products?categoryId=6" onClick={() => setMobileOpen(false)} className="sidebar-link">Beauty</Link>
          </nav>
          {!user && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Link to="/auth/register?role=vendor" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 text-sm text-primary-600 font-medium">
                <Store size={14} /> Sell on GoMarts
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
