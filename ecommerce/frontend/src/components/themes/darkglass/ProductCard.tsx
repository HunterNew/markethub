import React from 'react'
import { Link } from 'react-router-dom'
import { Star, Heart } from 'lucide-react'
import { formatCurrency } from '../../../utils/helpers'
import { useWishlist } from '../../../context/WishlistContext'

interface Product {
  id: number; name: string; price: number; mrp?: number; offer_price?: number; is_on_sale?: boolean
  primary_image?: string; store_name?: string; stock_quantity: number; status: string
  avg_rating?: number; review_count?: number; has_variants?: boolean
  min_variant_price?: number; max_variant_price?: number; brand_name?: string
  wholesale_enabled?: boolean; wholesale_price?: number; wholesale_min_qty?: number
}

export default function DarkGlassProductCard({ product }: { product: Product }) {
  const { isWishlisted, toggle } = useWishlist()
  const wishlisted = isWishlisted(product.id)

  const displayPrice = product.is_on_sale && product.offer_price ? product.offer_price
    : product.has_variants && product.min_variant_price ? product.min_variant_price : product.price

  const showMrp = product.mrp && Number(product.mrp) > Number(product.price) && !product.is_on_sale
  const showSale = !!product.is_on_sale && !!product.offer_price
  const discount = showSale ? Math.round((1 - Number(product.offer_price) / Number(product.price)) * 100)
    : showMrp ? Math.round((1 - Number(product.price) / Number(product.mrp!)) * 100) : 0

  return (
    <div className="dg-glass-card group overflow-hidden">
      {/* Image */}
      <Link to={`/products/${product.id}`} className="block relative aspect-square p-3 bg-gradient-to-b from-white/[0.02] to-black/10">
        {product.primary_image ? (
          <img src={product.primary_image} alt={product.name} className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)] group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-3xl">📦</div>
        )}
        <button
          onClick={e => { e.preventDefault(); toggle(product.id) }}
          className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full backdrop-blur-sm border flex items-center justify-center text-xs transition-all opacity-0 group-hover:opacity-100 ${wishlisted ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-black/40 border-white/10 text-white'}`}
        >
          <Heart size={12} className={wishlisted ? 'fill-red-400' : ''} />
        </button>
        {(product.status === 'out_of_stock' || product.stock_quantity === 0) && (
          <span className="absolute top-2.5 left-2.5 text-[9px] font-bold bg-red-500/80 text-white px-2 py-0.5 rounded backdrop-blur-sm">Out of Stock</span>
        )}
      </Link>

      {/* Info */}
      <div className="p-3">
        {product.brand_name && <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">{product.brand_name}</p>}
        <Link to={`/products/${product.id}`}>
          <h3 className="text-xs font-medium text-white/85 line-clamp-2 leading-relaxed mb-2 hover:text-primary-400 transition-colors">{product.name}</h3>
        </Link>
        {(product.avg_rating || 0) > 0 && (
          <div className="flex items-center gap-1 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={9} className={i < Math.round(product.avg_rating || 0) ? 'fill-amber-400 text-amber-400' : 'fill-gray-700 text-gray-700'} />
            ))}
            <span className="text-[9px] text-gray-500 ml-1">{Number(product.avg_rating || 0).toFixed(1)}</span>
          </div>
        )}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm font-bold text-white">{formatCurrency(displayPrice)}</span>
          {showSale && <span className="text-[10px] text-gray-500 line-through">{formatCurrency(product.price)}</span>}
          {showMrp && !showSale && <span className="text-[10px] text-gray-500 line-through">{formatCurrency(Number(product.mrp))}</span>}
          {discount > 0 && <span className="text-[10px] text-green-400 font-semibold">{discount}% off</span>}
        </div>
        {!!product.wholesale_enabled && product.wholesale_price && (
          <p className="text-[9px] text-blue-400 mt-1">Wholesale: {formatCurrency(product.wholesale_price)} (min {product.wholesale_min_qty})</p>
        )}
      </div>
    </div>
  )
}
