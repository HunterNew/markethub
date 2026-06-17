import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Trash2, Plus, Minus, Package, Tag, X, ArrowRight } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { formatCurrency } from '../utils/helpers'
import { EmptyState } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import toast from '../components/ui/Toast'

export default function CartPage() {
  const { items, total, itemCount, updateQuantity, removeItem, clearCart, refreshCart } = useCart()
  const navigate = useNavigate()
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const { user } = useAuth()

  const applyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    try {
      const res = await api.post('/cart/coupon', { code: couponCode.toUpperCase() })
      setAppliedCoupon(res.data.coupon)
      toast.success(`Coupon applied! You save ${formatCurrency(res.data.discountAmount)}`)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid coupon')
    } finally { setCouponLoading(false) }
  }

  const removeCoupon = async () => {
    try { await api.delete('/cart/coupon') } catch {}
    setAppliedCoupon(null)
    setCouponCode('')
  }

  const discount = appliedCoupon
    ? appliedCoupon.discount_type === 'percentage'
      ? total * appliedCoupon.discount_value / 100
      : Math.min(appliedCoupon.discount_value, total)
    : 0

  const finalTotal = Math.max(0, total - discount)

  if (itemCount === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <EmptyState
          icon={<ShoppingCart size={64} />}
          title="Your cart is empty"
          description="Looks like you haven't added anything yet."
          action={<Link to="/products" className="btn-primary">Start Shopping</Link>}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="page-container py-8">
        <div className="flex items-center gap-3 mb-8">
          <ShoppingCart size={24} className="text-primary-500" />
          <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
          <span className="badge badge-orange">{itemCount} items</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map(item => (
              <div key={item.id} className="card p-4 flex gap-4">
                <Link to={`/products/${item.product_id}`} className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                  {item.primary_image ? (
                    <img src={item.primary_image} alt={item.name} className="w-full h-full object-cover" />
                  ) : <Package size={24} className="m-auto text-gray-300" />}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${item.product_id}`}>
                    <h3 className="font-semibold text-gray-800 text-sm hover:text-primary-600 line-clamp-2">{item.name}</h3>
                  </Link>
                  <p className="text-xs text-gray-500 mt-0.5">{item.store_name}</p>
                  {item.option_combination && Object.keys(item.option_combination).length > 0 && (
                    <p className="text-xs text-primary-600 font-medium mt-0.5">
                      {Object.entries(item.option_combination).map(([key, val]) => `${key}: ${val}`).join(' • ')}
                    </p>
                  )}
                  {item.variant_id && !item.option_combination && (
                    <p className="text-xs text-primary-500 mt-0.5">Variant #{item.variant_id}</p>
                  )}
                  {/* Price per unit info */}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gray-500">{formatCurrency(item.unit_price)} each</span>
                    {item.retail_price && item.unit_price < item.retail_price && (
                      <span className="text-xs text-gray-400 line-through">{formatCurrency(item.retail_price)}</span>
                    )}
                    {!!item.wholesale_enabled && item.wholesale_min_qty && item.retail_price && item.unit_price < item.retail_price && item.quantity >= item.wholesale_min_qty && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">Wholesale applied</span>
                    )}
                    {!!item.wholesale_enabled && item.wholesale_min_qty && item.quantity < item.wholesale_min_qty && (
                      <span className="text-xs text-blue-500">Add {item.wholesale_min_qty - item.quantity} more for wholesale price</span>
                    )}
                  </div>
                  {!!item.is_on_sale && (
                    <span className="badge badge-error text-xs mt-1">Sale</span>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-600">
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.stock_quantity}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-600 disabled:opacity-40">
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="font-bold text-gray-900">{formatCurrency(item.unit_price * item.quantity)}</span>
                        {item.retail_price && item.unit_price < item.retail_price && (
                          <p className="text-xs text-green-600">You save {formatCurrency((item.retail_price - item.unit_price) * item.quantity)}</p>
                        )}
                      </div>
                      <button onClick={() => removeItem(item.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {item.quantity >= item.stock_quantity && (
                    <p className="text-xs text-amber-600 mt-1">Maximum stock reached</p>
                  )}
                </div>
              </div>
            ))}
            <button onClick={clearCart} className="btn-ghost text-sm text-red-500 hover:text-red-700 hover:bg-red-50 w-full justify-center mt-2">
              <Trash2 size={14} /> Clear Cart
            </button>
          </div>

          {/* Order Summary */}
          <div className="space-y-4">
            {/* Coupon */}
            <div className="card p-5">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Tag size={16} className="text-primary-500" /> Coupon Code</h3>
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                  <div>
                    <p className="text-sm font-bold text-green-700">{appliedCoupon.code}</p>
                    <p className="text-xs text-green-600">You save {formatCurrency(discount)}</p>
                  </div>
                  <button onClick={removeCoupon} className="text-green-600 hover:text-red-500 p-1 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                    placeholder="Enter code" className="input flex-1 text-sm" />
                  <button onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()} className="btn-primary px-4 py-2 text-sm">
                    {couponLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Apply'}
                  </button>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="card p-5">
              <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal ({itemCount} items)</span>
                  <span className="font-medium">{formatCurrency(total)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon Discount</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-gray-400 text-xs">Calculated at checkout</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="text-gray-400 text-xs">Calculated at checkout</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-base">
                  <span>Estimated Total</span>
                  <span className="text-primary-600">{formatCurrency(finalTotal)}</span>
                </div>
              </div>
              {user ? (
                <button
                  onClick={() => navigate('/checkout', { state: { appliedCoupon, discount } })}
                  className="btn-primary w-full justify-center mt-4 py-3 text-base">
                  Proceed to Checkout <ArrowRight size={18} />
                </button>
              ) : (
                <Link to="/auth/login?redirect=/cart" className="btn-primary w-full justify-center mt-4 py-3 text-base">
                  Login to Checkout <ArrowRight size={18} />
                </Link>
              )}
              <Link to="/products" className="btn-ghost w-full justify-center mt-2 text-sm">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
