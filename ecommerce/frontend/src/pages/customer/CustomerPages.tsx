import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle, Package, Truck, MapPin, Clock, XCircle, Star } from 'lucide-react'
import api from '../../api/client'
import { formatCurrency, formatDateTime, getStatusColor, getStatusLabel } from '../../utils/helpers'
import { Skeleton, StatusBadge, Table } from '../../components/ui'
import { CustomerLayout } from '../../components/layout/DashboardLayout'
import { useAuth } from '../../context/AuthContext'
import toast from '../../components/ui/Toast'

export function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<any>(null)

  useEffect(() => {
    api.get(`/orders/${id}`).then(r => setOrder(r.data.order)).catch(() => {})
  }, [id])

  if (!order) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="page-container py-16 max-w-2xl">
        <div className="card p-10 text-center animate-fade-in">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed! 🎉</h1>
          <p className="text-gray-500 mb-2">Thank you for your purchase</p>
          <p className="text-sm text-gray-400">Order #{order.id} • {formatDateTime(order.created_at)}</p>

          <div className="bg-gray-50 rounded-2xl p-5 mt-8 text-left space-y-3">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                  {item.product_image && <img src={item.product_image} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{item.product_name}</p>
                  <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                </div>
                <span className="font-bold text-sm">{formatCurrency(item.unit_price * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-3 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
              {Number(order.discount_amount) > 0 && <div className="flex justify-between text-sm text-green-600"><span>Discount {order.coupon_code && `(${order.coupon_code})`}</span><span>-{formatCurrency(order.discount_amount)}</span></div>}
              {Number(order.tax_amount) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Tax</span><span>{formatCurrency(order.tax_amount)}</span></div>}
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary-600">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 mt-4 flex items-start gap-3 text-left">
            <MapPin size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-semibold">{order.shipping_address?.name}</p>
              <p>{order.shipping_address?.address}, {order.shipping_address?.city} - {order.shipping_address?.pincode}</p>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <Link to="/customer/orders" className="btn-secondary flex-1 justify-center">View Orders</Link>
            <Link to="/products" className="btn-primary flex-1 justify-center">Continue Shopping</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CustomerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/orders/my').then(r => setOrders(r.data.orders || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <CustomerLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>
        {loading ? (
          <div className="space-y-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : orders.length === 0 ? (
          <div className="card p-16 text-center">
            <Package size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="font-semibold text-gray-500 mb-4">No orders yet</p>
            <Link to="/products" className="btn-primary">Start Shopping</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <Link key={order.id} to={`/customer/orders/${order.id}`}
                className="card p-5 flex items-center gap-4 hover:border-primary-200 transition-colors group">
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package size={20} className="text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900">Order #{order.id}</p>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{order.item_count} item(s) • {formatDateTime(order.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatCurrency(order.total)}</p>
                  <p className="text-xs text-gray-400 capitalize">{order.payment_method}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  )
}

export function CustomerOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [reviewItem, setReviewItem] = useState<any>(null)
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)

  const fetchOrder = () => {
    api.get(`/orders/${id}`).then(r => setOrder(r.data.order)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(fetchOrder, [id])

  const cancelOrder = async () => {
    if (!confirm('Cancel this order?')) return
    setCancelling(true)
    try {
      await api.post(`/orders/${id}/cancel`)
      toast.success('Order cancelled')
      fetchOrder()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel')
    } finally { setCancelling(false) }
  }

  const submitReview = async () => {
    setSubmittingReview(true)
    try {
      await api.post('/reviews', {
        productId: reviewItem.product_id,
        orderId: order.id,
        rating: reviewForm.rating,
        title: reviewForm.title || null,
        comment: reviewForm.comment || null,
      })
      toast.success('Review submitted!')
      setReviewItem(null)
      setReviewForm({ rating: 5, title: '', comment: '' })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit review')
    } finally { setSubmittingReview(false) }
  }

  return (
    <CustomerLayout>
      <div className="p-8">
        <Link to="/customer/orders" className="text-sm text-primary-500 hover:text-primary-700 flex items-center gap-1 mb-6">← Back to Orders</Link>
        {loading ? (
          <div className="space-y-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        ) : !order ? (
          <p className="text-gray-500">Order not found</p>
        ) : (
          <div className="space-y-6 max-w-3xl">
            <div className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Order #{order.id}</h1>
                  <p className="text-sm text-gray-500 mt-1">{formatDateTime(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={order.status} />
                  {order.status === 'confirmed' && (
                    <button onClick={cancelOrder} disabled={cancelling}
                      className="btn-danger text-sm py-1.5 px-3">
                      {cancelling ? '...' : <><XCircle size={14} /> Cancel</>}
                    </button>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                      {item.product_image && <img src={item.product_image} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 text-sm">{item.product_name}</p>
                      {item.variant_snapshot && (() => {
                        const snapshot = typeof item.variant_snapshot === 'string' ? JSON.parse(item.variant_snapshot) : item.variant_snapshot;
                        const options = Object.entries(snapshot).filter(([key]) => key !== 'price').map(([key, value]) => `${key}: ${value}`).join(', ');
                        return options ? <p className="text-xs text-primary-500 mt-0.5">{options}</p> : null;
                      })()}
                      <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity} × {formatCurrency(item.unit_price)}</p>
                      {item.tax_amount > 0 && <p className="text-xs text-gray-400">Tax: {formatCurrency(item.tax_amount)}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{formatCurrency(item.unit_price * item.quantity)}</span>
                      <button onClick={() => { setReviewItem(item); setReviewForm({ rating: 5, title: '', comment: '' }) }}
                        className="text-xs text-primary-500 hover:text-primary-700 font-medium flex items-center gap-0.5">
                        <Star size={10} /> Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
                {order.tax_amount > 0 && <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{formatCurrency(order.tax_amount)}</span></div>}
                {Number(order.discount_amount) > 0 && <div className="flex justify-between text-green-600"><span>Discount {order.coupon_code && <span className="text-xs">({order.coupon_code})</span>}</span><span>-{formatCurrency(order.discount_amount)}</span></div>}
                <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2">
                  <span>Total</span><span className="text-primary-600">{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Delivery */}
            <div className="card p-6">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Truck size={16} className="text-primary-500" /> Delivery Details</h3>
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                <p className="font-semibold text-gray-800">{order.shipping_address?.name}</p>
                <p>{order.shipping_address?.phone}</p>
                <p>{order.shipping_address?.address}</p>
                <p>{order.shipping_address?.city}, {order.shipping_address?.state} - {order.shipping_address?.pincode}</p>
              </div>
              <div className="mt-3 flex items-center gap-3 text-sm">
                <span className="text-gray-500">Payment:</span>
                <StatusBadge status={order.payment_status} />
                <span className="text-gray-600 capitalize">{order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method}</span>
              </div>
            </div>

            {/* Status Log */}
            {order.statusLog?.length > 0 && (
              <div className="card p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Clock size={16} className="text-primary-500" /> Order Timeline</h3>
                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-100" />
                  <div className="space-y-4">
                    {order.statusLog.map((log: any, i: number) => (
                      <div key={log.id} className="flex items-start gap-4 relative">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 ${i === 0 ? 'bg-primary-500 border-primary-500' : 'bg-white border-gray-200'}`}>
                          <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-white' : 'bg-gray-300'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 capitalize">{log.to_status.replace('_', ' ')}</p>
                          <p className="text-xs text-gray-400">{formatDateTime(log.created_at)}</p>
                          {log.note && <p className="text-xs text-gray-500 mt-0.5">"{log.note}"</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Review Modal */}
        {reviewItem && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setReviewItem(null)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Review Product</h3>
              <p className="text-sm text-gray-500 mb-4">{reviewItem.product_name}</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => setReviewForm({ ...reviewForm, rating: s })}
                        className="p-0.5">
                        <Star size={28} className={s <= reviewForm.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                  <input className="input" value={reviewForm.title} onChange={e => setReviewForm({ ...reviewForm, title: e.target.value })} placeholder="Summarize your experience" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comment (optional)</label>
                  <textarea className="input" rows={3} value={reviewForm.comment} onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })} placeholder="Tell others about this product..." />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setReviewItem(null)} className="btn-secondary flex-1">Cancel</button>
                  <button onClick={submitReview} disabled={submittingReview} className="btn-primary flex-1 justify-center">
                    {submittingReview ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Submit Review'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  )
}

export function CustomerDashboard() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    api.get('/orders/my').then(r => setOrders(r.data.orders?.slice(0,5) || [])).catch(() => {})
  }, [])

  return (
    <CustomerLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Hello, {user?.firstName || 'there'}! 👋</h1>
        <p className="text-gray-500 mb-8">Welcome to your dashboard</p>
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Orders', value: orders.length, color: 'bg-blue-50 text-blue-600' },
            { label: 'Delivered', value: orders.filter(o => o.status === 'delivered').length, color: 'bg-green-50 text-green-600' },
            { label: 'Pending', value: orders.filter(o => o.status === 'confirmed').length, color: 'bg-orange-50 text-orange-600' },
          ].map(s => (
            <div key={s.label} className="card p-5 text-center">
              <div className={`text-3xl font-bold mb-1 ${s.color.split(' ')[1]}`}>{s.value}</div>
              <div className="text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
        <h2 className="font-bold text-gray-900 mb-4">Recent Orders</h2>
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="card p-8 text-center"><p className="text-gray-400">No orders yet. <Link to="/products" className="text-primary-500">Start shopping!</Link></p></div>
          ) : orders.map(order => (
            <Link key={order.id} to={`/customer/orders/${order.id}`} className="card p-4 flex items-center gap-4 hover:border-primary-200 transition-colors">
              <Package size={18} className="text-primary-400 flex-shrink-0" />
              <div className="flex-1"><p className="font-medium text-gray-800 text-sm">Order #{order.id}</p>
                <p className="text-xs text-gray-400">{formatDateTime(order.created_at)}</p></div>
              <StatusBadge status={order.status} />
              <span className="font-bold text-sm">{formatCurrency(order.total)}</span>
            </Link>
          ))}
        </div>
      </div>
    </CustomerLayout>
  )
}
