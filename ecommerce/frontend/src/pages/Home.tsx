import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ShoppingBag, Star, Shield, Truck, RefreshCw, Zap } from 'lucide-react'
import api from '../api/client'
import ProductCard from '../components/storefront/ProductCard'
import { ProductCardSkeleton } from '../components/ui'

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-700/20 rounded-full blur-3xl" />
      </div>

      <div className="page-container relative py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-primary-500/20 border border-primary-500/30 rounded-full px-4 py-1.5 text-sm text-primary-300 font-medium mb-6">
              <Zap size={14} /> New arrivals every day
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Shop the Best
              <span className="text-primary-400 block">Multi-Vendor</span>
              Marketplace
            </h1>
            <p className="text-gray-300 text-lg mb-8 leading-relaxed">
              Discover millions of products from verified vendors. Best prices, fast delivery, hassle-free returns.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/products" className="btn-primary text-base px-8 py-3">
                Shop Now <ArrowRight size={18} />
              </Link>
              <Link to="/auth/register?role=vendor" className="btn-secondary text-base px-8 py-3 bg-white/10 border-white/20 text-white hover:bg-white/20">
                Start Selling
              </Link>
            </div>
            <div className="flex items-center gap-6 mt-8 pt-8 border-t border-white/10">
              {[['50K+', 'Products'], ['2K+', 'Vendors'], ['100K+', 'Happy Customers']].map(([val, label]) => (
                <div key={label}>
                  <div className="text-2xl font-bold text-white">{val}</div>
                  <div className="text-xs text-gray-400">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden md:block">
            <div className="grid grid-cols-2 gap-4">
              {[
                'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop',
                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop',
                'https://images.unsplash.com/photo-1542272604-787c3835535d?w=300&h=300&fit=crop',
                'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&h=300&fit=crop',
              ].map((src, i) => (
                <div key={i} className={`rounded-2xl overflow-hidden ${i === 0 ? 'row-span-2' : ''}`}>
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
    { icon: <Truck size={24} />, title: 'Free Shipping', desc: 'On orders above ₹999' },
    { icon: <Shield size={24} />, title: 'Secure Payment', desc: '100% safe transactions' },
    { icon: <RefreshCw size={24} />, title: 'Easy Returns', desc: '30-day return policy' },
    { icon: <Star size={24} />, title: 'Top Quality', desc: 'Verified seller products' },
  ]
  return (
    <section className="py-8 bg-white border-b border-gray-100">
      <div className="page-container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map(b => (
            <div key={b.title} className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 bg-orange-50 text-primary-500 rounded-xl flex items-center justify-center flex-shrink-0">
                {b.icon}
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{b.title}</p>
                <p className="text-xs text-gray-400">{b.desc}</p>
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
  return (
    <section className="py-8">
      <div className="page-container">
        <div className="grid md:grid-cols-2 gap-4">
          <Link to="/products?categoryId=1" className="relative rounded-2xl overflow-hidden group h-48">
            <img
              src="https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=600&h=300&fit=crop"
              alt="Electronics"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent flex items-center p-8">
              <div>
                <p className="text-white/70 text-sm mb-1">Up to 40% off</p>
                <h3 className="text-white text-2xl font-bold mb-3">Latest Electronics</h3>
                <span className="bg-white text-gray-900 text-sm font-semibold px-4 py-1.5 rounded-full">Shop Now →</span>
              </div>
            </div>
          </Link>
          <Link to="/products?categoryId=2" className="relative rounded-2xl overflow-hidden group h-48">
            <img
              src="https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&h=300&fit=crop"
              alt="Fashion"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent flex items-center p-8">
              <div>
                <p className="text-white/70 text-sm mb-1">New Season</p>
                <h3 className="text-white text-2xl font-bold mb-3">Fashion Trends</h3>
                <span className="bg-white text-gray-900 text-sm font-semibold px-4 py-1.5 rounded-full">Shop Now →</span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <div>
      <HeroSection />
      <TrustBadges />
      <CategoryGrid />
      <ProductSection title="🔥 Featured Products" endpoint="/products/featured" viewAllHref="/products" />
      <BannerSection />
      <ProductSection title="🆕 New Arrivals" endpoint="/products/new-arrivals" viewAllHref="/products?sort=newest" />
      <ProductSection title="🏆 Best Sellers" endpoint="/products/best-sellers" viewAllHref="/products?sort=popular" />
      <ProductSection title="🏷️ On Sale" endpoint="/products/on-sale" viewAllHref="/products" />
    </div>
  )
}
