import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Star, Heart, Zap, Package } from 'lucide-react'
import { formatCurrency } from '../../utils/helpers'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import toast from '../ui/Toast'

interface Product {
  id: number
  name: string
  price: number
  offer_price?: number
  is_on_sale?: boolean
  primary_image?: string
  store_name?: string
  store_slug?: string
  category_name?: string
  stock_quantity: number
  status: string
  wholesale_price?: number
  wholesale_min_qty?: number
  wholesale_enabled?: boolean
  avg_rating?: number
  review_count?: number
  has_variants?: boolean
  min_variant_price?: number
  max_variant_price?: number
}

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart, loading } = useCart()
  const { user } = useAuth()
  const [wishlisted, setWishlisted] = useState(false)
  const [addingToCart, setAddingToCart] = useState(false)

  const displayPrice = product.is_on_sale && product.offer_price
    ? product.offer_price
    : product.has_variants && product.min_variant_price
      ? product.min_variant_price
      : product.price
  const hasVariantPriceRange = product.has_variants && product.min_variant_price && product.max_variant_price && product.min_variant_price !== product.max_variant_price && !product.is_on_sale
  const discount = product.is_on_sale && product.offer_price
    ? Math.round((1 - product.offer_price / product.price) * 100)
    : 0

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    setAddingToCart(true)
    try {
      await addToCart(product.id)
      toast.success('Added to cart!')
    } catch {
      toast.error('Failed to add to cart')
    } finally {
      setAddingToCart(false)
    }
  }

  return (
    <div className="card group relative overflow-hidden flex flex-col h-full">
      {/* Image */}
      <Link to={`/products/${product.id}`} className="block relative aspect-[4/3] overflow-hidden bg-gray-50 rounded-t-2xl">
        {product.primary_image ? (
          <img
            src={product.primary_image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=No+Image' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={40} className="text-gray-300" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {!!product.is_on_sale && discount > 0 && (
            <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {discount}% OFF
            </span>
          )}
          {product.status === 'out_of_stock' && (
            <span className="bg-gray-800 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              Out of Stock
            </span>
          )}
          {!!product.wholesale_enabled && (
            <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <Zap size={10} /> Wholesale
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={(e) => { e.preventDefault(); setWishlisted(!wishlisted) }}
          className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
        >
          <Heart size={14} className={wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
        </button>
      </Link>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <Link to={`/products/${product.id}`} className="block flex-1">
          <p className="text-xs text-primary-500 font-medium mb-1">{product.store_name}</p>
          <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 hover:text-primary-600 transition-colors mb-2">
            {product.name}
          </h3>
          <div className="flex items-center gap-1 mb-3">
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={11} className={s <= Math.round(product.avg_rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-200'} />
            ))}
            {(product.review_count || 0) > 0 && (
              <span className="text-xs text-gray-400 ml-1">({product.review_count})</span>
            )}
          </div>
        </Link>

        {/* Price */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              {hasVariantPriceRange ? (
                <span className="font-bold text-gray-900 text-base">
                  {`${formatCurrency(product.min_variant_price!)} – ${formatCurrency(product.max_variant_price!)}`}
                </span>
              ) : (
                <>
                  <span className="font-bold text-gray-900 text-base">{formatCurrency(displayPrice)}</span>
                  {!!product.is_on_sale && product.offer_price && (
                    <span className="text-xs text-gray-400 line-through">{formatCurrency(product.price)}</span>
                  )}
                </>
              )}
            </div>
            {!!product.wholesale_enabled && product.wholesale_price && (
              <p className="text-xs text-blue-600 font-medium">
                Wholesale: {formatCurrency(product.wholesale_price)} (min {product.wholesale_min_qty})
              </p>
            )}
          </div>

          {product.status !== 'out_of_stock' && (!user || user.role === 'customer') && !product.has_variants && (
            <button
              onClick={handleAddToCart}
              disabled={addingToCart || loading}
              className="w-9 h-9 bg-primary-500 hover:bg-primary-600 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 shadow-sm hover:shadow-md"
            >
              {addingToCart ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ShoppingCart size={16} />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
