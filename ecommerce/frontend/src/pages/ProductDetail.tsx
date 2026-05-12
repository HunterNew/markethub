import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Star, Store, Shield, Truck, ArrowLeft, Minus, Plus, Zap, Tag, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../api/client'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, formatDate } from '../utils/helpers'
import { Skeleton, StatusBadge } from '../components/ui'
import toast from '../components/ui/Toast'
import VariantSelector, { ProductVariant } from '../components/storefront/VariantSelector'

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [addingToCart, setAddingToCart] = useState(false)
  const [reviews, setReviews] = useState<any[]>([])
  const [reviewStats, setReviewStats] = useState<any>({ totalReviews: 0, avgRating: 0, distribution: {} })
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const { addToCart } = useCart()
  const { user } = useAuth()

  useEffect(() => {
    api.get(`/products/${id}`).then(r => {
      setProduct(r.data.product)
    }).catch(() => setProduct(null)).finally(() => setLoading(false))
    // Fetch reviews
    api.get(`/reviews/product/${id}`).then(r => {
      setReviews(r.data.reviews || [])
      setReviewStats(r.data.stats || { totalReviews: 0, avgRating: 0, distribution: {} })
    }).catch(() => {})
  }, [id])

  // Auto-slide images every 4 seconds
  useEffect(() => {
    if (!product || !product.images || product.images.length <= 1) return
    const timer = setInterval(() => {
      setSelectedImage(prev => (prev + 1) % (product.images?.length || 1))
    }, 4000)
    return () => clearInterval(timer)
  }, [product])

  const handleAddToCart = async () => {
    setAddingToCart(true)
    try {
      await addToCart(product.id, qty, selectedVariant?.id)
      const variantInfo = selectedVariant
        ? ` (${Object.entries(selectedVariant.option_combination).map(([k, v]) => `${k}: ${v}`).join(', ')})`
        : ''
      toast.success(`${product.name}${variantInfo} added to cart!`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add to cart')
    } finally { setAddingToCart(false) }
  }

  const isWholesaleApplicable = !!product?.wholesale_enabled && !!product?.wholesale_price && !!product?.wholesale_min_qty && qty >= product.wholesale_min_qty
  const wholesaleDiscountRatio = product?.wholesale_enabled && product?.price > 0 && product?.wholesale_price > 0
    ? product.wholesale_price / product.price
    : 1
  const displayPrice = selectedVariant
    ? (isWholesaleApplicable
        ? Math.round(selectedVariant.price * wholesaleDiscountRatio * 100) / 100
        : selectedVariant.price)
    : product?.has_variants && product?.variants?.length > 0
      ? Math.min(...product.variants.map((v: any) => Number(v.price)))
      : product?.is_on_sale && product?.offer_price
        ? product.offer_price
        : isWholesaleApplicable
          ? product?.wholesale_price
          : product?.price
  const effectiveStock = selectedVariant ? selectedVariant.stock_quantity : product?.stock_quantity
  const variantRequired = !!product?.has_variants && !selectedVariant

  if (loading) {
    return (
      <div className="page-container py-8">
        <div className="grid md:grid-cols-2 gap-12">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-3/4 rounded" />
            <Skeleton className="h-10 w-1/2 rounded" />
            <Skeleton className="h-20 rounded" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="page-container py-16 text-center">
        <h2 className="text-xl font-bold text-gray-700 mb-4">Product not found</h2>
        <Link to="/products" className="btn-primary">Browse Products</Link>
      </div>
    )
  }

  const images = product.images?.length > 0 ? product.images : [{ image_url: product.primary_image }]
  const discount = product.is_on_sale && product.offer_price
    ? Math.round((1 - product.offer_price / product.price) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="page-container py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-primary-600">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-primary-600">Products</Link>
          <span>/</span>
          <Link to={`/products?categoryId=${product.category_id}`} className="hover:text-primary-600">{product.category_name}</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium truncate max-w-xs">{product.name}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Images with auto-slide */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm group">
              <img
                src={images[selectedImage]?.image_url || 'https://via.placeholder.com/600'}
                alt={product.name}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage((selectedImage - 1 + images.length) % images.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setSelectedImage((selectedImage + 1) % images.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_: any, i: number) => (
                      <button key={i} onClick={() => setSelectedImage(i)}
                        className={`w-2 h-2 rounded-full transition-all ${i === selectedImage ? 'bg-primary-500 w-4' : 'bg-white/70 hover:bg-white'}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto scrollbar-hide">
                {images.map((img: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-colors ${i === selectedImage ? 'border-primary-500' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-5">
            {/* Vendor */}
            <Link to={`/vendor/${product.store_slug}`} className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium">
              <Store size={14} /> {product.store_name}
            </Link>

            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={16} className={s <= Math.round(reviewStats.avgRating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'} />
                ))}
              </div>
              <span className="text-sm text-gray-500">
                {reviewStats.avgRating > 0 ? `${reviewStats.avgRating} (${reviewStats.totalReviews} reviews)` : 'No reviews yet'}
              </span>
            </div>

            {/* Price */}
            <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-gray-900">{formatCurrency(displayPrice)}</span>
                {selectedVariant && isWholesaleApplicable && (
                  <span className="text-lg text-gray-400 line-through">{formatCurrency(selectedVariant.price)}</span>
                )}
                {(!!product.is_on_sale || isWholesaleApplicable) && !selectedVariant && !product.has_variants && (
                  <span className="text-lg text-gray-400 line-through">{formatCurrency(product.price)}</span>
                )}
                {discount > 0 && !selectedVariant && !product.has_variants && (
                  <span className="bg-red-500 text-white text-sm font-bold px-2 py-0.5 rounded-full">-{discount}%</span>
                )}
                {selectedVariant && isWholesaleApplicable && (
                  <span className="bg-blue-500 text-white text-sm font-bold px-2 py-0.5 rounded-full">
                    -{Math.round((1 - wholesaleDiscountRatio) * 100)}%
                  </span>
                )}
              </div>
              {!!product.has_variants && !selectedVariant && product.variants?.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {(() => {
                    const prices = product.variants.map((v: any) => Number(v.price))
                    const min = Math.min(...prices)
                    const max = Math.max(...prices)
                    return min === max
                      ? `Variant price: ${formatCurrency(min)}`
                      : `Price range: ${formatCurrency(min)} - ${formatCurrency(max)}`
                  })()}
                </p>
              )}
              {!!product.is_on_sale && product.offer_ends_at && (
                <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                  <Tag size={10} /> Sale ends {formatDate(product.offer_ends_at)}
                </p>
              )}
              {!!product.wholesale_enabled && product.wholesale_price > 0 && product.wholesale_min_qty > 0 && (
                <div className="mt-3 pt-3 border-t border-orange-200">
                  <div className="flex items-center gap-2 text-sm">
                    <Zap size={14} className="text-blue-600" />
                    {!!product.has_variants && selectedVariant ? (
                      <>
                        <span className="font-semibold text-blue-700">
                          Wholesale: {formatCurrency(
                            Math.round(selectedVariant.price * (product.wholesale_price / product.price) * 100) / 100
                          )}
                        </span>
                        <span className="text-gray-500">(min {product.wholesale_min_qty} units of this variant)</span>
                      </>
                    ) : !!product.has_variants ? (
                      <>
                        <span className="font-semibold text-blue-700">
                          Wholesale: {Math.round((1 - product.wholesale_price / product.price) * 100)}% off
                        </span>
                        <span className="text-gray-500">(min {product.wholesale_min_qty} units per variant)</span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-blue-700">Wholesale Price: {formatCurrency(product.wholesale_price)}</span>
                        <span className="text-gray-500">(min {product.wholesale_min_qty} units)</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Variant Selector */}
            {!!product.has_variants && Array.isArray(product.option_types) && product.option_types.length > 0 && (
              <VariantSelector
                optionTypes={product.option_types}
                variants={product.variants || []}
                selectedVariantId={selectedVariant?.id ?? null}
                onVariantSelect={setSelectedVariant}
              />
            )}

            {/* Stock */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${product.status === 'active' && effectiveStock > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={`text-sm font-medium ${effectiveStock > 0 ? 'text-green-700' : 'text-red-600'}`}>
                {!!product.has_variants && !selectedVariant
                  ? 'Select a variant to see availability'
                  : effectiveStock > 0 ? `${effectiveStock} in stock` : 'Out of stock'}
              </span>
            </div>

            {/* Quantity + Add to Cart */}
            {effectiveStock > 0 && (
              <div className="flex gap-4 items-center">
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="w-10 h-11 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center font-bold text-gray-900">{qty}</span>
                  <button
                    onClick={() => setQty(Math.min(effectiveStock, qty + 1))}
                    className="w-10 h-11 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={addingToCart || variantRequired}
                  className="flex-1 btn-primary py-3 justify-center text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingToCart ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : variantRequired ? (
                    <>Select Options</>
                  ) : (
                    <><ShoppingCart size={18} /> Add to Cart</>
                  )}
                </button>
              </div>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                { icon: <Shield size={16} />, text: 'Secure Payment' },
                { icon: <Truck size={16} />, text: 'Fast Delivery' },
              ].map(b => (
                <div key={b.text} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
                  <span className="text-primary-500">{b.icon}</span>
                  {b.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mt-12 card p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Product Description</h2>
          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{product.description}</p>
        </div>

        {/* Vendor info */}
        <div className="mt-6 card p-6 flex items-start gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
            {product.store_name?.[0] || 'V'}
          </div>
          <div className="flex-1">
            <Link to={`/vendor/${product.store_slug}`} className="font-bold text-gray-900 hover:text-primary-600 text-lg">
              {product.store_name}
            </Link>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.vendor_description}</p>
            <Link to={`/vendor/${product.store_slug}`} className="text-sm text-primary-500 hover:text-primary-700 font-medium mt-2 inline-flex items-center gap-1">
              View all products from this seller →
            </Link>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-8 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Customer Reviews</h2>
            {reviewStats.totalReviews > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">{reviewStats.avgRating}</span>
                <div>
                  <div className="flex">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={14} className={s <= Math.round(reviewStats.avgRating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">{reviewStats.totalReviews} reviews</p>
                </div>
              </div>
            )}
          </div>

          {/* Rating distribution */}
          {reviewStats.totalReviews > 0 && (
            <div className="space-y-1.5 mb-6 max-w-sm">
              {[5,4,3,2,1].map(star => {
                const count = reviewStats.distribution?.[star] || 0
                const pct = reviewStats.totalReviews > 0 ? (count / reviewStats.totalReviews) * 100 : 0
                return (
                  <div key={star} className="flex items-center gap-2 text-sm">
                    <span className="w-3 text-gray-500">{star}</span>
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 text-xs text-gray-400 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Review list */}
          {reviews.length === 0 ? (
            <p className="text-gray-400 text-sm py-4">No reviews yet. Be the first to review this product.</p>
          ) : (
            <div className="space-y-4 divide-y divide-gray-100">
              {reviews.map((r: any) => (
                <div key={r.id} className="pt-4 first:pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold">
                        {r.first_name?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{r.first_name} {r.last_name?.[0]}.</p>
                        <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={10} className={s <= r.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  {r.title && <p className="text-sm font-semibold text-gray-800 mt-2">{r.title}</p>}
                  {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
