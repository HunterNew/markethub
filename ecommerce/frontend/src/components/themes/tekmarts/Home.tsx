import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../../../api/client'
import TekMartsProductCard from './ProductCard'
import { ProductCardSkeleton } from '../../ui'

interface Banner {
  id: number
  image_url: string
  title: string | null
  subtitle: string | null
  description: string | null
  link_url: string | null
}

function HeroBanner() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [current, setCurrent] = useState(0)
  const navigate = useNavigate()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    api.get('/banners').then(r => setBanners(r.data.banners || [])).catch(() => {})
  }, [])

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (banners.length <= 1) return
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % banners.length), 5000)
  }, [banners.length])

  useEffect(() => {
    startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [startTimer])

  return (
    <section className="tk-container mt-4 sm:mt-6">
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 min-h-[220px] sm:min-h-[300px] md:min-h-[380px] lg:min-h-[420px]">
        {/* Banner images as background */}
        {banners.length > 0 && banners.map((b, i) => (
          <div
            key={b.id}
            className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}
          >
            <img
              src={b.image_url}
              alt={b.title || ''}
              className="w-full h-full object-cover"
              onClick={() => b.link_url && navigate(b.link_url)}
              style={{ cursor: b.link_url ? 'pointer' : 'default' }}
            />
            {/* Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
          </div>
        ))}

        {/* Fallback when no banners */}
        {banners.length === 0 && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-100" />
        )}

        {/* Content overlay */}
        <div className="relative z-10 p-6 sm:p-8 md:p-12 lg:p-16 flex items-center h-full min-h-[220px] sm:min-h-[300px] md:min-h-[380px] lg:min-h-[420px]">
          <div className="max-w-md">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-3 sm:mb-4 text-white drop-shadow-lg">
              ELEVATE YOUR<br />
              <span className="text-primary-400">SHOPPING</span> LIFE.
            </h1>
            <p className="text-white/80 text-xs sm:text-sm md:text-base mb-4 sm:mb-6 max-w-sm drop-shadow">
              Discover the latest products from top vendors. Quality guaranteed, fast delivery.
            </p>
            <Link
              to="/products?sort=newest"
              className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm px-5 py-2.5 sm:px-6 sm:py-3 rounded-lg transition-colors shadow-lg"
            >
              Shop New Arrivals <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* Dots */}
        {banners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-white w-5' : 'bg-white/50'}`}
              />
            ))}
          </div>
        )}

        {/* Arrows */}
        {banners.length > 1 && (
          <>
            <button
              onClick={() => setCurrent(c => (c - 1 + banners.length) % banners.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-md hidden sm:flex"
            >
              <ChevronLeft size={16} className="text-gray-800" />
            </button>
            <button
              onClick={() => setCurrent(c => (c + 1) % banners.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-md hidden sm:flex"
            >
              <ChevronRight size={16} className="text-gray-800" />
            </button>
          </>
        )}
      </div>
    </section>
  )
}

function VendorSpotlight() {
  const [vendors, setVendors] = useState<any[]>([])

  useEffect(() => {
    api.get('/products/featured').then(r => {
      const products = r.data.products || []
      const vendorMap = new Map<string, any>()
      products.forEach((p: any) => {
        if (p.store_name && !vendorMap.has(p.store_name)) {
          vendorMap.set(p.store_name, { name: p.store_name, slug: p.store_slug, logo: p.store_logo })
        }
      })
      setVendors(Array.from(vendorMap.values()).slice(0, 8))
    }).catch(() => {})
  }, [])

  if (vendors.length === 0) return null

  return (
    <section className="tk-container mt-8 sm:mt-10">
      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-5">Vendor Spotlight</h2>
      <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-2 scrollbar-hide">
        {vendors.map(v => (
          <Link
            key={v.name}
            to={v.slug ? `/vendor/${v.slug}` : '/products'}
            className="flex flex-col items-center gap-2 flex-shrink-0 group"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-primary-400 bg-white flex items-center justify-center overflow-hidden group-hover:border-primary-600 group-hover:shadow-md transition-all">
              {v.logo ? (
                <img src={v.logo} alt={v.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-base sm:text-lg font-bold text-primary-500">{v.name[0]}</span>
              )}
            </div>
            <span className="text-[10px] sm:text-xs text-gray-600 font-medium text-center max-w-[70px] sm:max-w-[80px] truncate">{v.name}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function ProductGrid({ title, endpoint, viewAllHref }: { title: string; endpoint: string; viewAllHref: string }) {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(endpoint).then(r => setProducts(r.data.products || [])).catch(() => {}).finally(() => setLoading(false))
  }, [endpoint])

  if (!loading && products.length === 0) return null

  return (
    <section className="tk-container mt-8 sm:mt-10">
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h2>
        <Link to={viewAllHref} className="text-primary-500 hover:text-primary-700 text-xs sm:text-sm font-semibold flex items-center gap-1">
          View all <ArrowRight size={13} />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {loading
          ? Array(4).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)
          : products.slice(0, 8).map(p => <TekMartsProductCard key={p.id} product={p} />)
        }
      </div>
    </section>
  )
}

export default function TekMartsHome() {
  return (
    <div className="bg-[#f0f2f5] min-h-screen pb-10">
      <HeroBanner />
      <VendorSpotlight />
      <ProductGrid title="Featured Products" endpoint="/products/featured" viewAllHref="/products" />
      <ProductGrid title="New Arrivals" endpoint="/products/new-arrivals" viewAllHref="/products?sort=newest" />
      <ProductGrid title="Best Sellers" endpoint="/products/best-sellers" viewAllHref="/products?sort=popular" />
    </div>
  )
}
