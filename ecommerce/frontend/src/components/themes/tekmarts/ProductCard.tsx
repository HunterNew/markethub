import React from 'react'
import { Link } from 'react-router-dom'
import { Star, Eye, ShoppingBag } from 'lucide-react'
import { formatCurrency } from '../../../utils/helpers'

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
  avg_rating?: number
  review_count?: number
  has_variants?: boolean
  min_variant_price?: number
  max_variant_price?: number
  brand_name?: string
}

export default function TekMartsProductCard({ product }: { product: Product }) {
  const displayPrice = product.is_on_sale && product.offer_price
    ? product.offer_price
    : product.has_variants && product.min_variant_price
      ? product.min_variant_price
      : product.price

  const hasVariantPriceRange = product.has_variants && product.min_variant_price && product.max_variant_price && product.min_variant_price !== product.max_variant_price && !product.is_on_sale

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden group hover:shadow-lg transition-all duration-200">
      {/* Image */}
      <Link to={`/products/${product.id}`} className="block relative aspect-square overflow-hidden bg-white p-3 sm:p-4">
        {product.primary_image ? (
          <img
            src={product.primary_image}
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x400?text=No+Image' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-200">
            <ShoppingBag size={40} />
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 border-t border-gray-50">
        {/* Title */}
        <Link to={`/products/${product.id}`}>
          <h3 className="text-xs sm:text-sm font-medium text-gray-800 line-clamp-2 leading-snug mb-1.5 hover:text-primary-600 transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        {(product.avg_rating || 0) > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <div className="flex items-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={10}
                  className={i < Math.round(product.avg_rating || 0) ? 'fill-primary-500 text-primary-500' : 'fill-gray-200 text-gray-200'}
                />
              ))}
            </div>
            <span className="text-[10px] text-gray-500">{Number(product.avg_rating || 0).toFixed(1)}</span>
          </div>
        )}

        {/* Price */}
        <div className="mb-2">
          {hasVariantPriceRange ? (
            <span className="font-bold text-gray-900 text-sm">{formatCurrency(product.min_variant_price!)}</span>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-gray-900 text-sm">{formatCurrency(displayPrice)}</span>
              {!!product.is_on_sale && product.offer_price && (
                <span className="text-[10px] text-gray-400 line-through">{formatCurrency(product.price)}</span>
              )}
            </div>
          )}
        </div>

        {/* View Details */}
        <div className="flex items-center justify-between">
          <Link
            to={`/products/${product.id}`}
            className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            <Eye size={11} /> View Details
          </Link>
          {product.store_name && (
            <span className="text-[9px] sm:text-[10px] text-gray-400 truncate max-w-[60px] sm:max-w-[80px]">{product.store_name}</span>
          )}
        </div>
      </div>
    </div>
  )
}
