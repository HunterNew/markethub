import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import api from '../api/client'
import { formatCurrency, formatDateTime } from '../utils/helpers'
import { useAuth } from '../context/AuthContext'

function numberToWords(num: number): string {
  if (num === 0) return 'Zero'
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const convert = (n: number): string => {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '')
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '')
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '')
  }
  const rupees = Math.floor(num)
  const paise = Math.round((num - rupees) * 100)
  let result = convert(rupees) + ' Rupees'
  if (paise > 0) result += ' and ' + convert(paise) + ' Paise'
  result += ' Only'
  return result
}

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/orders/${id}`).then(r => setOrder(r.data.order)).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!order) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Order not found</p>
    </div>
  )

  const addr = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address
  const invoiceNo = `QSNR-${String(order.id).padStart(4, '0')}`
  const invoiceDate = new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const isVendor = user?.role === 'vendor'
  const vendor = order.items?.[0] || {}
  const vendorName = vendor.vendor_name || 'GoMarts Seller'
  const vendorGst = vendor.vendor_gst || ''
  const vendorFssai = vendor.vendor_fssai || ''
  const vendorAddress = vendor.vendor_address || ''
  const vendorLogo = vendor.vendor_logo || ''
  const vendorSignature = vendor.vendor_signature || ''
  const vendorPhone = vendor.vendor_phone || ''
  const vendorEmail = vendor.vendor_email || ''
  const taxRate = Number(order.tax_amount) > 0 && Number(order.subtotal) > 0
    ? Math.round((Number(order.tax_amount) / Number(order.subtotal)) * 100)
    : 0
  const cgstRate = taxRate / 2
  const sgstRate = taxRate / 2

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Action bar */}
      <div className="print:hidden bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[850px] mx-auto px-4 py-3 flex items-center justify-between">
          <Link to={isVendor ? '/vendor/orders' : `/customer/orders/${id}`} className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
            <ArrowLeft size={16} /> Back
          </Link>
          <button onClick={() => window.print()} className="btn-primary text-sm flex items-center gap-1.5">
            <Printer size={14} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="max-w-[850px] mx-auto p-4 sm:p-6 print:p-0 print:max-w-none">
        <div className="bg-white shadow-sm print:shadow-none border border-gray-200 print:border-none" style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px' }}>
          
          {/* Header */}
          <div className="border-b border-gray-800 p-5 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="GoMarts" style={{ height: '40px', width: '40px', objectFit: 'contain' }} />
              <div>
                <p className="font-bold text-xl" style={{ marginBottom: '-4px' }}>
                  <span style={{ color: '#1e3a5f' }}>Go</span><span style={{ color: '#f97316' }}>Marts</span>
                </p>
                <span style={{ fontSize: '9px', color: '#9ca3af' }}>Shop Easy. Go Fast.</span>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-base font-bold text-gray-900">Tax Invoice/Bill of Supply/Cash Memo</h2>
              <p className="text-[11px] text-gray-600">(Original for Recipient)</p>
            </div>
          </div>

          {/* Sold By & Addresses */}
          <div className="border-b border-gray-800">
            <div className="flex">
              {/* Left: Sold By */}
              <div className="flex-1 p-5 border-r border-gray-800">
                <p className="font-bold text-gray-900 mb-1">Sold By :</p>
                <p className="font-bold text-gray-800">{vendorName}</p>
                {vendorAddress && <p className="text-gray-600">{vendorAddress}</p>}
                {vendorPhone && <p className="text-gray-600">Ph: {vendorPhone}</p>}
                {vendorEmail && <p className="text-gray-600">{vendorEmail}</p>}
                {vendorGst && <p className="text-gray-800 mt-2"><span className="font-bold">GST No:</span> {vendorGst}</p>}
                {vendorFssai && <p className="text-gray-800"><span className="font-bold">FSSAI No:</span> {vendorFssai}</p>}
              </div>
              {/* Right: Billing then Shipping */}
              <div className="flex-1 text-right">
                <div className="p-5 border-b border-gray-800">
                  <p className="font-bold text-gray-900 mb-1">Billing Address :</p>
                  <p className="text-gray-800 font-medium">{addr?.name}</p>
                  <p className="text-gray-600">{addr?.address}</p>
                  <p className="text-gray-600">{addr?.city}, {addr?.state} - {addr?.pincode}</p>
                  <p className="text-gray-600">Ph: {addr?.phone}</p>
                </div>
                <div className="p-5">
                  <p className="font-bold text-gray-900 mb-1">Shipping Address :</p>
                  <p className="text-gray-800 font-medium">{addr?.name}</p>
                  <p className="text-gray-600">{addr?.address}</p>
                  <p className="text-gray-600">{addr?.city}, {addr?.state} - {addr?.pincode}</p>
                  <p className="text-gray-600">Ph: {addr?.phone}</p>
                  {addr?.landmark && <p className="text-gray-500">Landmark: {addr.landmark}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Order & Invoice Details */}
          <div className="border-b border-gray-800 p-5">
            <div className="flex justify-between">
              <div>
                <p><span className="font-bold">Order Number:</span> {order.id}</p>
                <p><span className="font-bold">Order Date:</span> {orderDate}</p>
                <p><span className="font-bold">Order Status:</span> <span style={{ textTransform: 'capitalize' }}>{order.status === 'return_requested' ? 'Return Requested' : order.status}</span></p>
                {order.expected_delivery_date && (
                  <p><span className="font-bold">Expected Delivery:</span> {new Date(order.expected_delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' })}</p>
                )}
              </div>
              <div className="text-right">
                <p><span className="font-bold">Invoice Number:</span> {invoiceNo}</p>
                <p><span className="font-bold">Invoice Date:</span> {invoiceDate}</p>
                <p><span className="font-bold">Mode of Payment:</span> {order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method === 'razorpay' ? 'UPI/Net Banking' : 'Card'}</p>
                <p><span className="font-bold">Payment Status:</span> <span style={{ textTransform: 'capitalize' }}>{order.payment_status}</span></p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="p-5">
            <table className="w-full border-collapse border border-gray-800" style={{ fontSize: '11px' }}>
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-800 px-2 py-2 text-left font-bold">Sl.<br/>No</th>
                  <th className="border border-gray-800 px-2 py-2 text-left font-bold">Description</th>
                  <th className="border border-gray-800 px-2 py-2 text-right font-bold">Unit<br/>Price</th>
                  <th className="border border-gray-800 px-2 py-2 text-right font-bold">Discount</th>
                  <th className="border border-gray-800 px-2 py-2 text-center font-bold">Qty</th>
                  <th className="border border-gray-800 px-2 py-2 text-right font-bold">Net<br/>Amount</th>
                  <th className="border border-gray-800 px-2 py-2 text-center font-bold">Tax<br/>Rate</th>
                  <th className="border border-gray-800 px-2 py-2 text-center font-bold">Tax<br/>Type</th>
                  <th className="border border-gray-800 px-2 py-2 text-right font-bold">Tax<br/>Amount</th>
                  <th className="border border-gray-800 px-2 py-2 text-right font-bold">Total<br/>Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item: any, i: number) => {
                  const lineTotal = Number(item.unit_price) * item.quantity
                  const itemTax = Number(item.tax_amount) || 0
                  const itemCgst = itemTax / 2
                  const itemSgst = itemTax / 2
                  const itemTaxRate = Number(item.tax_rate_applied) || taxRate
                  const discount = Number(order.discount_amount) > 0 && order.items.length === 1 ? Number(order.discount_amount) : 0
                  const variantInfo = item.variant_snapshot ? (() => {
                    const snap = typeof item.variant_snapshot === 'string' ? JSON.parse(item.variant_snapshot) : item.variant_snapshot
                    return Object.entries(snap).filter(([k]) => k !== 'price').map(([k, v]) => `${k}: ${v}`).join(', ')
                  })() : ''

                  return (
                    <React.Fragment key={item.id}>
                      <tr>
                        <td className="border border-gray-800 px-2 py-2 align-top" rowSpan={2}>{i + 1}</td>
                        <td className="border border-gray-800 px-2 py-2 align-top" rowSpan={2}>
                          <p className="font-medium">{item.product_name}</p>
                          {variantInfo && <p className="text-gray-500">{variantInfo}</p>}
                        </td>
                        <td className="border border-gray-800 px-2 py-2 text-right align-top" rowSpan={2}>₹{Number(item.unit_price).toFixed(2)}</td>
                        <td className="border border-gray-800 px-2 py-2 text-right align-top" rowSpan={2}>{discount > 0 ? `₹${discount.toFixed(2)}` : '₹0.00'}</td>
                        <td className="border border-gray-800 px-2 py-2 text-center align-top" rowSpan={2}>{item.quantity}</td>
                        <td className="border border-gray-800 px-2 py-2 text-right align-top" rowSpan={2}>₹{lineTotal.toFixed(2)}</td>
                        <td className="border border-gray-800 px-2 py-1 text-center">{itemTaxRate / 2}%</td>
                        <td className="border border-gray-800 px-2 py-1 text-center">CGST</td>
                        <td className="border border-gray-800 px-2 py-1 text-right">₹{itemCgst.toFixed(2)}</td>
                        <td className="border border-gray-800 px-2 py-2 text-right align-top font-bold" rowSpan={2}>₹{(lineTotal + itemTax).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-800 px-2 py-1 text-center">{itemTaxRate / 2}%</td>
                        <td className="border border-gray-800 px-2 py-1 text-center">SGST</td>
                        <td className="border border-gray-800 px-2 py-1 text-right">₹{itemSgst.toFixed(2)}</td>
                      </tr>
                    </React.Fragment>
                  )
                })}
                {/* Total Row */}
                <tr className="font-bold bg-gray-50">
                  <td className="border border-gray-800 px-2 py-2" colSpan={5}>TOTAL:</td>
                  <td className="border border-gray-800 px-2 py-2 text-right">₹{Number(order.subtotal).toFixed(2)}</td>
                  <td className="border border-gray-800 px-2 py-2" colSpan={2}></td>
                  <td className="border border-gray-800 px-2 py-2 text-right">₹{Number(order.tax_amount || 0).toFixed(2)}</td>
                  <td className="border border-gray-800 px-2 py-2 text-right">₹{Number(order.total).toFixed(2)}</td>
                </tr>
                {Number(order.delivery_charge) > 0 && (
                  <tr>
                    <td className="border border-gray-800 px-2 py-2" colSpan={5}>Delivery Charges:</td>
                    <td className="border border-gray-800 px-2 py-2 text-right" colSpan={5}>₹{Number(order.delivery_charge).toFixed(2)}</td>
                  </tr>
                )}
                {Number(order.discount_amount) > 0 && (
                  <tr>
                    <td className="border border-gray-800 px-2 py-2" colSpan={5}>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}:</td>
                    <td className="border border-gray-800 px-2 py-2 text-right text-green-700" colSpan={5}>-₹{Number(order.discount_amount).toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Amount in Words */}
            <div className="mt-4 border border-gray-800 p-3">
              <p className="font-bold">Amount in Words:</p>
              <p className="font-bold">{numberToWords(Number(order.total))}</p>
            </div>

            {/* Signature & Footer */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-gray-500 mt-4">Whether tax is payable under reverse charge - No</p>
              </div>
              <div className="text-right border border-gray-800 p-4">
                <p className="font-bold">For {vendorName}:</p>
                <div className="h-16 flex items-center justify-end my-2 pr-[30px]">
                  {vendorSignature ? (
                    <img src={vendorSignature} alt="Signature" className="h-14 object-contain" />
                  ) : vendorLogo ? (
                    <img src={vendorLogo} alt="Logo" className="h-14 object-contain" />
                  ) : null}
                </div>
                <p className="text-gray-600 border-t border-gray-400 pt-1">Authorized Signatory</p>
              </div>
            </div>

            {/* Payment Info */}
            <div className="mt-4 border border-gray-800">
              <div className="grid grid-cols-4 text-[10px]">
                <div className="border-r border-gray-800 p-2">
                  <p className="font-bold">Payment Transaction ID:</p>
                  <p className="text-gray-600">{order.stripe_payment_intent_id || order.razorpay_order_id || 'COD'}</p>
                </div>
                <div className="border-r border-gray-800 p-2">
                  <p className="font-bold">Date & Time:</p>
                  <p className="text-gray-600">{formatDateTime(order.created_at)}</p>
                </div>
                <div className="border-r border-gray-800 p-2">
                  <p className="font-bold">Invoice Value:</p>
                  <p className="text-gray-600">₹{Number(order.total).toFixed(2)}</p>
                </div>
                <div className="p-2">
                  <p className="font-bold">Mode of Payment:</p>
                  <p className="text-gray-600">{order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method === 'razorpay' ? 'UPI/Net Banking' : 'Card'}</p>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mt-4 text-center text-[9px] text-gray-500 space-y-1">
              <p>This is a computer-generated invoice and does not require a physical signature.</p>
              <p>Please note that this invoice is not a demand for payment.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
