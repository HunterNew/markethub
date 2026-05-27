import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ShoppingBag, Star, Shield, Truck, RefreshCw, Zap, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../api/client'
import { formatCurrency } from '../utils/helpers'
import ProductCard from '../components/storefront/ProductCard'
import { ProductCardSkeleton } from '../components/ui'

interface Banner {
  id: number
  image_url: string
  title: string | null
  subtitle: string | null
  description: string | null
  link_url: string | null
}

function BannerSlider() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [current, setCurrent] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/banners').then(r => {
      setBanners(r.data.banners || [])
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    // Hero stays 30s, admin banners rotate every 4s
    const totalSlides = 1 + banners.length
    if (totalSlides <= 1) return
    const delay = current === 0 ? 8000 : 5000
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % totalSlides)
    }, delay)
  }, [banners.length, current])

  useEffect(() => {
    const totalSlides = 1 + banners.length
    if (totalSlides > 1) startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [banners.length, current, startTimer])

  const goTo = (index: number) => {
    setCurrent(index)
  }

  const prev = () => {
    const totalSlides = 1 + banners.length
    setCurrent(c => (c - 1 + totalSlides) % totalSlides)
  }

  const next = () => {
    const totalSlides = 1 + banners.length
    setCurrent(c => (c + 1) % totalSlides)
  }

  const handleClick = (banner: Banner) => {
    if (banner.link_url) {
      if (banner.link_url.startsWith('http')) {
        window.location.href = banner.link_url
      } else {
        navigate(banner.link_url)
      }
    }
  }

  // Combined slider: hero first, then admin banners
  if (!loaded) return (
    <div className="page-container mt-4">
      <div className="relative w-full h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden rounded-2xl">
        <div className="absolute inset-0"><HeroSectionFallback /></div>
      </div>
    </div>
  )

  // Total slides = 1 (hero) + admin banners
  const totalSlides = 1 + banners.length

  return (
    <div className="page-container mt-4">
    <div className="relative w-full h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden group rounded-2xl">
      {/* Slide 0: Static Hero */}
      <div className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${current === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
        <HeroSectionFallback />
      </div>

      {/* Slides 1+: Admin Banners */}
      {banners.length > 0 && banners.map((banner, i) => (
        <div
          key={banner.id}
          onClick={() => handleClick(banner)}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${(i + 1) === current ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'} ${banner.link_url ? 'cursor-pointer' : ''}`}
        >
          <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white h-full rounded-2xl">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-700/20 rounded-full blur-3xl" />
            </div>

            <div className="relative px-5 sm:px-8 md:px-12 py-6 sm:py-8 md:py-12 h-full flex items-center">
              <div className="grid md:grid-cols-2 gap-6 md:gap-12 items-center w-full">
                <div>
                  {banner.subtitle && (
                    <div className="inline-flex items-center gap-1.5 bg-primary-500/20 border border-primary-500/30 rounded-full px-3 py-1 text-xs sm:text-sm text-primary-300 font-medium mb-3 sm:mb-5">
                      <Zap size={12} /> {banner.subtitle}
                    </div>
                  )}
                  {banner.title && (
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-3 sm:mb-5">
                      {banner.title}
                    </h2>
                  )}
                  {banner.description && (
                    <p className="text-gray-300 text-xs sm:text-sm md:text-base mb-4 sm:mb-6 leading-relaxed">
                      {banner.description}
                    </p>
                  )}
                  {banner.link_url && (
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      <span className="btn-primary text-xs sm:text-sm px-4 sm:px-6 py-2 sm:py-2.5 inline-flex items-center gap-1">
                        Shop Now <ArrowRight size={14} />
                      </span>
                    </div>
                  )}
                </div>

                <div className="hidden md:block">
                  <div className="rounded-xl overflow-hidden h-full max-h-[350px]">
                    <img src={banner.image_url} alt={banner.title || 'Banner'} className="w-full h-full object-cover rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      ))}

      {/* Navigation dots */}
      {totalSlides > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); goTo(i) }}
              className={`w-2.5 h-2.5 rounded-full transition-all ${i === current ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'}`}
            />
          ))}
        </div>
      )}

      {/* Arrow buttons */}
      {totalSlides > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev() }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
          >
            <ChevronLeft size={20} className="text-gray-800" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next() }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
          >
            <ChevronRight size={20} className="text-gray-800" />
          </button>
        </>
      )}
    </div>
    </div>
  )
}

