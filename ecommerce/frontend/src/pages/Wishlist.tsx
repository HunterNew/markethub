import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Trash2, ShoppingCart } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useWishlist } from '../context/WishlistContext'
import { useCart } from '../context/CartContext'
import { formatCurrency } from '../utils/helpers'
import toast from '../components/ui/Toast'

interface WishlistItem {
  id: number
  product_id: number
  name: string
  price: number
  stock_quantity: number
  status: string
  primary_image?: string
  store_name?: string
  offer_price?: number
  is_on_sale?: boolean
  avg_rating?: number
}

export default function WishlistPage() {
  const { user } = useAuth()
  const { toggle, isWishlisted } = useWishlist()
  const { addToCart } = useCart()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      api.get('/wishlist')
        .then(r => setItems(r.data.items || []))
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      // Guest: load from localStorage and fetch product details
      const loadGuest = async () => {
        try {
          const saved = JSON.parse(localStorage.getItem('guest_wishlist') || '[]')
          if (saved.length === 0) { setLoading(false); return }
          const results: WishlistItem[] = []
          for (const id of saved) {
            try {
              const r = await api.get(`/products/${id}`)
              const p = r.data.product
              if (p) results.push({ id: p.id, product_id: p.id, name: p.name, price: p.price, stock_quantity: p.stock_quantity, status: p.status, primary_image: p.images?.[0]?.image_url, store_name: p.store_name, offer_price: p.offer_price, is_on_sale: p.is_on_sale, avg_rating: p.avg_rating })
            } catch {}
          }
          setItems(results)
        } catch {}
        setLoading(false)
      }
      loadGuest()
    }
  }, [user])

  const handleRemove = async (productId: number) => {
    await toggle(productId)
    setItems(prev => prev.filter(i => i.product_id !== productId))
    toast.success('Removed from wishlist')
  }

  const handleAddToCart = async (item: WishlistItem) => {
    try {
      await addToCart(item.product_id)
      toast.success('Added to cart')
    } catch {
      toast.error('Failed to add to cart')
    }
  }

  if (loading) {
    return (
      <div className="page-container py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(3).fill(0).map((_, i) => <div key={i} className="h-48 bg-gray-100 rounded-xl" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container py-8">
      <div className="flex items-center gap-3 mb-6">
        <Heart size={24} className="text-red-500 fill-red-500" />
        <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
        <span className="text-sm text-gray-500">({items.length} items)</span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <Heart size={48} className="mx-auto text-gray-200 mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Your wishlist is empty</h2>
          <p className="text-sm text-gray-500 mb-4">Start adding products you love</p>
          <Link to="/products" className="btn-primary text-sm">Browse Products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map(item => (
            <div key={item.product_id} className="bg-white rounded-xl border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow">
              <Link to={`/products/${item.product_id}`} className="block relative aspect-square bg-gray-50 p-4">
                {item.primary_image ? (
                  <img src={item.primary_image} alt={item.name} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-200 text-4xl">📦</div>
                )}
                {(item.status === 'out_of_stock' || item.stock_quantity === 0) && (
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">Out of Stock</span>
                )}
              </Link>
              <div className="p-3">
                <Link to={`/products/${item.product_id}`}>
                  <h3 className="text-sm font-medium text-gray-800 line-clamp-2 hover:text-primary-600 transition-colors">{item.name}</h3>
                </Link>
                {item.store_name && <p className="text-[10px] text-gray-400 mt-0.5">{item.store_name}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-bold text-gray-900 text-sm">{formatCurrency(item.is_on_sale && item.offer_price ? item.offer_price : item.price)}</span>
                  {item.is_on_sale && item.offer_price && (
                    <span className="text-[10px] text-gray-400 line-through">{formatCurrency(item.price)}</span>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  {item.stock_quantity > 0 && item.status !== 'out_of_stock' && (
                    <button onClick={() => handleAddToCart(item)} className="flex-1 flex items-center justify-center gap-1 text-xs font-medium bg-primary-500 hover:bg-primary-600 text-white py-2 rounded-lg transition-colors">
                      <ShoppingCart size={12} /> Add to Cart
                    </button>
                  )}
                  <button onClick={() => handleRemove(item.product_id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
