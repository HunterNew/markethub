import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CreditCard, Truck, CheckCircle, MapPin, Phone, User, ChevronRight, Plus } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { formatCurrency } from '../utils/helpers'
import api from '../api/client'
import toast from '../components/ui/Toast'

declare global {
  interface Window {
    Razorpay: any
  }
}

const STEPS = ['Address', 'Payment', 'Review']

export default function CheckoutPage() {
  const { items, total, refreshCart } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const { appliedCoupon, discount = 0 } = (location.state as any) || {}
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [address, setAddress] = useState({
    name: '', phone: '', address: '', city: '', state: '', pincode: '', landmark: ''
  })
  const [payMethod, setPayMethod] = useState<'cod'|'stripe'|'razorpay'>('cod')
  const [taxAmount, setTaxAmount] = useState(0)

  useEffect(() => {
    api.get('/auth/addresses').then(r => {
      const addrs = r.data.addresses || []
      setSavedAddresses(addrs)
      const defaultAddr = addrs.find((a: any) => a.is_default) || addrs[0]
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id)
        setAddress({
          name: defaultAddr.name, phone: defaultAddr.phone, address: defaultAddr.address,
          city: defaultAddr.city, state: defaultAddr.state, pincode: defaultAddr.pincode,
          landmark: defaultAddr.landmark || ''
        })
      } else {
        setShowNewForm(true)
      }
    }).catch(() => { setShowNewForm(true) })
  }, [])

  const shipping = total >= 999 ? 0 : 99
  const finalTotal = total - discount + shipping + taxAmount

  const setAddr = (k: string, v: string) => setAddress(prev => ({ ...prev, [k]: v }))

  const selectAddress = (addr: any) => {
    setSelectedAddressId(addr.id)
    setAddress({
      name: addr.name, phone: addr.phone, address: addr.address,
      city: addr.city, state: addr.state, pincode: addr.pincode,
      landmark: addr.landmark || ''
    })
    setShowNewForm(false)
  }

  const placeOrder = async () => {
    if (payMethod === 'razorpay') {
      setLoading(true)
      try {
        // Step 1: Create Razorpay order
        const { data } = await api.post('/orders/razorpay-order', { amount: finalTotal })
        const razorpayOrderId = data.order_id

        // Step 2: Open Razorpay checkout popup
        const options = {
          key: 'rzp_test_SpEw8OA2Q6EfK6',
          amount: data.amount,
          currency: data.currency,
          name: 'MarketHub',
          description: 'Order Payment',
          order_id: razorpayOrderId,
          prefill: {
            name: address.name,
            contact: address.phone,
          },
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            try {
              // Step 3: Verify payment
              await api.post('/orders/razorpay-verify', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              })

              // Step 4: Place the order
              const res = await api.post('/orders', {
                shippingAddress: address,
                paymentMethod: payMethod,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                couponCode: appliedCoupon?.code,
              })
              await refreshCart()
              toast.success('Order placed successfully!')
              navigate(`/order-confirmation/${res.data.orderId}`)
            } catch (err: any) {
              toast.error(err.response?.data?.message || 'Payment verification failed')
            }
          },
          modal: {
            ondismiss: () => {
              setLoading(false)
              toast.error('Payment cancelled')
            },
          },
          theme: {
            color: '#f97316',
          },
        }

        const rzp = new window.Razorpay(options)
        rzp.on('payment.failed', (response: any) => {
          setLoading(false)
          toast.error(response.error?.description || 'Payment failed. Please try again.')
        })
        rzp.open()
      } catch (err: any) {
        setLoading(false)
        toast.error(err.response?.data?.message || 'Failed to initiate payment')
      }
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/orders', {
        shippingAddress: address,
        paymentMethod: payMethod,
        couponCode: appliedCoupon?.code,
      })
      await refreshCart()
      toast.success('Order placed successfully!')
      navigate(`/order-confirmation/${res.data.orderId}`)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to place order')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="page-container py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>

        {/* Steps */}
        <div className="flex items-center mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 text-sm font-medium ${i <= step ? 'text-primary-600' : 'text-gray-400'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${i < step ? 'bg-primary-500 border-primary-500 text-white' : i === step ? 'border-primary-500 text-primary-600' : 'border-gray-200 text-gray-400'}`}>
                  {i < step ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span className="hidden sm:block">{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 transition-colors ${i < step ? 'bg-primary-500' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Step 0: Address */}
            {step === 0 && (
              <div className="card p-6 animate-fade-in">
                <h2 className="font-bold text-gray-900 text-lg mb-5 flex items-center gap-2">
                  <MapPin size={18} className="text-primary-500" /> Delivery Address
                </h2>

                {/* Saved addresses */}
                {savedAddresses.length > 0 && !showNewForm && (
                  <div className="space-y-3 mb-4">
                    {savedAddresses.map(addr => (
                      <label key={addr.id}
                        className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedAddressId === addr.id ? 'border-primary-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                        onClick={() => selectAddress(addr)}>
                        <input type="radio" name="address" checked={selectedAddressId === addr.id} onChange={() => selectAddress(addr)} className="accent-primary-500 mt-1" />
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{addr.name} {addr.is_default && <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full ml-1">Default</span>}</p>
                          <p className="text-sm text-gray-600">{addr.address}, {addr.city}, {addr.state} - {addr.pincode}</p>
                          <p className="text-xs text-gray-500 mt-0.5">📞 {addr.phone}</p>
                        </div>
                      </label>
                    ))}
                    <button onClick={() => { setShowNewForm(true); setSelectedAddressId(null); setAddress({ name: '', phone: '', address: '', city: '', state: '', pincode: '', landmark: '' }) }}
                      className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium p-3 border-2 border-dashed border-gray-200 rounded-xl w-full justify-center hover:border-primary-300">
                      <Plus size={16} /> Add New Address
                    </button>
                  </div>
                )}

                {/* New address form */}
                {showNewForm && (
                  <>
                    {savedAddresses.length > 0 && (
                      <button onClick={() => { setShowNewForm(false); if (savedAddresses.length > 0) selectAddress(savedAddresses.find((a: any) => a.is_default) || savedAddresses[0]) }}
                        className="text-sm text-primary-500 hover:text-primary-700 mb-4">← Use saved address</button>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Full Name *</label>
                        <div className="relative"><User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input required value={address.name} onChange={e => setAddr('name', e.target.value)} placeholder="John Doe" className="input pl-9 text-sm" /></div>
                      </div>
                      <div>
                        <label className="label">Phone Number *</label>
                        <div className="relative"><Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input required value={address.phone} onChange={e => setAddr('phone', e.target.value)} placeholder="9876543210" className="input pl-9 text-sm" /></div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label">Address *</label>
                        <textarea required value={address.address} onChange={e => setAddr('address', e.target.value)} rows={2}
                          placeholder="Flat/House No, Street, Area" className="input text-sm resize-none" />
                      </div>
                      <div>
                        <label className="label">Landmark</label>
                        <input value={address.landmark} onChange={e => setAddr('landmark', e.target.value)} placeholder="Near landmark" className="input text-sm" />
                      </div>
                      <div>
                        <label className="label">City *</label>
                        <input required value={address.city} onChange={e => setAddr('city', e.target.value)} placeholder="Mumbai" className="input text-sm" />
                      </div>
                      <div>
                        <label className="label">State *</label>
                        <input required value={address.state} onChange={e => setAddr('state', e.target.value)} placeholder="Maharashtra" className="input text-sm" />
                      </div>
                      <div>
                        <label className="label">Pincode *</label>
                        <input required value={address.pincode} onChange={e => setAddr('pincode', e.target.value)} placeholder="400001" className="input text-sm" maxLength={6} />
                      </div>
                    </div>
                  </>
                )}

                <button
                  onClick={() => {
                    if (!address.name || !address.phone || !address.address || !address.city || !address.state || !address.pincode)
                      return toast.error('Please fill all required fields')
                    // Save new address if entered manually
                    if (showNewForm && !selectedAddressId) {
                      api.post('/auth/addresses', { ...address, isDefault: savedAddresses.length === 0 }).catch(() => {})
                    }
                    setStep(1)
                  }}
                  className="btn-primary mt-6">Continue <ChevronRight size={16} /></button>
              </div>
            )}

            {/* Step 1: Payment */}
            {step === 1 && (
              <div className="card p-6 animate-fade-in">
                <h2 className="font-bold text-gray-900 text-lg mb-5 flex items-center gap-2">
                  <CreditCard size={18} className="text-primary-500" /> Payment Method
                </h2>
                {(() => {
                  const codAvailable = items.every(item => item.cod_enabled !== false && item.cod_enabled !== 0)
                  const methods = [
                    { id: 'cod', label: 'Cash on Delivery', desc: codAvailable ? 'Pay when your order arrives' : 'Not available for items in your cart', icon: '💵', disabled: !codAvailable },
                    { id: 'stripe', label: 'Credit / Debit Card', desc: 'Secure payment via Stripe', icon: '💳', disabled: false },
                    { id: 'razorpay', label: 'UPI / Net Banking', desc: 'Pay via Razorpay', icon: '📱', disabled: false },
                  ]
                  // If COD was selected but now unavailable, switch to razorpay
                  if (!codAvailable && payMethod === 'cod') setPayMethod('razorpay')
                  return (
                    <div className="space-y-3">
                      {methods.map(m => (
                        <label key={m.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${m.disabled ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50' : payMethod === m.id ? 'border-primary-500 bg-orange-50 cursor-pointer' : 'border-gray-200 hover:border-gray-300 cursor-pointer'}`}>
                          <input type="radio" name="payment" value={m.id} checked={payMethod === m.id as any}
                            onChange={() => !m.disabled && setPayMethod(m.id as any)} disabled={m.disabled} className="accent-primary-500" />
                          <span className="text-2xl">{m.icon}</span>
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{m.label}</p>
                            <p className="text-xs text-gray-400">{m.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )
                })()}
                {payMethod === 'stripe' && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-700">
                    💡 Stripe integration ready. In production, add card details here.
                  </div>
                )}
                {payMethod === 'razorpay' && (
                  <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-100 text-sm text-green-700">
                    📱 You'll be redirected to Razorpay to complete payment via UPI, Net Banking, or Wallet.
                  </div>
                )}
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(0)} className="btn-secondary">Back</button>
                  <button onClick={() => setStep(2)} className="btn-primary">Review Order <ChevronRight size={16} /></button>
                </div>
              </div>
            )}

            {/* Step 2: Review */}
            {step === 2 && (
              <div className="card p-6 animate-fade-in">
                <h2 className="font-bold text-gray-900 text-lg mb-5">Review Your Order</h2>

                {/* Items */}
                <div className="space-y-3 mb-6">
                  {items.map(item => {
                    const isWholesale = item.retail_price && item.unit_price < item.retail_price && item.wholesale_enabled
                    return (
                      <div key={item.id} className="p-3 border border-gray-100 rounded-xl">
                        <div className="flex items-start gap-3">
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                            {item.primary_image && <img src={item.primary_image} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.name}</p>
                            {item.option_combination && Object.keys(item.option_combination).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(item.option_combination).map(([k, v]) => (
                                  <span key={k} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{k}: {v}</span>
                                ))}
                              </div>
                            )}
                            {isWholesale && (
                              <span className="inline-flex text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium mt-1">⚡ Wholesale</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-gray-500">Qty: <span className="font-bold text-gray-900">{item.quantity}</span></span>
                            <span className="text-gray-300">|</span>
                            <span className="text-gray-500">{formatCurrency(item.unit_price)} each</span>
                            {isWholesale && item.retail_price && (
                              <span className="text-xs text-gray-400 line-through">{formatCurrency(item.retail_price)}</span>
                            )}
                          </div>
                          <span className="font-bold text-gray-900">{formatCurrency(item.unit_price * item.quantity)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Delivery & Payment Summary */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm mb-6">
                  <div className="flex justify-between items-start">
                    <span className="text-gray-500 flex items-center gap-1"><MapPin size={12} /> Deliver to</span>
                    <div className="text-right">
                      <p className="font-medium text-gray-800">{address.name}</p>
                      <p className="text-xs text-gray-500">{address.address}, {address.city}, {address.state} - {address.pincode}</p>
                      {address.phone && <p className="text-xs text-gray-400">📞 {address.phone}</p>}
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between">
                    <span className="text-gray-500">Payment</span>
                    <span className="font-medium capitalize text-gray-700">{payMethod === 'cod' ? 'Cash on Delivery' : payMethod === 'stripe' ? 'Card (Stripe)' : 'UPI / Net Banking'}</span>
                  </div>
                  {discount > 0 && (
                    <div className="border-t border-gray-200 pt-2 flex justify-between text-green-600">
                      <span>Coupon ({appliedCoupon?.code})</span>
                      <span>-{formatCurrency(discount)}</span>
                    </div>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-2 text-sm mb-6">
                  <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{formatCurrency(total)}</span></div>
                  {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(discount)}</span></div>}
                  <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>{shipping === 0 ? 'FREE' : formatCurrency(shipping)}</span></div>
                  <div className="border-t border-orange-200 pt-2 flex justify-between font-bold text-base">
                    <span>Total to Pay</span>
                    <span className="text-primary-600">{formatCurrency(finalTotal)}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
                  <button onClick={placeOrder} disabled={loading} className="btn-primary flex-1 justify-center py-3 text-base">
                    {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : `Confirm & Pay • ${formatCurrency(finalTotal)}`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="card p-5 h-fit sticky top-24">
            <h3 className="font-bold text-gray-900 mb-4">Price Breakdown</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{formatCurrency(total)}</span></div>
              {discount > 0 && <div className="flex justify-between text-green-600"><span>Coupon</span><span>-{formatCurrency(discount)}</span></div>}
              <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span className={shipping === 0 ? 'text-green-600' : ''}>{shipping === 0 ? 'FREE' : formatCurrency(shipping)}</span></div>
              {taxAmount > 0 && <div className="flex justify-between"><span className="text-gray-600">Tax</span><span>{formatCurrency(taxAmount)}</span></div>}
              <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-primary-600">{formatCurrency(finalTotal)}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
              {items.slice(0, 3).map(item => (
                <div key={item.id} className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-6 h-6 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                    {item.primary_image && <img src={item.primary_image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <span className="line-clamp-1">{item.name}</span>
                  <span className="ml-auto flex-shrink-0">×{item.quantity}</span>
                </div>
              ))}
              {items.length > 3 && <p className="text-xs text-gray-400">+{items.length - 3} more items</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
