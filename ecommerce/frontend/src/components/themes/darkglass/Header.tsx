import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ShoppingCart, Heart, Menu, X, ChevronDown, User, LayoutDashboard, Package, LogOut, Store } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useCart } from '../../../context/CartContext'
import { useWishlist } from '../../../context/WishlistContext'
import api from '../../../api/client'
import { debounce } from '../../../utils/helpers'

export default function DarkGlassHeader() {
  const { user, logout } = useAuth()
  const { itemCount } = useCart()
  const { count: wishlistCount } = useWishlist()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [showCatModal, setShowCatModal] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => { api.get('/categories').then(r => setCategories(r.data.categories || [])).catch(() => {}) }, [])
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
    try { const res = await api.get(`/search/suggestions?q=${encodeURIComponent(q)}`); setSuggestions(res.data.suggestions || []) } catch { setSuggestions([]) }
  }, 300)

  const handleSearch = (term: string) => { if (!term.trim()) return; setShowDropdown(false); navigate(`/products?search=${encodeURIComponent(term)}`) }
  const dashboardPath = user?.role === 'admin' ? '/admin' : user?.role === 'vendor' ? '/vendor' : '/customer'

  return (
    <>
      <header className="dg-header sticky top-0 z-50">
        <div className="dg-container">
          <div className="flex items-center h-14 sm:h-16 gap-2">
            {/* Mobile menu */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-1.5 flex-shrink-0 mr-2">
              <img src="/logo.png" alt="GoMarts" className="h-9 w-9 drop-shadow-[0_0_8px_rgba(249,115,22,0.3)]" />
              <span className="hidden sm:block font-extrabold text-lg"><span className="text-white">Go</span><span className="text-primary-500">Marts</span></span>
            </Link>

            {/* Nav - centered */}
            <nav className="hidden lg:flex items-center justify-center gap-0.5 flex-1">
              <Link to="/" className="dg-nav-link">Home</Link>
              <div className="relative group">
                <Link to="/products" className="dg-nav-link flex items-center gap-1">Categories <ChevronDown size={11} className="opacity-60" /></Link>
                <div className="absolute top-full left-0 pt-1 hidden group-hover:block z-50">
                  <div className="dg-glass rounded-xl min-w-[180px] py-2">
                    {categories.filter(c => !c.parent_id).slice(0, 6).map(cat => (
                      <Link key={cat.id} to={`/products?categoryId=${cat.id}`} className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5">{cat.name}</Link>
                    ))}
                    {categories.filter(c => !c.parent_id).length > 6 && (
                      <button onClick={() => setShowCatModal(true)} className="block w-full text-left px-4 py-2 text-sm text-primary-400 hover:bg-white/5 font-medium border-t border-white/5 mt-1 pt-2">More...</button>
                    )}
                  </div>
                </div>
              </div>
              <Link to="/products?sort=newest" className="dg-nav-link">Latest</Link>
              <Link to="/products?on_sale=true" className="dg-nav-link">Offers</Link>
              <Link to="/contact" className="dg-nav-link">Contact</Link>
            </nav>

            {/* Right: Search + Icons + Login */}
            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
              {/* Search */}
              <div className="hidden md:block relative" ref={searchRef}>
                <input
                  type="text" value={query}
                  onChange={e => { setQuery(e.target.value); if (e.target.value.length >= 2) fetchSuggestions(e.target.value); else setSuggestions([]) }}
                  onFocus={() => setShowDropdown(true)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch(query)}
                  placeholder="Search products"
                  className="w-48 lg:w-56 h-9 pl-3 pr-10 rounded-lg bg-[#0f1f33] border border-white/10 text-white text-sm placeholder-gray-500 outline-none focus:border-primary-500/50 transition-all"
                />
                <button onClick={() => handleSearch(query)} className="absolute right-0 top-0 h-9 w-9 flex items-center justify-center bg-primary-500 hover:bg-primary-600 rounded-r-lg text-white transition-colors">
                  <Search size={14} />
                </button>
                {showDropdown && suggestions.length > 0 && (
                  <div className="absolute top-full right-0 mt-2 w-72 dg-glass rounded-xl overflow-hidden z-50">
                    {suggestions.map((s: any) => (
                      <div key={s.productId} onClick={() => { navigate(`/products/${s.productId}`); setShowDropdown(false) }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0">
                        <Search size={12} className="text-gray-500" />
                        <div><p className="text-sm text-white/90">{s.name}</p><p className="text-xs text-gray-500">{s.categoryName}</p></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile search */}
              <button onClick={() => setMobileOpen(true)} className="md:hidden dg-icon-btn"><Search size={16} /></button>

              {/* Wishlist */}
              <Link to="/wishlist" className="hidden sm:flex dg-icon-btn relative">
                <Heart size={16} />
                {wishlistCount > 0 && <span className="dg-badge">{wishlistCount > 9 ? '9+' : wishlistCount}</span>}
              </Link>

              {/* Cart */}
              {(!user || user.role === 'customer') && (
                <Link to="/cart" className="dg-icon-btn relative">
                  <ShoppingCart size={16} />
                  {itemCount > 0 && <span className="dg-badge">{itemCount > 9 ? '9+' : itemCount}</span>}
                </Link>
              )}

              {/* Sell */}
              {!user && (
                <Link to="/sell" className="hidden lg:flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 font-medium px-2">
                  <Store size={13} /> Sell
                </Link>
              )}

              {/* User */}
              {user ? (
                <div className="relative" ref={userRef}>
                  <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="dg-icon-btn text-xs font-bold">
                    {user.firstName?.[0] || 'U'}
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 dg-glass rounded-xl overflow-hidden z-50">
                      <div className="p-3 border-b border-white/5"><p className="text-sm font-semibold text-white">{user.firstName}</p><p className="text-xs text-gray-500">{user.email}</p></div>
                      <div className="p-1.5">
                        <Link to={dashboardPath} onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg"><LayoutDashboard size={14} /> Dashboard</Link>
                        {user.role === 'customer' && (
                          <Link to="/customer/orders" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg"><Package size={14} /> My Orders</Link>
                        )}
                        <Link to={`${dashboardPath}/profile`} onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg"><User size={14} /> Profile</Link>
                        <button onClick={logout} className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/5 rounded-lg w-full"><LogOut size={14} /> Sign Out</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/auth/login" className="dg-btn-login">Login</Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Nav line below header — visible on lg only */}
      <div className="dg-nav hidden lg:block">
        <div className="dg-container h-0" />
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-white/5 p-4" style={{ background: 'linear-gradient(180deg, #0d1b2e, #0a1628)' }}>
          <div className="relative mb-3">
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { handleSearch(query); setMobileOpen(false) } }}
              placeholder="Search products..." className="w-full h-10 pl-4 pr-12 rounded-lg bg-[#0f1f33] border border-white/10 text-white text-sm placeholder-gray-500 outline-none" />
            <button onClick={() => { handleSearch(query); setMobileOpen(false) }} className="absolute right-0 top-0 h-10 w-11 flex items-center justify-center bg-primary-500 rounded-r-lg text-white">
              <Search size={15} />
            </button>
          </div>
          <nav className="flex flex-col gap-0.5">
            <Link to="/" onClick={() => setMobileOpen(false)} className="dg-nav-link">Home</Link>
            <Link to="/products" onClick={() => setMobileOpen(false)} className="dg-nav-link">Products</Link>
            <Link to="/products?sort=newest" onClick={() => setMobileOpen(false)} className="dg-nav-link">Latest</Link>
            <Link to="/products?on_sale=true" onClick={() => setMobileOpen(false)} className="dg-nav-link">Offers</Link>
            <Link to="/contact" onClick={() => setMobileOpen(false)} className="dg-nav-link">Contact</Link>
          </nav>
        </div>
      )}

      {/* Categories Modal */}
      {showCatModal && (
        <>
          <div className="fixed inset-0 bg-black/70 z-[60]" onClick={() => setShowCatModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[90vw] max-w-lg max-h-[80vh] overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(15,25,50,0.98), rgba(10,18,35,0.98))', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h3 className="font-bold text-white text-lg">All Categories</h3>
              <button onClick={() => setShowCatModal(false)} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-70px)]">
              <div className="grid grid-cols-2 gap-2">
                {categories.filter(c => !c.parent_id).map(cat => (
                  <Link key={cat.id} to={`/products?categoryId=${cat.id}`} onClick={() => setShowCatModal(false)}
                    className="flex items-center gap-2 px-3 py-3 rounded-xl border border-white/5 hover:border-primary-500/30 hover:bg-white/[0.03] text-sm text-gray-300 hover:text-white transition-all">
                    {cat.image_url ? <img src={cat.image_url} alt="" className="w-7 h-7 rounded object-cover" /> : <span className="text-lg">📦</span>}
                    <span className="truncate">{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
