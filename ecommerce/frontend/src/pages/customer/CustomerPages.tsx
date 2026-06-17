import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle, Package, Truck, MapPin, Clock, XCircle, Star, RefreshCw } from 'lucide-react'
import api from '../../api/client'
import { formatCurrency, formatDateTime, getStatusColor, getStatusLabel } from '../../utils/helpers'
import { Skeleton, StatusBadge, Table } from '../../components/ui'
import { CustomerLayout } from '../../components/layout/DashboardLayout'
import { useAuth } from '../../context/AuthContext'
import toast from '../../components/ui/Toast'

function CustomerSupportCard() {
  const [adminWhatsapp, setAdminWhatsapp] = useState('919876543210')
  useEffect(() => {
    api.get('/config/support-contact').then(r => { if (r.data.whatsapp) setAdminWhatsapp(r.data.whatsapp) }).catch(() => {})
  }, [])
  return (
    <div className="mt-6 border border-gray-200 rounded-xl p-4 bg-white flex items-center justify-between">
      <div>
        <p className="font-bold text-gray-900 text-sm">Need Help?</p>
        <p className="text-xs text-gray-400">Chat with our support team on WhatsApp</p>
      </div>
      <a href={`https://wa.me/${adminWhatsapp}?text=${encodeURIComponent('Hi, I need help with my order on GoMarts.')}`} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Chat Support
      </a>
    </div>
  )
}

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
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })

  const fetchOrders = (p: number) => {
    setLoading(true)
    api.get(`/orders/my?page=${p}&limit=5`).then(r => {
      setOrders(r.data.orders || [])
      setPagination(r.data.pagination || { total: 0, pages: 1 })
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchOrders(page) }, [page])

  return (
    <CustomerLayout>
      <div className="p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Your Orders</h1>
        </div>

        {loading ? (
          <div className="space-y-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
        ) : orders.length === 0 ? (
          <div className="card p-16 text-center">
            <Package size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="font-semibold text-gray-500 mb-4">No orders yet</p>
            <Link to="/products" className="btn-primary">Start Shopping</Link>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map(order => (
              <div key={order.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                {/* Order Header */}
                <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Order Placed</p>
                    <p className="font-medium text-gray-700">{formatDateTime(order.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Total</p>
                    <p className="font-bold text-gray-900">{formatCurrency(order.total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Payment</p>
                    <p className="font-medium text-gray-700 capitalize">{order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method}</p>
                  </div>
                  {order.expected_delivery_date && order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'returned' && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Expected Delivery</p>
                      <p className="font-medium text-green-700">{new Date(order.expected_delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}</p>
                    </div>
                  )}
                  <div className="ml-auto text-right">
                    <p className="text-xs text-gray-500">ORDER # {order.id}</p>
                    <Link to={`/customer/orders/${order.id}`} className="text-primary-600 hover:text-primary-700 text-xs font-medium hover:underline">
                      View order details
                    </Link>
                  </div>
                </div>

                {/* Order Body */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Status */}
                      <div className="flex items-center gap-2 mb-3">
                        <StatusBadge status={order.status} />
                        <span className="text-sm text-gray-500">
                          {order.status === 'delivered' && 'Package was delivered'}
                          {order.status === 'shipped' && 'Package is on the way'}
                          {order.status === 'confirmed' && 'Order confirmed, awaiting shipment'}
                          {order.status === 'cancelled' && 'Order was cancelled'}
                          {order.status === 'return_requested' && 'Return requested'}
                          {order.status === 'returned' && 'Return completed, refund issued'}
                        </span>
                      </div>

                      {/* Product items */}
                      <div className="space-y-3">
                        {order.items?.map((item: any) => (
                          <div key={item.id} className="flex items-center gap-3">
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                              {item.product_image && <img src={item.product_image} alt="" className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 line-clamp-2">{item.product_name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity} × {formatCurrency(item.unit_price)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Link to={`/customer/orders/${order.id}`}
                        className="text-sm px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium text-center transition-colors">
                        View Details
                      </Link>
                      {order.status === 'delivered' && (
                        <Link to={`/customer/orders/${order.id}`}
                          className="text-sm px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium text-center transition-colors">
                          Write a Review
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 text-sm rounded-lg font-medium ${p === page ? 'bg-primary-500 text-white' : 'border border-gray-300 hover:bg-gray-50 text-gray-700'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
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
  const [showReturnForm, setShowReturnForm] = useState(false)
  const [returnReason, setReturnReason] = useState('')
  const [returnProofUrl, setReturnProofUrl] = useState('')
  const [uploadingProof, setUploadingProof] = useState(false)
  const [submittingReturn, setSubmittingReturn] = useState(false)

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

  const submitReturn = async () => {
    if (!returnReason.trim()) return toast.error('Please provide a reason')
    if (!returnProofUrl) return toast.error('Please upload a proof image')
    setSubmittingReturn(true)
    try {
      await api.post(`/orders/${id}/return`, { reason: returnReason, proofImageUrl: returnProofUrl })
      toast.success('Return request submitted!')
      setShowReturnForm(false)
      setReturnReason('')
      setReturnProofUrl('')
      fetchOrder()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit return request')
    } finally { setSubmittingReturn(false) }
  }

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('image', file)
    setUploadingProof(true)
    try {
      const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setReturnProofUrl(res.data.url)
      toast.success('Proof image uploaded')
    } catch {
      toast.error('Upload failed')
    } finally { setUploadingProof(false) }
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
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-400 mb-4 flex items-center gap-1">
          <Link to="/customer" className="hover:text-primary-600">Your Account</Link>
          <span>›</span>
          <Link to="/customer/orders" className="hover:text-primary-600">Your Orders</Link>
          <span>›</span>
          <span className="text-gray-600">Order Details</span>
        </nav>

        {loading ? (
          <div className="space-y-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        ) : !order ? (
          <p className="text-gray-500">Order not found</p>
        ) : (
          <div className="space-y-4 max-w-4xl">
            {/* Header: Title + Order meta + Invoice */}
            <div>
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900">Order Details</h1>
                <div className="flex items-center gap-3">
                  {order.status === 'confirmed' && (
                    <button onClick={cancelOrder} disabled={cancelling}
                      className="text-sm py-1.5 px-3 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg font-medium flex items-center gap-1">
                      {cancelling ? '...' : <><XCircle size={14} /> Cancel Order</>}
                    </button>
                  )}
                  {order.status !== 'cancelled' && (
                    <Link to={`/invoice/${order.id}`} target="_blank"
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline">
                      Invoice ↓
                    </Link>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Order placed {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                <span className="mx-2">|</span>
                Order #{order.id}
              </p>
            </div>

            {/* Ship to / Payment / Order Summary - 3 columns */}
            <div className="border border-gray-200 rounded-lg bg-white">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200 p-4 sm:p-5">
                {/* Ship to */}
                <div className="pb-4 md:pb-0 md:pr-5">
                  <p className="text-xs font-bold text-gray-900 uppercase mb-2">Ship to</p>
                  <p className="text-sm font-medium text-gray-800">{order.shipping_address?.name}</p>
                  <p className="text-sm text-gray-600">{order.shipping_address?.address}</p>
                  <p className="text-sm text-gray-600">{order.shipping_address?.city}, {order.shipping_address?.state} - {order.shipping_address?.pincode}</p>
                  <p className="text-sm text-gray-600">Ph: {order.shipping_address?.phone}</p>
                </div>
                {/* Payment */}
                <div className="py-4 md:py-0 md:px-5">
                  <p className="text-xs font-bold text-gray-900 uppercase mb-2">Payment method</p>
                  <p className="text-sm text-gray-700 capitalize">{order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method === 'razorpay' ? 'UPI / Net Banking' : 'Card'}</p>
                  <p className="text-xs text-gray-400 mt-1 capitalize">Status: {order.payment_status}</p>
                </div>
                {/* Order Summary */}
                <div className="pt-4 md:pt-0 md:pl-5">
                  <p className="text-xs font-bold text-gray-900 uppercase mb-2">Order Summary</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Item(s) Subtotal:</span><span className="text-gray-800">{formatCurrency(order.subtotal)}</span></div>
                    {Number(order.delivery_charge) > 0 && <div className="flex justify-between"><span className="text-gray-500">Shipping:</span><span className="text-gray-800">{formatCurrency(order.delivery_charge)}</span></div>}
                    {Number(order.tax_amount) > 0 && <div className="flex justify-between"><span className="text-gray-500">Tax:</span><span className="text-gray-800">{formatCurrency(order.tax_amount)}</span></div>}
                    {Number(order.discount_amount) > 0 && <div className="flex justify-between"><span className="text-gray-500">Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}:</span><span className="text-green-600">-{formatCurrency(order.discount_amount)}</span></div>}
                    <div className="flex justify-between font-bold border-t border-gray-100 pt-1 mt-1"><span className="text-gray-900">Grand Total:</span><span className="text-gray-900">{formatCurrency(order.total)}</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Horizontal Order Timeline */}
            <div className="border border-gray-200 rounded-lg bg-white p-4 sm:p-5">
              {(() => {
                const steps = [
                  { key: 'confirmed', label: 'Order Confirmed' },
                  { key: 'shipped', label: 'Shipped' },
                  { key: 'delivered', label: 'Delivered' },
                ]
                const statusOrder = ['confirmed', 'shipped', 'delivered']
                const currentIdx = statusOrder.indexOf(order.status)
                const isCancelled = order.status === 'cancelled'
                const isReturned = ['return_requested', 'returned'].includes(order.status)

                return (
                  <div>
                    {isCancelled ? (
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle size={18} />
                        <span className="font-medium">Order Cancelled</span>
                        {order.statusLog?.length > 0 && (
                          <span className="text-xs text-gray-400 ml-2">
                            on {formatDateTime(order.statusLog.find((l: any) => l.to_status === 'cancelled')?.created_at || order.updated_at)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Timeline row: circles + connecting lines */}
                        <div className="flex items-center">
                          {steps.map((step, i) => {
                            const isComplete = currentIdx > i || isReturned
                            const isCurrent = currentIdx === i && !isReturned
                            return (
                              <React.Fragment key={step.key}>
                                {/* Connecting line before (except first) */}
                                {i > 0 && (
                                  <div className={`flex-1 h-0.5 ${currentIdx >= i || isReturned ? 'bg-green-500' : 'bg-gray-200'}`} />
                                )}
                                {/* Circle */}
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                                  ${isComplete ? 'bg-green-500 text-white' : isCurrent ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                  {isComplete || isCurrent ? '✓' : i + 1}
                                </div>
                              </React.Fragment>
                            )
                          })}
                        </div>
                        {/* Labels row below */}
                        <div className="flex justify-between mt-2">
                          {steps.map((step, i) => {
                            const isComplete = currentIdx > i || isReturned
                            const isCurrent = currentIdx === i && !isReturned
                            return (
                              <div key={step.key} className={`text-center ${i === 0 ? 'text-left' : i === steps.length - 1 ? 'text-right' : 'text-center'}`} style={{ width: '33%' }}>
                                <p className={`text-xs ${isComplete || isCurrent ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>{step.label}</p>
                                {order.statusLog?.find((l: any) => l.to_status === step.key) && (
                                  <p className="text-[10px] text-gray-400">
                                    {new Date(order.statusLog.find((l: any) => l.to_status === step.key).created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                  </p>
                                )}
                                {step.key === 'delivered' && order.expected_delivery_date && !isComplete && (
                                  <p className="text-[10px] text-green-600">
                                    by {new Date(order.expected_delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        {isReturned && (
                          <div className="flex items-center gap-2 text-amber-600 mt-3 pt-3 border-t border-gray-100">
                            <RefreshCw size={14} />
                            <span className="text-sm font-medium">
                              {order.status === 'returned' ? 'Return Completed' : 'Return Requested'}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Items */}
            <div className="border border-gray-200 rounded-lg bg-white p-4 sm:p-5">
              <div className="space-y-4">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                    <Link to={`/products/${item.product_id}`} className="w-16 h-16 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                      {item.product_image ? <img src={item.product_image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
                    </Link>
                    <div className="flex-1">
                      <Link to={`/products/${item.product_id}`} className="text-sm text-primary-700 hover:text-primary-800 hover:underline font-medium">
                        {item.product_name}
                      </Link>
                      {item.variant_snapshot && (() => {
                        const snapshot = typeof item.variant_snapshot === 'string' ? JSON.parse(item.variant_snapshot) : item.variant_snapshot;
                        const options = Object.entries(snapshot).filter(([key]) => key !== 'price').map(([key, value]) => `${key}: ${value}`).join(', ');
                        return options ? <p className="text-xs text-gray-500 mt-0.5">{options}</p> : null;
                      })()}
                      <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity} × {formatCurrency(item.unit_price)}</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(item.unit_price * item.quantity)}</p>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Link to={`/products/${item.product_id}`}
                        className="text-xs py-1.5 px-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-center">
                        View product
                      </Link>
                      <button onClick={() => { setReviewItem(item); setReviewForm({ rating: 5, title: '', comment: '' }) }}
                        className="text-xs py-1.5 px-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-center">
                        Write a review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Return actions */}
            {order.status === 'delivered' && order.returnPolicyEnabled && !order.returnRequest && (
              <div className="border border-gray-200 rounded-lg bg-white p-4 sm:p-5">
                <button onClick={() => setShowReturnForm(true)}
                  className="text-sm py-2 px-4 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg font-medium flex items-center gap-1 transition-colors">
                  <RefreshCw size={14} /> Request Return
                </button>
              </div>
            )}
            {/* Return Request Status */}
            {order.returnRequest && (
              <div className="border border-gray-200 rounded-lg bg-white p-4 sm:p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><RefreshCw size={14} className="text-amber-500" /> Return Request</h3>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Status</span>
                    <StatusBadge status={order.returnRequest.status === 'refund_pending' ? 'pending' : order.returnRequest.status} />
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-gray-500">Reason</span>
                    <span className="text-gray-700 text-right max-w-[60%]">{order.returnRequest.reason}</span>
                  </div>
                  {order.returnRequest.vendor_note && (
                    <div className="flex items-start justify-between">
                      <span className="text-gray-500">Vendor Note</span>
                      <span className="text-gray-700 text-right max-w-[60%]">{order.returnRequest.vendor_note}</span>
                    </div>
                  )}
                  {order.returnRequest.status === 'refunded' && (
                    <p className="text-xs text-green-600 bg-green-50 rounded-lg p-2">Refund of {formatCurrency(order.returnRequest.refund_amount || order.total)} processed.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Return Request Form Modal */}
        {showReturnForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowReturnForm(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Request Return</h3>
              <p className="text-sm text-gray-500 mb-4">Upload proof and provide a reason. Return window: 10 days from delivery.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proof Image *</label>
                  {returnProofUrl && (
                    <div className="mb-2 rounded-xl overflow-hidden bg-gray-100 h-32">
                      <img src={returnProofUrl} alt="Proof" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleProofUpload} className="input text-sm" disabled={uploadingProof} />
                  {uploadingProof && <p className="text-xs text-gray-400 mt-1">Uploading...</p>}
                  <p className="text-xs text-gray-400 mt-1">Upload photo of damaged/wrong product</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={returnReason}
                    onChange={e => setReturnReason(e.target.value)}
                    placeholder="e.g. Product damaged, wrong item received, not as described..."
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowReturnForm(false)} className="btn-secondary flex-1">Cancel</button>
                  <button onClick={submitReturn} disabled={submittingReturn || uploadingProof} className="btn-primary flex-1 justify-center">
                    {submittingReturn ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Submit Request'}
                  </button>
                </div>
              </div>
            </div>
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
    api.get('/orders/my').then(r => setOrders(r.data.orders?.slice(0, 5) || [])).catch(() => {})
  }, [])

  const totalOrders = orders.length
  const delivered = orders.filter(o => o.status === 'delivered').length
  const pending = orders.filter(o => o.status === 'confirmed' || o.status === 'shipped').length
  const returned = orders.filter(o => o.status === 'returned' || o.status === 'return_requested').length

  return (
    <CustomerLayout>
      <div className="p-6 sm:p-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 sm:p-8 text-white mb-8">
          <h1 className="text-xl sm:text-2xl font-bold mb-1">Welcome back, {user?.firstName || 'there'}! 👋</h1>
          <p className="text-white/80 text-sm">Here's what's happening with your orders.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Orders', value: totalOrders, icon: <Package size={20} />, color: 'bg-blue-50 text-blue-600' },
            { label: 'Delivered', value: delivered, icon: <CheckCircle size={20} />, color: 'bg-green-50 text-green-600' },
            { label: 'In Progress', value: pending, icon: <Truck size={20} />, color: 'bg-orange-50 text-orange-600' },
            { label: 'Returns', value: returned, icon: <RefreshCw size={20} />, color: 'bg-purple-50 text-purple-600' },
          ].map(s => (
            <div key={s.label} className="border border-gray-200 rounded-xl p-4 bg-white">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.color.split(' ')[0]}`}>
                <span className={s.color.split(' ')[1]}>{s.icon}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recent Orders */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Recent Orders</h2>
          <Link to="/customer/orders" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View all →</Link>
        </div>

        {orders.length === 0 ? (
          <div className="border border-gray-200 rounded-xl p-12 text-center bg-white">
            <Package size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No orders yet</p>
            <Link to="/products" className="btn-primary text-sm">Start Shopping</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <Link key={order.id} to={`/customer/orders/${order.id}`}
                className="border border-gray-200 rounded-xl p-4 bg-white flex items-center gap-4 hover:border-primary-300 transition-colors">
                {/* Product thumbnail */}
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                  {order.items?.[0]?.product_image && <img src={order.items[0].product_image} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {order.items?.[0]?.product_name || `Order #${order.id}`}
                    {order.items?.length > 1 && <span className="text-gray-400"> +{order.items.length - 1} more</span>}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(order.created_at)}</p>
                </div>
                <StatusBadge status={order.status} />
                <span className="font-bold text-sm text-gray-900">{formatCurrency(order.total)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  )
}