function HeroSectionFallback() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white h-full rounded-2xl">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-700/20 rounded-full blur-3xl" />
      </div>

      <div className="relative px-5 sm:px-8 md:px-12 py-6 sm:py-8 md:py-12 h-full flex items-center">
        <div className="grid md:grid-cols-2 gap-6 md:gap-12 items-center w-full">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-primary-500/20 border border-primary-500/30 rounded-full px-3 py-1 text-xs sm:text-sm text-primary-300 font-medium mb-3 sm:mb-5">
              <Zap size={12} /> New arrivals every day
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-3 sm:mb-5">
              Shop the Best
              <span className="text-primary-400 block">Multi-Vendor</span>
              Marketplace
            </h1>
            <p className="text-gray-300 text-xs sm:text-sm md:text-base mb-4 sm:mb-6 leading-relaxed hidden sm:block">
              Discover millions of products from verified vendors. Best prices, fast delivery, hassle-free returns.
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Link to="/products" className="btn-primary text-xs sm:text-sm px-4 sm:px-6 py-2 sm:py-2.5">
                Shop Now <ArrowRight size={14} />
              </Link>
              <Link to="/auth/register?role=vendor" className="btn-secondary text-xs sm:text-sm px-4 sm:px-6 py-2 sm:py-2.5 bg-white/10 border-white/20 text-white hover:bg-white/20">
                Start Selling
              </Link>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/10">
              {[['50K+', 'Products'], ['2K+', 'Vendors'], ['100K+', 'Customers']].map(([val, label]) => (
                <div key={label}>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">{val}</div>
                  <div className="text-[10px] sm:text-xs text-gray-400">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden md:block">
            <div className="grid grid-cols-2 gap-3">
              {[
                'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop',
                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop',
                'https://images.unsplash.com/photo-1542272604-787c3835535d?w=300&h=300&fit=crop',
                'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&h=300&fit=crop',
              ].map((src, i) => (
                <div key={i} className={`rounded-xl overflow-hidden ${i === 0 ? 'row-span-2' : ''}`}>
                  <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustBadges() {
  const badges = [
    { icon: <Truck size={20} />, title: 'Free Shipping', desc: 'On orders above ₹999' },
    { icon: <Shield size={20} />, title: 'Secure Payment', desc: '100% safe transactions' },
    { icon: <RefreshCw size={20} />, title: 'Easy Returns', desc: '30-day return policy' },
    { icon: <Star size={20} />, title: 'Top Quality', desc: 'Verified seller products' },
  ]
  return (
    <section className="py-5 sm:py-8 bg-white border-b border-gray-100">
      <div className="page-container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {badges.map(b => (
            <div key={b.title} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-50 text-primary-500 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                {b.icon}
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-xs sm:text-sm">{b.title}</p>
                <p className="text-[10px] sm:text-xs text-gray-400 hidden sm:block">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CategoryGrid() {
  const [cats, setCats] = useState<any[]>([])
  useEffect(() => {
    api.get('/categories').then(r => setCats(r.data.categories?.slice(0,8) || [])).catch(()=>{})
  }, [])

  const fallbackIcons = ['💻','👔','📚','🏡','⚽','💄','🧸','🛒']

  return (
    <section className="py-12">
      <div className="page-container">
        <div className="flex items-center justify-between mb-8">
          <h2 className="section-title">Shop by Category</h2>
          <Link to="/products" className="text-primary-500 hover:text-primary-700 text-sm font-semibold flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {cats.map((cat, i) => (
            <Link
              key={cat.id}
              to={`/products?categoryId=${cat.id}`}
              className="group relative flex flex-col items-center"
            >
              <div className="w-full aspect-square rounded-2xl overflow-hidden mb-3 bg-gray-100 ring-2 ring-transparent group-hover:ring-primary-400 transition-all duration-300 shadow-sm group-hover:shadow-lg">
                {cat.image_url ? (
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-orange-50 to-orange-100">
                    {fallbackIcons[i % fallbackIcons.length]}
                  </div>
                )}
              </div>
              <span className="text-sm font-semibold text-gray-800 group-hover:text-primary-600 transition-colors text-center leading-tight">
                {cat.name}
              </span>
              <span className="text-xs text-gray-400 mt-0.5">
                {cat.product_count} {cat.product_count === 1 ? 'item' : 'items'}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProductSection({ title, endpoint, viewAllHref }: { title: string; endpoint: string; viewAllHref: string }) {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(endpoint).then(r => setProducts(r.data.products || [])).catch(()=>{}).finally(() => setLoading(false))
  }, [endpoint])

  if (!loading && products.length === 0) return null

  return (
    <section className="py-12">
      <div className="page-container">
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title">{title}</h2>
          <Link to={viewAllHref} className="text-primary-500 hover:text-primary-700 text-sm font-semibold flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-4">
          {loading
            ? Array(4).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)
            : products.slice(0, 8).map(p => <ProductCard key={p.id} product={p} />)
          }
        </div>
      </div>
    </section>
  )
}

function BannerSection() {
  const [cards, setCards] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  const defaultCards = [
    { id: 'default-1', image_url: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=600&h=300&fit=crop', title: 'Latest Electronics', subtitle: 'Up to 40% off', link_url: '/products?categoryId=1' },
    { id: 'default-2', image_url: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&h=300&fit=crop', title: 'Fashion Trends', subtitle: 'New Season', link_url: '/products?categoryId=2' },
  ]

  useEffect(() => {
    api.get('/promo-cards').then(r => {
      setCards(r.data.cards || [])
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  const displayCards = loaded && cards.length > 0 ? cards : defaultCards

  return (
    <section className="py-8">
      <div className="page-container">
        <div className="grid md:grid-cols-2 gap-4">
          {displayCards.map(card => (
            <Link key={card.id} to={card.link_url || '/products'} className="relative rounded-2xl overflow-hidden group h-48">
              <img
                src={card.image_url}
                alt={card.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent flex items-center p-8">
                <div>
                  {card.subtitle && <p className="text-white/70 text-sm mb-1">{card.subtitle}</p>}
                  <h3 className="text-white text-2xl font-bold mb-3">{card.title}</h3>
                  <span className="bg-white text-gray-900 text-sm font-semibold px-4 py-1.5 rounded-full">Shop Now →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function DealsSection() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/products/on-sale').then(r => setProducts(r.data.products || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (!loading && products.length === 0) return null

  return (
    <section className="py-8">
      <div className="page-container">
        <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl p-5 sm:p-8 overflow-hidden relative">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-20 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />

          {/* Header */}
          <div className="flex items-center justify-between mb-5 relative z-10">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                🔥 Deals of the Day
              </h2>
              <p className="text-white/80 text-xs sm:text-sm mt-1">Limited time offers — grab them before they're gone!</p>
            </div>
            <Link to="/products" className="bg-white text-red-600 text-xs sm:text-sm font-bold px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
              View All
            </Link>
          </div>

          {/* Products horizontal scroll */}
          <div className="relative z-10 -mx-1">
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {loading
                ? Array(4).fill(0).map((_, i) => (
                    <div key={i} className="w-48 flex-shrink-0 bg-white/20 rounded-xl h-64 animate-pulse" />
                  ))
                : products.slice(0, 8).map(p => {
                    const disc = p.offer_price ? Math.round((1 - p.offer_price / p.price) * 100) : 0
                    return (
                      <Link key={p.id} to={`/products/${p.id}`} className="w-48 flex-shrink-0 bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow group">
                        <div className="relative h-36 overflow-hidden bg-gray-50">
                          {p.primary_image ? (
                            <img src={p.primary_image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">No image</div>
                          )}
                          {disc > 0 && (
                            <span className="absolute top-2 left-2 bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{disc}% OFF</span>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-xs text-gray-500 truncate">{p.store_name}</p>
                          <p className="text-sm font-semibold text-gray-800 line-clamp-1 mt-0.5">{p.name}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="font-bold text-gray-900">{formatCurrency(p.offer_price || p.price)}</span>
                            {p.offer_price && <span className="text-xs text-gray-400 line-through">{formatCurrency(p.price)}</span>}
                          </div>
                        </div>
                      </Link>
                    )
                  })
              }
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <div>
      <BannerSlider />
      <TrustBadges />
      <DealsSection />
      <CategoryGrid />
      <ProductSection title="🔥 Featured Products" endpoint="/products/featured" viewAllHref="/products" />
      <BannerSection />
      <ProductSection title="🆕 New Arrivals" endpoint="/products/new-arrivals" viewAllHref="/products?sort=newest" />
      <ProductSection title="🏆 Best Sellers" endpoint="/products/best-sellers" viewAllHref="/products?sort=popular" />
    </div>
  )
}
