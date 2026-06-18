import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../../../api/client'
import DarkGlassProductCard from './ProductCard'
import { ProductCardSkeleton } from '../../ui'

function HeroBanner() {
  const [banners, setBanners] = useState<any[]>([])
  const [current, setCurrent] = useState(0)
  const navigate = useNavigate()

  useEffect(() => { api.get('/banners').then(r => setBanners(r.data.banners || [])).catch(() => {}) }, [])
  useEffect(() => { if (banners.length <= 1) return; const t = setInterval(() => setCurrent(c => (c + 1) % banners.length), 5000); return () => clearInterval(t) }, [banners.length])

  return (
    <section className="dg-container mt-6">
      <div className="relative rounded-2xl overflow-hidden min-h-[260px] sm:min-h-[320px] md:min-h-[360px] border border-white/[0.06] shadow-[0_4px_40px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.04)]"
        style={{ background: 'linear-gradient(135deg, rgba(20,10,0,0.8) 0%, rgba(40,20,0,0.6) 40%, rgba(10,20,40,0.8) 100%)' }}>
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(249,115,22,0.08) 0%, transparent 60%)' }} />

        {/* Banner images */}
        {banners.length > 0 && banners.map((b, i) => (
          <div key={b.id} className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}>
            <img src={b.image_url} alt="" className="absolute right-0 top-0 h-full w-1/2 object-cover opacity-60 hidden md:block" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          </div>
        ))}

        <div className="relative z-10 p-8 sm:p-12 md:p-14 flex items-center min-h-[260px] sm:min-h-[320px] md:min-h-[360px]">
          <div className="max-w-md">
            <span className="text-[10px] text-primary-400 uppercase tracking-[2px] font-bold mb-3 block" style={{ textShadow: '0 0 10px rgba(249,115,22,0.3)' }}>✨ Limited Time Offer</span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight mb-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
              {banners[current]?.title || 'THE GREAT\nFESTIVAL SALE'}
            </h1>
            <p className="text-primary-400 text-lg sm:text-xl font-bold mb-3" style={{ textShadow: '0 0 15px rgba(249,115,22,0.2)' }}>
              {banners[current]?.subtitle || 'UP TO 80% OFF'}
            </p>
            <p className="text-white/50 text-xs sm:text-sm mb-6 max-w-xs">{banners[current]?.description || 'Discover premium products from verified vendors.'}</p>
            <Link to={banners[current]?.link_url || '/products'}
              className="inline-block px-6 py-3 rounded-lg border-[1.5px] border-primary-500 text-primary-400 text-xs font-bold uppercase tracking-wider backdrop-blur-sm hover:bg-primary-500 hover:text-white hover:shadow-[0_0_30px_rgba(249,115,22,0.3)] transition-all"
              style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0.05) 100%)' }}>
              SHOP NOW
            </Link>
          </div>
        </div>

        {banners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {banners.map((_, i) => <button key={i} onClick={() => setCurrent(i)} className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-primary-500 w-5' : 'bg-white/30'}`} />)}
          </div>
        )}
      </div>
    </section>
  )
}

function CategorySection() {
  const [cats, setCats] = useState<any[]>([])
  useEffect(() => { api.get('/categories').then(r => setCats((r.data.categories || []).filter((c: any) => !c.parent_id).slice(0, 8))).catch(() => {}) }, [])
  const fallback = ['👗','🌿','📱','💻','🏠','⚽','💄','🛒']

  return (
    <section className="dg-container mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-white/90">Shop by Category</h2>
        <Link to="/products" className="text-xs text-primary-400 font-semibold hover:underline">See All →</Link>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-3">
        {cats.map((cat, i) => (
          <Link key={cat.id} to={`/products?categoryId=${cat.id}`} className="dg-glass-card text-center py-4 px-2 group">
            <div className="w-14 h-14 mx-auto mb-2 rounded-full flex items-center justify-center text-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-white/[0.01] shadow-[0_4px_15px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.04)] group-hover:border-primary-500/40 group-hover:shadow-[0_0_20px_rgba(249,115,22,0.1)] transition-all">
              {cat.image_url ? <img src={cat.image_url} alt="" className="w-8 h-8 object-contain rounded" /> : fallback[i % fallback.length]}
            </div>
            <p className="text-[10px] sm:text-xs text-white/70 font-medium truncate">{cat.name}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}

function ProductSection({ title, endpoint, viewAllHref }: { title: string; endpoint: string; viewAllHref: string }) {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { api.get(endpoint).then(r => setProducts(r.data.products || [])).catch(() => {}).finally(() => setLoading(false)) }, [endpoint])
  if (!loading && products.length === 0) return null

  return (
    <section className="dg-container mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-white/90">{title}</h2>
        <Link to={viewAllHref} className="text-xs text-primary-400 font-semibold hover:underline">See All →</Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {loading ? Array(5).fill(0).map((_, i) => <ProductCardSkeleton key={i} />) : products.slice(0, 10).map(p => <DarkGlassProductCard key={p.id} product={p} />)}
      </div>
    </section>
  )
}

export default function DarkGlassHome() {
  return (
    <div className="pb-12">
      <HeroBanner />
      <CategorySection />
      <ProductSection title="Featured Products" endpoint="/products/featured" viewAllHref="/products" />
      <ProductSection title="New Arrivals" endpoint="/products/new-arrivals" viewAllHref="/products?sort=newest" />
      <ProductSection title="Best Sellers" endpoint="/products/best-sellers" viewAllHref="/products?sort=popular" />
    </div>
  )
}
