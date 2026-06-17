import React from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Heart } from 'lucide-react'
import { formatCurrency } from '../../utils/helpers'
import { useWishlist } from '../../context/WishlistContext'
import { useCart } from '../../context/CartContext'
import toast from '../ui/Toast'

interface Product {
  id: number
  name: string
  price: number
  mrp?: number
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
  brand_name?: string
  delivery_days?: number
}

export default function ProductCard({ product }: { product: Product }) {
  const { isWishlisted, toggle } = useWishlist()
  const { addToCart } = useCart()
  const wishlisted = isWishlisted(product.id)

  const displayPrice = product.is_on_sale && product.offer_price
    ? product.offer_price
    : product.has_variants && product.min_variant_price
      ? product.min_variant_price
      : product.price

  const strikePrice = product.is_on_sale && product.offer_price
    ? product.price
    : product.mrp && Number(product.mrp) > Number(product.price)
      ? Number(product.mrp)
      : null

  const discount = strikePrice
    ? Math.round((1 - Number(displayPrice) / Number(strikePrice)) * 100)
    : 0

  const outOfStock = product.status === 'out_of_stock' || product.stock_quantity === 0

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (outOfStock || product.has_variants) return
    try {
      await addToCart(product.id)
      toast.success('Added to cart')
    } catch {
      toast.error('Failed to add')
    }
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow duration-200 flex flex-col h-full group">
      {/* Image */}
      <Link to={`/products/${product.id}`} className="block relative aspect-[4/3] overflow-hidden bg-gray-50">
        {product.primary_image ? (
          <img
            src={product.primary_image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=No+Image' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl bg-gray-100">📦</div>
        )}

        {/* Discount badge */}
        {discount > 0 && (
          <span className="absolute top-2.5 left-2.5 bg-primary-500 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded">
            {discount}% OFF
          </span>
        )}

        {/* Wholesale badge - always bottom-left */}
        {!!product.wholesale_enabled && product.wholesale_price && (
          <span className="absolute bottom-2.5 left-2.5 bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
            ⚡ Wholesale
          </span>
        )}

        {/* Wishlist */}
        <button
          onClick={(e) => { e.preventDefault(); toggle(product.id) }}
          className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full shadow flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 ${wishlisted ? 'bg-red-50 text-red-500' : 'bg-white text-gray-400 hover:text-red-500'}`}
        >
          <Heart size={13} className={wishlisted ? 'fill-red-500' : ''} />
        </button>

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-gray-800 text-xs font-bold px-3 py-1 rounded">Out of Stock</span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        {/* Category */}
        <p className="text-[10px] sm:text-xs text-primary-500 font-semibold mb-0.5">
          {product.category_name || '\u00A0'}
        </p>

        {/* Name */}
        <Link to={`/products/${product.id}`}>
          <h3 className="font-semibold text-gray-900 line-clamp-2 leading-snug hover:text-primary-600 transition-colors" style={{ fontSize: '0.850rem' }}>
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1 mt-1.5 mb-1.5">
          {(product.avg_rating || 0) > 0 ? (
            <>
              <span className="inline-flex items-center gap-0.5 bg-green-600 text-white text-[10px] font-bold px-1 py-[1px] rounded">
                {Number(product.avg_rating || 0).toFixed(1)} ★
              </span>
              {(product.review_count || 0) > 0 && (
                <span className="text-[10px] text-gray-400">({product.review_count})</span>
              )}
            </>
          ) : <span className="text-[10px] text-transparent">-</span>}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1.5 mb-3 mt-auto">
          <span className="font-bold text-gray-900" style={{ fontSize: '1rem' }}>{formatCurrency(displayPrice)}</span>
          {strikePrice && (
            <>
              <span className="text-xs text-gray-400 line-through">{formatCurrency(strikePrice)}</span>
              <span className="text-xs text-green-600 font-medium">{discount}% off</span>
            </>
          )}
        </div>

        {/* Add to Cart button */}
        {!outOfStock ? (
          product.has_variants ? (
            <Link to={`/products/${product.id}`} className="w-full flex items-center justify-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2.5 rounded-lg transition-colors" style={{ fontSize: '0.85rem' }}>
              <ShoppingCart size={14} /> Select Options
            </Link>
          ) : (
            <button onClick={handleAddToCart} className="w-full flex items-center justify-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2.5 rounded-lg transition-colors" style={{ fontSize: '0.85rem' }}>
              <ShoppingCart size={14} /> Add to Cart
            </button>
          )
        ) : (
          <button disabled className="w-full flex items-center justify-center gap-1.5 bg-gray-200 text-gray-500 font-semibold py-2.5 rounded-lg cursor-not-allowed" style={{ fontSize: '0.85rem' }}>
            Out of Stock
          </button>
        )}
      </div>
    </div>
  )
}
