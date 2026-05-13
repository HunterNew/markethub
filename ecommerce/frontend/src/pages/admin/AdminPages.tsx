import React, { useState, useEffect } from 'react'
import { Users, Package, ShoppingBag, DollarSign, TrendingUp, CheckCircle, XCircle, Eye, ToggleLeft, ToggleRight, Plus, Trash2, Edit2, Tag } from 'lucide-react'
import api from '../../api/client'
import { AdminLayout } from '../../components/layout/DashboardLayout'
import { Modal, StatusBadge, Table, Skeleton, StatCard, EmptyState } from '../../components/ui'
import { formatCurrency, formatDateTime } from '../../utils/helpers'
import toast from '../../components/ui/Toast'

// ============ ADMIN DASHBOARD ============
export function AdminDashboard() {
  const [summary, setSummary] = useState<any>(null)
  const [sales, setSales] = useState<any[]>([])
  const [period, setPeriod] = useState<'7' | '14' | '30'>('7')

  useEffect(() => {
    api.get('/admin/reports/summary').then(r => setSummary(r.data.summary)).catch(() => {})
  }, [])

  useEffect(() => {
    api.get('/admin/reports/sales?groupBy=day').then(r => setSales(r.data.sales?.slice(0, Number(period)).reverse() || [])).catch(() => {})
  }, [period])

  const totalRevInPeriod = sales.reduce((sum, s) => sum + Number(s.revenue || 0), 0)
  const totalOrdersInPeriod = sales.reduce((sum, s) => sum + Number(s.orders || 0), 0)
  const totalCommissionInPeriod = sales.reduce((sum, s) => sum + Number(s.commission || 0), 0)
  const avgOrderValue = totalOrdersInPeriod > 0 ? totalRevInPeriod / totalOrdersInPeriod : 0
  const commissionPercent = totalRevInPeriod > 0 ? (totalCommissionInPeriod / totalRevInPeriod * 100).toFixed(1) : '0'

  const chartData = sales.map(s => ({
    date: s.period?.slice(5),
    revenue: Number(s.revenue || 0),
    orders: Number(s.orders || 0),
    commission: Number(s.commission || 0),
  }))

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-500 mb-8">Platform overview</p>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          <StatCard icon={<DollarSign size={22} />} label="Total Revenue" value={formatCurrency(summary?.totalRevenue || 0)} color="green" />
          <StatCard icon={<TrendingUp size={22} />} label="Total Commissions" value={formatCurrency(summary?.totalCommissions || 0)} color="orange" />
          <StatCard icon={<ShoppingBag size={22} />} label="Total Orders" value={summary?.totalOrders || 0} color="blue" />
          <StatCard icon={<Users size={22} />} label="Active Vendors" value={summary?.activeVendors || 0} color="purple" />
          <StatCard icon={<Users size={22} />} label="Total Customers" value={summary?.totalCustomers || 0} color="orange" />
          <StatCard icon={<Package size={22} />} label="Pending Products" value={summary?.pendingProducts || 0} color="blue" />
        </div>

        {/* Sales chart */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Sales Overview</h2>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-primary-500" />
                  <span className="text-xs text-gray-500">Revenue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs text-gray-500">Commission</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-xs text-gray-500">Orders</span>
                </div>
              </div>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {(['7', '14', '30'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {p} Days
                </button>
              ))}
            </div>
          </div>

          {/* Period stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
              <p className="text-xs text-green-600 font-medium mb-1">Revenue</p>
              <p className="text-lg font-bold text-green-700">{formatCurrency(totalRevInPeriod)}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100">
              <p className="text-xs text-orange-600 font-medium mb-1">Commission ({commissionPercent}%)</p>
              <p className="text-lg font-bold text-orange-700">{formatCurrency(totalCommissionInPeriod)}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
              <p className="text-xs text-blue-600 font-medium mb-1">Orders</p>
              <p className="text-lg font-bold text-blue-700">{totalOrdersInPeriod}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100">
              <p className="text-xs text-purple-600 font-medium mb-1">Avg. Order Value</p>
              <p className="text-lg font-bold text-purple-700">{formatCurrency(avgOrderValue)}</p>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 ? (
            <div className="w-full" style={{ height: 300 }}>
              <SalesChart data={chartData} />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No sales data available</div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

function SalesChart({ data }: { data: { date: string; revenue: number; orders: number; commission: number }[] }) {
  return (
    <SalesChartInner data={data} />
  )
}

// Lazy-loaded chart to avoid SSR issues
function SalesChartInner({ data }: { data: { date: string; revenue: number; orders: number; commission: number }[] }) {
  const [chartModule, setChartModule] = useState<any>(null)

  useEffect(() => {
    import('recharts').then(mod => setChartModule(mod))
  }, [])

  if (!chartModule) return <div className="h-full flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>

  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = chartModule

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const revenue = payload.find((p: any) => p.dataKey === 'revenue')?.value || 0
    const commission = payload.find((p: any) => p.dataKey === 'commission')?.value || 0
    const orders = payload.find((p: any) => p.dataKey === 'orders')?.value || 0
    const pct = revenue > 0 ? ((commission / revenue) * 100).toFixed(1) : '0'
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-800 mb-1">{label}</p>
        <p className="text-orange-600">Revenue: {formatCurrency(revenue)}</p>
        <p className="text-emerald-600">Commission: {formatCurrency(commission)} ({pct}%)</p>
        <p className="text-blue-600">Orders: {orders}</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
        <YAxis yAxisId="revenue" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(v: number) => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`} />
        <YAxis yAxisId="orders" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
        <Bar yAxisId="revenue" dataKey="revenue" fill="#f97316" radius={[6, 6, 0, 0]} barSize={data.length > 14 ? 14 : 28} />
        <Bar yAxisId="revenue" dataKey="commission" fill="#10b981" radius={[6, 6, 0, 0]} barSize={data.length > 14 ? 14 : 28} />
        <Bar yAxisId="orders" dataKey="orders" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={data.length > 14 ? 8 : 14} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ============ ADMIN VENDORS ============
export function AdminVendors() {
  const [vendors, setVendors] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [rejectModal, setRejectModal] = useState<any>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [detailVendor, setDetailVendor] = useState<any>(null)

  const load = (s?: string) => {
    setLoading(true)
    const q = s && s !== 'all' ? `?status=${s}` : ''
    api.get(`/admin/vendors${q}`).then(r => setVendors(r.data.vendors || [])).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => load(filter), [filter])

  const approve = async (id: number) => {
    await api.patch(`/admin/vendors/${id}/approve`).catch(() => {})
    toast.success('Vendor approved'); load(filter)
  }

  const reject = async () => {
    if (!rejectReason.trim()) return toast.error('Reason required')
    await api.patch(`/admin/vendors/${rejectModal.id}/reject`, { reason: rejectReason }).catch(() => {})
    toast.success('Vendor rejected'); setRejectModal(null); setRejectReason(''); load(filter)
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Vendor Management</h1>
        <div className="flex gap-2 mb-6">
          {['all', 'pending', 'approved', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium capitalize transition-colors ${filter === s ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {s}
            </button>
          ))}
        </div>
        {loading ? <Skeleton className="h-64 rounded-2xl" /> : (
          <div className="card overflow-hidden">
            <Table headers={['Vendor', 'Email', 'Products', 'Status', 'Actions']}>
              {vendors.map(v => (
                <tr key={v.id}>
                  <td className="table-cell px-4">
                    <div>
                      <p className="font-medium text-gray-800">{v.store_name}</p>
                      <p className="text-xs text-gray-400">{v.first_name} {v.last_name}</p>
                    </div>
                  </td>
                  <td className="table-cell px-4 text-sm text-gray-600">{v.email}</td>
                  <td className="table-cell px-4 text-center">{v.product_count || 0}</td>
                  <td className="table-cell px-4"><StatusBadge status={v.status} /></td>
                  <td className="table-cell px-4">
                    <div className="flex gap-2">
                      <button onClick={() => setDetailVendor(v)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><Eye size={14} /></button>
                      {v.status === 'pending' && (
                        <>
                          <button onClick={() => approve(v.id)} className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors"><CheckCircle size={14} /></button>
                          <button onClick={() => setRejectModal(v)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors"><XCircle size={14} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        )}

        <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Vendor" size="sm">
          <p className="text-sm text-gray-500 mb-3">Rejecting: <strong>{rejectModal?.store_name}</strong></p>
          <label className="label">Rejection Reason *</label>
          <textarea className="input resize-none" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Why is this vendor being rejected?" />
          <div className="flex gap-3 mt-4">
            <button onClick={() => setRejectModal(null)} className="btn-secondary">Cancel</button>
            <button onClick={reject} className="btn-danger">Reject Vendor</button>
          </div>
        </Modal>

        <Modal open={!!detailVendor} onClose={() => setDetailVendor(null)} title="Vendor Details">
          {detailVendor && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                {[['Store', detailVendor.store_name], ['Owner', `${detailVendor.first_name} ${detailVendor.last_name}`], ['Email', detailVendor.email], ['Status', detailVendor.status], ['Products', detailVendor.product_count], ['Commission', detailVendor.commission_rate ? `${detailVendor.commission_rate}%` : 'Global rate']].map(([k, v]) => (
                  <div key={k as string}><p className="text-gray-400 text-xs">{k}</p><p className="font-medium text-gray-800">{v}</p></div>
                ))}
              </div>
              {detailVendor.description && <div><p className="text-gray-400 text-xs">Description</p><p className="text-gray-700">{detailVendor.description}</p></div>}

              {/* Contact & Documents */}
              {detailVendor.contact_phone && (
                <div><p className="text-gray-400 text-xs">Contact Phone</p><p className="font-medium text-gray-800">{detailVendor.contact_phone}</p></div>
              )}

              {(detailVendor.gst_number || detailVendor.fssai_number) && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Business Documents</p>
                  <div className="grid grid-cols-2 gap-2">
                    {detailVendor.gst_number && <div><p className="text-gray-400 text-xs">GST Number</p><p className="font-medium text-gray-800">{detailVendor.gst_number}</p></div>}
                    {detailVendor.fssai_number && <div><p className="text-gray-400 text-xs">FSSAI Number</p><p className="font-medium text-gray-800">{detailVendor.fssai_number}</p></div>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {detailVendor.gst_certificate_url && (
                      <div><p className="text-gray-400 text-xs">GST Certificate</p><a href={detailVendor.gst_certificate_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-xs">View Certificate</a></div>
                    )}
                    {detailVendor.fssai_certificate_url && (
                      <div><p className="text-gray-400 text-xs">FSSAI Certificate</p><a href={detailVendor.fssai_certificate_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-xs">View Certificate</a></div>
                    )}
                  </div>
                </div>
              )}

              {(detailVendor.bank_account_name || detailVendor.bank_account_number) && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Bank Details</p>
                  <div className="grid grid-cols-2 gap-2">
                    {detailVendor.bank_account_name && <div><p className="text-gray-400 text-xs">Account Name</p><p className="font-medium text-gray-800">{detailVendor.bank_account_name}</p></div>}
                    {detailVendor.bank_account_number && <div><p className="text-gray-400 text-xs">Account Number</p><p className="font-medium text-gray-800">{detailVendor.bank_account_number}</p></div>}
                    {detailVendor.bank_ifsc && <div><p className="text-gray-400 text-xs">IFSC Code</p><p className="font-medium text-gray-800">{detailVendor.bank_ifsc}</p></div>}
                    {detailVendor.bank_name && <div><p className="text-gray-400 text-xs">Bank Name</p><p className="font-medium text-gray-800">{detailVendor.bank_name}</p></div>}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  )
}

// ============ ADMIN PRODUCTS ============
export function AdminProducts() {
  const [products, setProducts] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState('pending_approval')
  const [loading, setLoading] = useState(true)
  const [rejectModal, setRejectModal] = useState<any>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [preview, setPreview] = useState<any>(null)

  const load = () => {
    setLoading(true)
    api.get(`/admin/products?status=${statusFilter}`).then(r => setProducts(r.data.products || [])).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [statusFilter])

  const approve = async (id: number) => {
    await api.patch(`/admin/products/${id}/approve`)
    toast.success('Product approved'); load()
  }

  const reject = async () => {
    if (!rejectReason.trim()) return toast.error('Reason required')
    await api.patch(`/admin/products/${rejectModal.id}/reject`, { reason: rejectReason })
    toast.success('Product rejected'); setRejectModal(null); setRejectReason(''); load()
  }

  const toggleFeature = async (p: any) => {
    if (p.is_featured) await api.delete(`/admin/products/${p.id}/feature`)
    else await api.post(`/admin/products/${p.id}/feature`)
    toast.success(p.is_featured ? 'Unfeatured' : 'Featured!')
    load()
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Products</h1>
        <div className="flex gap-2 mb-6">
          {['pending_approval', 'active', 'rejected'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${statusFilter === s ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
        {loading ? <Skeleton className="h-64 rounded-2xl" /> : products.length === 0 ? (
          <EmptyState icon={<Package size={48} />} title="No products" description={`No ${statusFilter.replace('_',' ')} products.`} />
        ) : (
          <div className="card overflow-hidden">
            <Table headers={['Product', 'Vendor', 'Price', 'Stock', 'Status', 'Actions']}>
              {products.map(p => (
                <tr key={p.id}>
                  <td className="table-cell px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {p.primary_image && <img src={p.primary_image} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <p className="font-medium text-gray-800 text-sm">{p.name}{p.has_variants && <span className="ml-1 text-[10px] bg-primary-50 text-primary-600 px-1.5 py-0.5 rounded-full font-medium">Variants</span>}</p>
                    </div>
                  </td>
                  <td className="table-cell px-4 text-sm text-gray-500">{p.store_name}</td>
                  <td className="table-cell px-4 font-medium">{formatCurrency(p.price)}</td>
                  <td className="table-cell px-4">{p.stock_quantity}</td>
                  <td className="table-cell px-4"><StatusBadge status={p.status} /></td>
                  <td className="table-cell px-4">
                    <div className="flex gap-2">
                      <button onClick={() => api.get(`/admin/products/${p.id}`).then(r => setPreview(r.data.product))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><Eye size={14} /></button>
                      {p.status === 'pending_approval' && (
                        <>
                          <button onClick={() => approve(p.id)} className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors" title="Approve"><CheckCircle size={14} /></button>
                          <button onClick={() => setRejectModal(p)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors" title="Reject"><XCircle size={14} /></button>
                        </>
                      )}
                      {p.status === 'active' && (
                        <button onClick={() => toggleFeature(p)} className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-600 transition-colors" title={p.is_featured ? 'Unfeature' : 'Feature'}>
                          {p.is_featured ? '⭐' : '☆'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        )}

        <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Product" size="sm">
          <p className="text-sm text-gray-500 mb-3">Rejecting: <strong>{rejectModal?.name}</strong></p>
          <label className="label">Rejection Reason *</label>
          <textarea className="input resize-none" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Why is this product being rejected?" />
          <div className="flex gap-3 mt-4">
            <button onClick={() => setRejectModal(null)} className="btn-secondary">Cancel</button>
            <button onClick={reject} className="btn-danger">Reject</button>
          </div>
        </Modal>

        <Modal open={!!preview} onClose={() => setPreview(null)} title="Product Preview" size="lg">
          {preview && (
            <div className="space-y-4">
              {preview.images?.[0] && <img src={preview.images[0].image_url} alt="" className="w-full h-48 object-cover rounded-xl" />}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[['Name', preview.name], ['Price', formatCurrency(preview.price)], ['Vendor', preview.store_name], ['Category', preview.category_name], ['Stock', preview.stock_quantity]].map(([k, v]) => (
                  <div key={k as string}><p className="text-xs text-gray-400">{k}</p><p className="font-medium text-gray-800">{v}</p></div>
                ))}
              </div>
              {preview.description && <p className="text-sm text-gray-600">{preview.description}</p>}
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  )
}

// ============ ADMIN ORDERS ============
export function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    setLoading(true)
    const q = statusFilter ? `?status=${statusFilter}` : ''
    api.get(`/orders${q}`).then(r => setOrders(r.data.orders || [])).catch(() => {}).finally(() => setLoading(false))
  }, [statusFilter])

  const updateStatus = async (id: number, status: string) => {
    await api.put(`/orders/${id}/status`, { status })
    toast.success('Status updated')
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">All Orders</h1>
        <div className="flex gap-2 mb-6 flex-wrap">
          {['', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium capitalize transition-colors ${statusFilter === s ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
        {loading ? <Skeleton className="h-64 rounded-2xl" /> : (
          <div className="card overflow-hidden">
            <Table headers={['Order', 'Customer', 'Date', 'Discount', 'Total', 'Payment', 'Status', 'Actions']}>
              {orders.map(o => (
                <tr key={o.id}>
                  <td className="table-cell px-4"><span className="font-mono font-bold">#{o.id}</span></td>
                  <td className="table-cell px-4"><div><p className="text-sm font-medium">{o.first_name} {o.last_name}</p><p className="text-xs text-gray-400">{o.customer_email}</p></div></td>
                  <td className="table-cell px-4 text-xs text-gray-500">{formatDateTime(o.created_at)}</td>
                  <td className="table-cell px-4">{Number(o.discount_amount) > 0 ? <span className="text-green-600 text-sm">-{formatCurrency(o.discount_amount)}<br/><span className="text-xs text-gray-400">{o.coupon_code}</span></span> : <span className="text-gray-300 text-xs">—</span>}</td>
                  <td className="table-cell px-4 font-bold">{formatCurrency(o.total)}</td>
                  <td className="table-cell px-4"><span className="text-xs uppercase text-gray-500">{o.payment_method}</span></td>
                  <td className="table-cell px-4"><StatusBadge status={o.status} /></td>
                  <td className="table-cell px-4">
                    <div className="flex gap-2 items-center">
                      <button onClick={() => api.get(`/orders/${o.id}`).then(r => setSelected(r.data.order || r.data))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><Eye size={14} /></button>
                      <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600">
                        {['confirmed','shipped','delivered','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        )}

        <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `Order #${selected.id} Details` : ''} size="lg">
          {selected && (
            <div className="space-y-5">
              {/* Customer & Shipping Info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Customer</h4>
                  <p className="text-sm font-medium text-gray-800">{selected.first_name} {selected.last_name}</p>
                  <p className="text-xs text-gray-500">{selected.customer_email}</p>
                </div>
                {selected.shipping_address && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Delivery Address</h4>
                    {(() => {
                      const addr = typeof selected.shipping_address === 'string' ? JSON.parse(selected.shipping_address) : selected.shipping_address
                      return (
                        <div className="text-sm text-gray-700">
                          <p className="font-medium">{addr.name}</p>
                          <p className="text-xs text-gray-600">{addr.address}</p>
                          <p className="text-xs text-gray-600">{addr.city}, {addr.state} - {addr.pincode}</p>
                          {addr.phone && <p className="text-xs text-gray-500 mt-1">📞 {addr.phone}</p>}
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-500">Payment: <span className="font-medium text-gray-800 capitalize">{selected.payment_method === 'cod' ? 'COD' : selected.payment_method}</span></span>
                    <StatusBadge status={selected.status} />
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-900">{formatCurrency(selected.total)}</span>
                    {Number(selected.discount_amount) > 0 && (
                      <p className="text-xs text-green-600">Discount: -{formatCurrency(selected.discount_amount)} {selected.coupon_code && `(${selected.coupon_code})`}</p>
                    )}
                    {Number(selected.tax_amount) > 0 && (
                      <p className="text-xs text-gray-500">Tax: {formatCurrency(selected.tax_amount)}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Items ({(selected.items || []).length})</h4>
                <div className="space-y-3">
                  {(selected.items || []).map((item: any, idx: number) => {
                    let variantInfo: Record<string, string> = {}
                    let snapshotPrice: number | null = null
                    if (item.variant_snapshot) {
                      try {
                        const snap = typeof item.variant_snapshot === 'string' ? JSON.parse(item.variant_snapshot) : item.variant_snapshot
                        snapshotPrice = snap.price ? Number(snap.price) : null
                        variantInfo = Object.fromEntries(Object.entries(snap).filter(([k]) => k !== 'price').map(([k, v]) => [k, String(v)]))
                      } catch {}
                    }
                    const unitPrice = Number(item.unit_price || item.price)
                    const isWholesale = snapshotPrice && unitPrice < snapshotPrice
                    const lineTotal = unitPrice * item.quantity
                    return (
                      <div key={idx} className="p-4 bg-white border border-gray-100 rounded-xl">
                        <div className="flex items-start gap-4">
                          {item.product_image && (
                            <img src={item.product_image} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-100" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{item.product_name || item.name}</p>
                            {Object.keys(variantInfo).length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {Object.entries(variantInfo).map(([k, v]) => (
                                  <span key={k} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{k}: {v}</span>
                                ))}
                              </div>
                            )}
                            {isWholesale && (
                              <span className="inline-flex items-center text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium mt-1.5">⚡ Wholesale Order</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-xs text-gray-400">Qty</p>
                              <p className="text-lg font-bold text-gray-900">{item.quantity}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-400">Unit Price</p>
                              <p className="text-sm font-semibold text-gray-800">{formatCurrency(unitPrice)}</p>
                              {isWholesale && snapshotPrice && (
                                <p className="text-xs text-gray-400 line-through">{formatCurrency(snapshotPrice)}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Line Total</p>
                            <p className="text-lg font-bold text-gray-900">{formatCurrency(lineTotal)}</p>
                            {isWholesale && snapshotPrice && (
                              <p className="text-xs text-green-600">Saved {formatCurrency((snapshotPrice - unitPrice) * item.quantity)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  )
}

// ============ ADMIN REPORTS ============
export function AdminReports() {
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [vendorPerf, setVendorPerf] = useState<any[]>([])

  useEffect(() => {
    api.get('/admin/reports/top-products').then(r => setTopProducts(r.data.products || [])).catch(() => {})
    api.get('/admin/reports/vendors').then(r => setVendorPerf(r.data.vendors || [])).catch(() => {})
  }, [])

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Reports</h1>
        <div className="space-y-8">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Top 10 Products</h2>
            </div>
            <Table headers={['Product', 'Vendor', 'Units Sold', 'Revenue']}>
              {topProducts.map((p, i) => (
                <tr key={p.id}>
                  <td className="table-cell px-4"><div className="flex items-center gap-2"><span className="w-6 h-6 bg-orange-50 rounded-full text-xs font-bold text-primary-500 flex items-center justify-center">{i+1}</span>{p.name}</div></td>
                  <td className="table-cell px-4 text-gray-500">{p.store_name}</td>
                  <td className="table-cell px-4 font-bold">{p.units_sold || 0}</td>
                  <td className="table-cell px-4 font-bold text-green-600">{formatCurrency(p.revenue || 0)}</td>
                </tr>
              ))}
            </Table>
          </div>
          <div className="card p-6">
            <h2 className="font-bold text-gray-900 mb-4">Vendor Performance</h2>
            <Table headers={['Store', 'Orders', 'Sales', 'Commission']}>
              {vendorPerf.map(v => (
                <tr key={v.id}>
                  <td className="table-cell px-4 font-medium">{v.store_name}</td>
                  <td className="table-cell px-4">{v.total_orders || 0}</td>
                  <td className="table-cell px-4 font-bold">{formatCurrency(v.total_sales || 0)}</td>
                  <td className="table-cell px-4 text-primary-600 font-bold">{formatCurrency(v.total_commission || 0)}</td>
                </tr>
              ))}
            </Table>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

// ============ ADMIN SETTINGS ============
export function AdminSettings() {
  const [settings, setSettings] = useState<any>({})
  const [taxRates, setTaxRates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newRate, setNewRate] = useState({ name: '', rate: '', isDefault: false })

  const load = async () => {
    const [s, r] = await Promise.all([
      api.get('/admin/settings').catch(() => ({ data: { settings: {} } })),
      api.get('/admin/settings/tax/rates').catch(() => ({ data: { rates: [] } })),
    ])
    setSettings(s.data.settings || {})
    setTaxRates(r.data.rates || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const updateSetting = async (key: string, value: any) => {
    await api.put(`/admin/settings/${key}`, { value })
    setSettings((prev: any) => ({ ...prev, [key]: value }))
    toast.success('Setting saved')
  }

  const addTaxRate = async () => {
    if (!newRate.name || !newRate.rate) return toast.error('Fill all fields')
    await api.post('/admin/settings/tax/rates', newRate)
    toast.success('Tax rate added'); setNewRate({ name: '', rate: '', isDefault: false }); load()
  }

  const Toggle = ({ settingKey, label, desc }: { settingKey: string; label: string; desc: string }) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
      <div><p className="font-medium text-gray-800">{label}</p><p className="text-xs text-gray-400">{desc}</p></div>
      <button onClick={() => updateSetting(settingKey, !settings[settingKey])}
        className={`w-12 h-6 rounded-full transition-colors relative ${settings[settingKey] ? 'bg-primary-500' : 'bg-gray-300'}`}>
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings[settingKey] ? 'left-6' : 'left-0.5'}`} />
      </button>
    </div>
  )

  if (loading) return <AdminLayout><div className="p-8"><Skeleton className="h-96 rounded-2xl" /></div></AdminLayout>

  return (
    <AdminLayout>
      <div className="p-8 space-y-8 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform Settings</h1>

          {/* Commission */}
          <div className="card p-6 mb-6">
            <h2 className="font-bold text-gray-900 mb-4">Commission Settings</h2>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="label">Global Commission Rate (%)</label>
                <input type="number" className="input" defaultValue={settings.global_commission_rate || 10} id="commission-rate" min="0" max="100" step="0.5" />
              </div>
              <button onClick={() => updateSetting('global_commission_rate', parseFloat((document.getElementById('commission-rate') as HTMLInputElement).value))}
                className="btn-primary">Save</button>
            </div>
          </div>

          {/* Wholesale */}
          <div className="card p-6 mb-6">
            <h2 className="font-bold text-gray-900 mb-4">Wholesale Settings</h2>
            <div className="space-y-3">
              <Toggle settingKey="wholesale_enabled" label="Enable Wholesale" desc="Allow vendors to set wholesale prices" />
              <div className="p-4 bg-gray-50 rounded-xl">
                <label className="label">Wholesale Visibility</label>
                <select className="input" value={settings.wholesale_visibility || 'all'} onChange={e => updateSetting('wholesale_visibility', e.target.value)}>
                  <option value="all">All Customers</option>
                  <option value="wholesale_eligible">Wholesale Eligible Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tax */}
          <div className="card p-6 mb-6">
            <h2 className="font-bold text-gray-900 mb-4">Tax Settings</h2>
            <div className="space-y-4">
              <Toggle settingKey="tax_enabled" label="Enable Tax Collection" desc="Apply tax to customer orders" />
              <div>
                <h3 className="font-semibold text-gray-700 text-sm mb-3">Tax Rates</h3>
                <div className="space-y-2 mb-4">
                  {taxRates.map(r => (
                    <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-sm">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{r.name}</p>
                        <p className="text-xs text-gray-400">{r.rate}%</p>
                      </div>
                      {r.is_default && <span className="badge badge-success">Default</span>}
                    </div>
                  ))}
                </div>
                <div className="border border-dashed border-gray-300 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Add Tax Rate</p>
                  <div className="grid grid-cols-3 gap-3">
                    <input className="input text-sm" value={newRate.name} onChange={e => setNewRate(p => ({...p,name:e.target.value}))} placeholder="e.g. GST" />
                    <input type="number" className="input text-sm" value={newRate.rate} onChange={e => setNewRate(p => ({...p,rate:e.target.value}))} placeholder="Rate %" min="0" max="100" />
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer"><input type="checkbox" checked={newRate.isDefault} onChange={e => setNewRate(p => ({...p,isDefault:e.target.checked}))} className="accent-primary-500" />Default</label>
                      <button onClick={addTaxRate} className="btn-primary text-sm px-3 py-2"><Plus size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Homepage */}
          <div className="card p-6">
            <h2 className="font-bold text-gray-900 mb-4">Homepage Sections</h2>
            <div className="space-y-3">
              <Toggle settingKey="homepage_featured_enabled" label="Featured Products" desc="Show featured products section" />
              <Toggle settingKey="homepage_new_arrivals_enabled" label="New Arrivals" desc="Show new arrivals section" />
              <Toggle settingKey="homepage_best_sellers_enabled" label="Best Sellers" desc="Show best sellers section" />
              <Toggle settingKey="homepage_sale_enabled" label="Sale / Offers" desc="Show products on sale" />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

// ============ ADMIN WITHDRAWALS ============
export function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [filter, setFilter] = useState('pending')

  const load = () => {
    const q = filter ? `?status=${filter}` : ''
    api.get(`/admin/withdrawals${q}`).then(r => setWithdrawals(r.data.withdrawals || [])).catch(() => {})
  }
  useEffect(load, [filter])

  const action = async (id: number, act: string) => {
    await api.patch(`/admin/withdrawals/${id}/${act}`)
    toast.success(`Withdrawal ${act}`); load()
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Withdrawals</h1>
        <div className="flex gap-2 mb-6">
          {['pending', 'approved', 'completed', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium capitalize transition-colors ${filter === s ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{s}</button>
          ))}
        </div>
        <div className="card overflow-hidden">
          <Table headers={['Vendor', 'Amount', 'Date', 'Status', 'Actions']}>
            {withdrawals.map(w => (
              <tr key={w.id}>
                <td className="table-cell px-4"><div><p className="font-medium text-sm">{w.store_name}</p><p className="text-xs text-gray-400">{w.email}</p></div></td>
                <td className="table-cell px-4 font-bold text-lg">{formatCurrency(w.amount)}</td>
                <td className="table-cell px-4 text-xs text-gray-500">{formatDateTime(w.created_at)}</td>
                <td className="table-cell px-4"><StatusBadge status={w.status} /></td>
                <td className="table-cell px-4">
                  <div className="flex gap-2">
                    {w.status === 'pending' && <button onClick={() => action(w.id, 'approve')} className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-100">Approve</button>}
                    {w.status === 'approved' && <button onClick={() => action(w.id, 'complete')} className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-lg hover:bg-green-100">Complete</button>}
                    {w.status === 'pending' && <button onClick={() => action(w.id, 'reject')} className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded-lg hover:bg-red-100">Reject</button>}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
          {withdrawals.length === 0 && <div className="p-8 text-center text-gray-400">No {filter} withdrawals</div>}
        </div>
      </div>
    </AdminLayout>
  )
}

// ============ ADMIN CATEGORIES ============
export function AdminCategories() {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCat, setEditingCat] = useState<any>(null)
  const [form, setForm] = useState({ name: '', description: '', imageUrl: '' })

  const load = () => {
    setLoading(true)
    api.get('/categories').then(r => setCategories(r.data.categories || [])).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openAdd = () => { setEditingCat(null); setForm({ name: '', description: '', imageUrl: '' }); setShowModal(true) }
  const openEdit = (cat: any) => { setEditingCat(cat); setForm({ name: cat.name, description: cat.description || '', imageUrl: cat.image_url || '' }); setShowModal(true) }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Category name is required'); return }
    try {
      if (editingCat) {
        await api.put(`/admin/categories/${editingCat.id}`, { name: form.name, description: form.description, imageUrl: form.imageUrl || null })
        toast.success('Category updated')
      } else {
        await api.post('/admin/categories', { name: form.name, description: form.description, imageUrl: form.imageUrl || null })
        toast.success('Category created')
      }
      setShowModal(false)
      load()
    } catch { toast.error('Failed to save category') }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this category? Products in it will lose their category.')) return
    try {
      await api.delete(`/admin/categories/${id}`)
      toast.success('Category deleted')
      load()
    } catch { toast.error('Failed to delete category') }
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
            <p className="text-gray-500 text-sm mt-1">{categories.length} categories</p>
          </div>
          <button onClick={openAdd} className="btn-primary"><Plus size={16} /> Add Category</button>
        </div>

        {loading ? <Skeleton className="h-64 rounded-2xl" /> : (
          <div className="card overflow-hidden">
            <Table headers={['Name', 'Description', 'Products', 'Actions']}>
              {categories.map(cat => (
                <tr key={cat.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">{cat.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{cat.description || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{cat.product_count || 0}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(cat)} className="text-blue-500 hover:text-blue-700"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(cat.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            {categories.length === 0 && <div className="p-8 text-center text-gray-400">No categories yet</div>}
          </div>
        )}

        <Modal open={showModal} onClose={() => setShowModal(false)} title={editingCat ? 'Edit Category' : 'Add Category'}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Electronics" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea className="input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <input className="input" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn-primary">{editingCat ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  )
}

// ============ ADMIN COUPONS ============
export function AdminCoupons() {
  const [coupons, setCoupons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.get('/admin/coupons').then(r => setCoupons(r.data.coupons || [])).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const deactivate = async (id: number) => {
    await api.patch(`/admin/coupons/${id}/deactivate`)
    toast.success('Coupon deactivated')
    load()
  }

  const reactivate = async (id: number) => {
    await api.patch(`/admin/coupons/${id}/reactivate`)
    toast.success('Coupon reactivated')
    load()
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">All Coupons</h1>
        {loading ? <Skeleton className="h-64 rounded-2xl" /> : coupons.length === 0 ? (
          <div className="card p-16 text-center">
            <Tag size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="font-semibold text-gray-500">No coupons found</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <Table headers={['Code', 'Vendor', 'Discount', 'Min Order', 'Usage', 'Expires', 'Status', 'Actions']}>
              {coupons.map(c => (
                <tr key={c.id}>
                  <td className="table-cell px-4 font-mono font-bold text-sm">{c.code}</td>
                  <td className="table-cell px-4 text-sm text-gray-600">{c.store_name}</td>
                  <td className="table-cell px-4 text-sm font-medium">
                    {c.discount_type === 'percentage' ? `${c.discount_value}%` : formatCurrency(c.discount_value)}
                  </td>
                  <td className="table-cell px-4 text-sm text-gray-500">{c.min_order_amount ? formatCurrency(c.min_order_amount) : '—'}</td>
                  <td className="table-cell px-4 text-sm text-gray-500">{c.usage_count || 0}{c.usage_limit ? `/${c.usage_limit}` : ''}</td>
                  <td className="table-cell px-4 text-xs text-gray-500">{c.expires_at ? formatDateTime(c.expires_at) : 'Never'}</td>
                  <td className="table-cell px-4">
                    <StatusBadge status={c.is_active ? 'active' : 'inactive'} />
                  </td>
                  <td className="table-cell px-4">
                    {c.is_active ? (
                      <button onClick={() => deactivate(c.id)}
                        className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded-lg hover:bg-red-100">
                        Deactivate
                      </button>
                    ) : (
                      <button onClick={() => reactivate(c.id)}
                        className="text-xs bg-green-50 text-green-600 px-3 py-1 rounded-lg hover:bg-green-100">
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
