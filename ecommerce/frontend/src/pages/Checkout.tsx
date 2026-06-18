import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MapPin, Phone, User, Plus, CreditCard, Truck, ShieldCheck } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { formatCurrency } from '../utils/helpers'
import api from '../api/client'
import toast from '../components/ui/Toast'

declare global {
  interface Window {
    Razorpay: any
  }
}

export default function CheckoutPage() {
  const { items, total, refreshCart } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const { appliedCoupon, discount = 0 } = (location.state as any) || {}
  const [loading, setLoading] = useState(false)

  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [address, setAddress] = useState({ name: '', phone: '', address: '', city: '', state: '', pincode: '', landmark: '' })
  const [payMethod, setPayMethod] = useState<'cod'|'stripe'|'razorpay'>('razorpay')

  useEffect(() => {
    api.get('/auth/addresses').then(r => {
      const addrs = r.data.addresses || []
      setSavedAddresses(addrs)
      const defaultAddr = addrs.find((a: any) => a.is_default) || addrs[0]
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id)
        setAddress({ name: defaultAddr.name, phone: defaultAddr.phone, address: defaultAddr.address, city: defaultAddr.city, state: defaultAddr.state, pincode: defaultAddr.pincode, landmark: defaultAddr.landmark || '' })
      } else { setShowNewForm(true) }
    }).catch(() => { setShowNewForm(true) })
  }, [])

  // Delivery charge calculation
  const shipping = (() => {
    let deliveryTotal = 0
    const vendorGroups: Record<string, { items: any[], subtotal: number }> = {}
    items.forEach(item => {
      const key = item.store_name || 'default'
      if (!vendorGroups[key]) vendorGroups[key] = { items: [], subtotal: 0 }
      vendorGroups[key].items.push(item)
      vendorGroups[key].subtotal += item.unit_price * item.quantity
    })
    Object.values(vendorGroups).forEach(group => {
      const firstItem = group.items[0] as any
      const freeAbove = Number(firstItem.free_delivery_above) || 0
      if (freeAbove > 0 && group.subtotal >= freeAbove) return
      group.items.forEach((item: any) => {
        const pType = item.product_delivery_type && item.product_delivery_type !== 'vendor_default' ? item.product_delivery_type : (firstItem.vendor_delivery_type || 'per_product')
        const pCharge = item.product_delivery_type && item.product_delivery_type !== 'vendor_default' ? Number(item.product_delivery_charge) || 0 : null
        if (pType === 'per_kg') {
          const chargePerKg = pCharge !== null ? pCharge : (Number(firstItem.delivery_charge_per_kg) || 0)
          deliveryTotal += (Number(item.weight_kg) || 0.5) * item.quantity * chargePerKg
        } else {
          const chargePerProduct = pCharge !== null ? pCharge : (Number(firstItem.delivery_charge_per_product) || 0)
          const weight = Number(item.weight_kg) || 0.3
          const totalWeight = weight * item.quantity
          const perKgRate = Number(firstItem.delivery_charge_per_kg) || 0
          if (totalWeight > 1 && perKgRate > 0) { deliveryTotal += totalWeight * perKgRate }
          else { deliveryTotal += chargePerProduct }
        }
      })
    })
    return Math.round(deliveryTotal * 100) / 100
  })()

  const finalTotal = total - discount + shipping
  const setAddr = (k: string, v: string) => setAddress(prev => ({ ...prev, [k]: v }))

  const selectAddress = (addr: any) => {
    setSelectedAddressId(addr.id)
    setAddress({ name: addr.name, phone: addr.phone, address: addr.address, city: addr.city, state: addr.state, pincode: addr.pincode, landmark: addr.landmark || '' })
    setShowNewForm(false)
  }

  const placeOrder = async () => {
    if (!address.name || !address.phone || !address.address || !address.city || !address.state || !address.pincode) {
      return toast.error('Please fill delivery address')
    }

    // Save new address if entered manually
    if (showNewForm && !selectedAddressId) {
      api.post('/auth/addresses', { ...address, isDefault: savedAddresses.length === 0 }).catch(() => {})
    }

    if (payMethod === 'razorpay') {
      setLoading(true)
      try {
        const { data } = await api.post('/orders/razorpay-order', { amount: finalTotal })
        const options = {
          key: 'rzp_test_SpEw8OA2Q6EfK6',
          amount: data.amount, currency: data.currency, name: 'GoMarts', description: 'Order Payment',
          order_id: data.order_id,
          prefill: { name: address.name, contact: address.phone },
          handler: async (response: any) => {
            try {
              await api.post('/orders/razorpay-verify', { razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature })
              const res = await api.post('/orders', { shippingAddress: address, paymentMethod: payMethod, razorpayOrderId: response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id, couponCode: appliedCoupon?.code })
              await refreshCart()
              toast.success('Order placed!')
              navigate(`/order-confirmation/${res.data.orderId}`)
            } catch (err: any) { toast.error(err.response?.data?.message || 'Payment failed') }
          },
          modal: { ondismiss: () => { setLoading(false); toast.error('Payment cancelled') } },
          theme: { color: '#f97316' },
        }
        const rzp = new window.Razorpay(options)
        rzp.on('payment.failed', (r: any) => { setLoading(false); toast.error(r.error?.description || 'Payment failed') })
        rzp.open()
      } catch (err: any) { setLoading(false); toast.error(err.response?.data?.message || 'Failed to initiate payment') }
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/orders', { shippingAddress: address, paymentMethod: payMethod, couponCode: appliedCoupon?.code })
      await refreshCart()
      toast.success('Order placed!')
      navigate(`/order-confirmation/${res.data.orderId}`)
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to place order') }
    finally { setLoading(false) }
  }

  const codAvailable = items.every(item => item.cod_enabled !== false && item.cod_enabled !== 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="page-container py-6 sm:py-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* LEFT - Address + Payment */}
          <div className="lg:col-span-2 space-y-5">

            {/* Delivery Address */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin size={16} className="text-primary-500" /> Delivery Address
              </h2>

              {savedAddresses.length > 0 && !showNewForm && (
                <div className="space-y-2.5">
                  {savedAddresses.map(addr => (
                    <label key={addr.id}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${selectedAddressId === addr.id ? 'border-primary-500 bg-orange-50' : 'border-gray-200 hover:border-primary-300'}`}
                      onClick={() => selectAddress(addr)}>
                      <input type="radio" name="address" checked={selectedAddressId === addr.id} onChange={() => selectAddress(addr)} className="accent-primary-500 mt-1" />
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{addr.name} {addr.is_default && <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full ml-1">Default</span>}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{addr.address}, {addr.city}, {addr.state} - {addr.pincode}</p>
                        <p className="text-xs text-gray-400 mt-0.5">📞 {addr.phone}</p>
                      </div>
                    </label>
                  ))}
                  <button onClick={() => { setShowNewForm(true); setSelectedAddressId(null); setAddress({ name: '', phone: '', address: '', city: '', state: '', pincode: '', landmark: '' }) }}
                    className="flex items-center gap-2 text-xs text-primary-600 hover:text-primary-700 font-medium p-3 border border-dashed border-gray-300 rounded-xl w-full justify-center hover:border-primary-400">
                    <Plus size={14} /> Add New Address
                  </button>
                </div>
              )}

              {showNewForm && (
                <div>
                  {savedAddresses.length > 0 && (
                    <button onClick={() => { setShowNewForm(false); selectAddress(savedAddresses.find((a: any) => a.is_default) || savedAddresses[0]) }}
                      className="text-xs text-primary-500 hover:text-primary-700 mb-3">← Use saved address</button>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="label text-xs">Full Name *</label><input value={address.name} onChange={e => setAddr('name', e.target.value)} placeholder="John Doe" className="input text-sm" /></div>
                    <div><label className="label text-xs">Phone *</label><input value={address.phone} onChange={e => setAddr('phone', e.target.value)} placeholder="9876543210" className="input text-sm" /></div>
                    <div className="sm:col-span-2"><label className="label text-xs">Address *</label><textarea value={address.address} onChange={e => setAddr('address', e.target.value)} rows={2} placeholder="Flat/House, Street, Area" className="input text-sm resize-none" /></div>
                    <div><label className="label text-xs">City *</label><input value={address.city} onChange={e => setAddr('city', e.target.value)} placeholder="Mumbai" className="input text-sm" /></div>
                    <div><label className="label text-xs">State *</label><input value={address.state} onChange={e => setAddr('state', e.target.value)} placeholder="Maharashtra" className="input text-sm" /></div>
                    <div><label className="label text-xs">Pincode *</label><input value={address.pincode} onChange={e => setAddr('pincode', e.target.value)} placeholder="400001" className="input text-sm" maxLength={6} /></div>
                    <div><label className="label text-xs">Landmark</label><input value={address.landmark} onChange={e => setAddr('landmark', e.target.value)} placeholder="Near..." className="input text-sm" /></div>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard size={16} className="text-primary-500" /> Payment Method
              </h2>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { id: 'razorpay', label: 'UPI / Net Banking', icon: '📱', disabled: false },
                  { id: 'cod', label: 'Cash on Delivery', icon: '💵', disabled: !codAvailable },
                  { id: 'stripe', label: 'Card Payment', icon: '💳', disabled: false },
                ].map(m => (
                  <label key={m.id} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all ${m.disabled ? 'opacity-40 cursor-not-allowed border-gray-100' : payMethod === m.id ? 'border-primary-500 bg-orange-50 cursor-pointer' : 'border-gray-200 hover:border-primary-300 cursor-pointer'}`}>
                    <input type="radio" name="payment" value={m.id} checked={payMethod === m.id as any} onChange={() => !m.disabled && setPayMethod(m.id as any)} disabled={m.disabled} className="accent-primary-500" />
                    <span className="text-xl">{m.icon}</span>
                    <span className="text-xs font-medium text-gray-700">{m.label}</span>
                  </label>
                ))}
              </div>
              {!codAvailable && <p className="text-[10px] text-red-500 mt-2">COD not available for some items in your cart</p>}
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Truck size={16} className="text-primary-500" /> Order Items ({items.length})
              </h2>
              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                      {item.primary_image && <img src={item.primary_image} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">
                        {item.name}
                        {item.unit && item.unit_value ? <span className="text-gray-400 font-normal text-xs ml-1">({Math.round(Number(item.unit_value))}{item.unit})</span> : ''}
                      </p>
                      {item.option_combination && Object.keys(item.option_combination).length > 0 && (
                        <div className="flex gap-1 mt-0.5">
                          {Object.entries(item.option_combination).map(([k, v]) => <span key={k} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{k}: {v}</span>)}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(item.unit_price)} × {item.quantity}</p>
                    </div>
                    <p className="font-bold text-gray-900 text-sm flex-shrink-0">{formatCurrency(item.unit_price * item.quantity)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT - Order Summary (Sticky) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-20">
              <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span><span className="font-medium">{formatCurrency(total)}</span></div>
                {discount > 0 && <div className="flex justify-between text-green-600"><span>Coupon ({appliedCoupon?.code})</span><span>-{formatCurrency(discount)}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500">Delivery</span><span className={shipping === 0 ? 'text-green-600 font-medium' : 'font-medium'}>{shipping === 0 ? 'FREE' : formatCurrency(shipping)}</span></div>
                <div className="border-t border-gray-100 pt-2.5 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary-600">{formatCurrency(finalTotal)}</span>
                </div>
              </div>

              <button onClick={placeOrder} disabled={loading}
                className="w-full mt-5 bg-primary-500 hover:bg-primary-600 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 text-sm">
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : `Place Order • ${formatCurrency(finalTotal)}`}
              </button>

              {/* Trust badges */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3 text-[10px] text-gray-400">
                <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-green-500" /> Secure Payment</span>
                <span className="flex items-center gap-1"><Truck size={12} className="text-blue-500" /> Fast Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
