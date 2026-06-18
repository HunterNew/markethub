import React, { useState, useEffect } from 'react'
import { Users, Package, ShoppingBag, DollarSign, TrendingUp, CheckCircle, XCircle, Eye, ToggleLeft, ToggleRight, Plus, Trash2, Edit2, Tag, Wallet, Image, Mail } from 'lucide-react'
import api from '../../api/client'
import { AdminLayout } from '../../components/layout/DashboardLayout'
import { Modal, StatusBadge, Table, Skeleton, StatCard, EmptyState, ConfirmDialog } from '../../components/ui'
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
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-500 mb-8">Platform overview</p>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          <StatCard icon={<DollarSign size={22} />} label="Total Revenue" value={formatCurrency(summary?.totalRevenue || 0)} color="green" />
          <StatCard icon={<TrendingUp size={22} />} label="Total Commissions" value={formatCurrency(summary?.totalCommissions || 0)} color="orange" />
          <StatCard icon={<ShoppingBag size={22} />} label="Total Orders" value={summary?.totalOrders || 0} color="blue" />
          <StatCard icon={<Users size={22} />} label="Active Vendors" value={summary?.activeVendors || 0} color="purple" />
          <StatCard icon={<Package size={22} />} label="Pending Products" value={summary?.pendingProducts || 0} color="blue" />
          <StatCard icon={<Package size={22} />} label="Pending Categories" value={summary?.pendingCategories || 0} color="orange" />
        </div>

        {/* Pending Notifications */}
        {((summary?.pendingProducts || 0) > 0 || (summary?.pendingCategories || 0) > 0 || (summary?.pendingVendors || 0) > 0 || (summary?.pendingBrands || 0) > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-bold text-amber-800 mb-2">⚠️ Requires Your Attention</h3>
            <div className="flex flex-wrap gap-3">
              {(summary?.pendingVendors || 0) > 0 && (
                <a href="/admin/vendors" className="text-xs bg-white border border-amber-200 text-amber-700 px-3 py-1.5 rounded-lg font-medium hover:bg-amber-100 transition-colors">
                  {summary.pendingVendors} Vendor{summary.pendingVendors > 1 ? 's' : ''} awaiting approval
                </a>
              )}
              {(summary?.pendingProducts || 0) > 0 && (
                <a href="/admin/products" className="text-xs bg-white border border-amber-200 text-amber-700 px-3 py-1.5 rounded-lg font-medium hover:bg-amber-100 transition-colors">
                  {summary.pendingProducts} Product{summary.pendingProducts > 1 ? 's' : ''} awaiting approval
                </a>
              )}
              {(summary?.pendingCategories || 0) > 0 && (
                <a href="/admin/categories" className="text-xs bg-white border border-amber-200 text-amber-700 px-3 py-1.5 rounded-lg font-medium hover:bg-amber-100 transition-colors">
                  {summary.pendingCategories} Category request{summary.pendingCategories > 1 ? 's' : ''} pending
                </a>
              )}
              {(summary?.pendingBrands || 0) > 0 && (
                <a href="/admin/brands" className="text-xs bg-white border border-amber-200 text-amber-700 px-3 py-1.5 rounded-lg font-medium hover:bg-amber-100 transition-colors">
                  {summary.pendingBrands} Brand request{summary.pendingBrands > 1 ? 's' : ''} pending
                </a>
              )}
            </div>
          </div>
        )}

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

  const toggleVendor = async (id: number) => {
    try {
      const res = await api.patch(`/admin/vendors/${id}/toggle-status`)
      toast.success(res.data.message); load(filter)
    } catch { toast.error('Failed to update vendor status') }
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Vendor Management</h1>
        <div className="flex gap-2 mb-6">
          {['all', 'pending', 'approved', 'disabled', 'rejected'].map(s => (
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
                      {v.whatsapp_number && (
                        <a href={`https://wa.me/${v.whatsapp_number}?text=Hi ${encodeURIComponent(v.store_name)}, this is MarketHub Admin.`} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors" title="WhatsApp">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </a>
                      )}
                      {v.status === 'pending' && (
                        <>
                          <button onClick={() => approve(v.id)} className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors"><CheckCircle size={14} /></button>
                          <button onClick={() => setRejectModal(v)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors"><XCircle size={14} /></button>
                        </>
                      )}
                      {(v.status === 'approved' || v.status === 'disabled') && (
                        <button
                          onClick={() => toggleVendor(v.id)}
                          className={`p-1.5 rounded-lg transition-colors ${v.status === 'approved' ? 'hover:bg-red-50 text-red-500' : 'hover:bg-green-50 text-green-600'}`}
                          title={v.status === 'approved' ? 'Disable vendor' : 'Enable vendor'}
                        >
                          {v.status === 'approved' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        </button>
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
              {detailVendor.whatsapp_number && (
                <div>
                  <p className="text-gray-400 text-xs">WhatsApp</p>
                  <a href={`https://wa.me/${detailVendor.whatsapp_number}?text=Hi ${encodeURIComponent(detailVendor.store_name)}, this is MarketHub Admin.`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Chat on WhatsApp
                  </a>
                </div>
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
      <div className="p-4 sm:p-6 lg:p-8">
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
      <div className="p-4 sm:p-6 lg:p-8">
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
              {/* Invoice button */}
              <div className="pt-4 border-t border-gray-100">
                <a href={`/invoice/${selected.id}`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm inline-flex items-center gap-1.5">
                  View Invoice
                </a>
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
      <div className="p-4 sm:p-6 lg:p-8">
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

// ============ THEME SELECTOR ============
function ThemeSelector() {
  const [activeTheme, setActiveTheme] = useState<string>('default')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/settings/theme').then(r => setActiveTheme(r.data.theme || 'default')).catch(() => {})
  }, [])

  const themes = [
    { id: 'default', name: 'Default', desc: 'Classic orange marketplace theme with full-width banners' },
    { id: 'tekmarts', name: 'TekMarts', desc: 'Modern dark header, minimal product cards, vendor spotlight' },
    { id: 'darkglass', name: 'Dark Glass', desc: 'Premium dark theme with glassmorphism, gradient glow, amber search bar' },
  ]

  const selectTheme = async (id: string) => {
    setSaving(true)
    try {
      await api.put('/admin/settings/site_theme', { value: id })
      setActiveTheme(id)
      document.documentElement.setAttribute('data-theme', id)
      toast.success(`Theme changed to "${themes.find(t => t.id === id)?.name}". Refresh storefront to see changes.`)
    } catch {
      toast.error('Failed to update theme')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card p-6 mb-6">
      <h2 className="font-bold text-gray-900 mb-1">Storefront Theme</h2>
      <p className="text-xs text-gray-500 mb-4">Choose a layout template for the customer-facing storefront</p>
      <div className="grid sm:grid-cols-2 gap-4">
        {themes.map(t => (
          <button
            key={t.id}
            onClick={() => selectTheme(t.id)}
            disabled={saving}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              activeTheme === t.id
                ? 'border-primary-500 bg-orange-50 ring-2 ring-primary-200'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${activeTheme === t.id ? 'border-primary-500' : 'border-gray-300'}`}>
                {activeTheme === t.id && <div className="w-2 h-2 rounded-full bg-primary-500" />}
              </div>
              <span className="font-semibold text-sm text-gray-900">{t.name}</span>
            </div>
            <p className="text-xs text-gray-500 ml-6">{t.desc}</p>
          </button>
        ))}
      </div>
    </div>
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

  if (loading) return <AdminLayout><div className="p-4 sm:p-6 lg:p-8"><Skeleton className="h-96 rounded-2xl" /></div></AdminLayout>

  return (
    <AdminLayout>
      <div className="p-8 space-y-8 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform Settings</h1>

          {/* Theme Selector */}
          <ThemeSelector />

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

          {/* OTP Verification */}
          <div className="card p-6">
            <h2 className="font-bold text-gray-900 mb-4">OTP Verification</h2>
            <div className="space-y-3">
              <Toggle settingKey="email_otp_required" label="Email OTP (Registration)" desc="Require email verification during registration" />
              <Toggle settingKey="sms_otp_enabled" label="SMS OTP" desc="Enable SMS OTP verification (requires SMS provider setup)" />
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
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [rejectModal, setRejectModal] = useState<any>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = () => {
    setLoading(true)
    const q = filter && filter !== 'all' ? `?status=${filter}` : ''
    api.get(`/admin/withdrawals${q}`).then(r => setWithdrawals(r.data.withdrawals || [])).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [filter])

  const approve = async (id: number) => {
    await api.patch(`/admin/withdrawals/${id}/approve`)
    toast.success('Withdrawal approved'); load()
  }

  const complete = async (id: number) => {
    await api.patch(`/admin/withdrawals/${id}/complete`)
    toast.success('Withdrawal marked as completed'); load()
  }

  const reject = async () => {
    if (!rejectReason.trim()) return toast.error('Reason required')
    await api.patch(`/admin/withdrawals/${rejectModal.id}/reject`, { reason: rejectReason })
    toast.success('Withdrawal rejected'); setRejectModal(null); setRejectReason(''); load()
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Withdrawals</h1>
        <div className="flex gap-2 mb-6">
          {['all', 'pending', 'approved', 'completed', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium capitalize transition-colors ${filter === s ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{s}</button>
          ))}
        </div>
        {loading ? <Skeleton className="h-64 rounded-2xl" /> : withdrawals.length === 0 ? (
          <EmptyState icon={<Wallet size={48} />} title="No withdrawals" description={`No ${filter === 'all' ? '' : filter + ' '}withdrawal requests.`} />
        ) : (
          <div className="card overflow-hidden">
            <Table headers={['Vendor', 'Amount', 'Bank Details', 'Status', 'Date', 'Actions']}>
              {withdrawals.map(w => (
                <tr key={w.id}>
                  <td className="table-cell px-4">
                    <div>
                      <p className="font-medium text-sm">{w.store_name}</p>
                      <p className="text-xs text-gray-400">{w.email}</p>
                    </div>
                  </td>
                  <td className="table-cell px-4 font-bold text-lg">{formatCurrency(w.amount)}</td>
                  <td className="table-cell px-4">
                    <div className="text-xs space-y-0.5">
                      {w.bank_account_number ? (
                        <>
                          <p className="text-gray-700 font-medium">{w.bank_account_name || '—'}</p>
                          <p className="text-gray-500">A/C: <span className="font-mono">{w.bank_account_number}</span></p>
                          <p className="text-gray-500">IFSC: <span className="font-mono">{w.bank_ifsc || '—'}</span></p>
                          <p className="text-gray-400">{w.bank_name || ''}</p>
                        </>
                      ) : (
                        <p className="text-gray-400 italic">No bank details</p>
                      )}
                    </div>
                  </td>
                  <td className="table-cell px-4"><StatusBadge status={w.status} /></td>
                  <td className="table-cell px-4 text-xs text-gray-500">{formatDateTime(w.created_at)}</td>
                  <td className="table-cell px-4">
                    <div className="flex gap-2">
                      {w.status === 'pending' && (
                        <>
                          <button onClick={() => approve(w.id)} className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-100">Approve</button>
                          <button onClick={() => setRejectModal(w)} className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded-lg hover:bg-red-100">Reject</button>
                        </>
                      )}
                      {w.status === 'approved' && (
                        <button onClick={() => complete(w.id)} className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-lg hover:bg-green-100">Mark Completed</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        )}

        <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Withdrawal" size="sm">
          <p className="text-sm text-gray-500 mb-3">Rejecting withdrawal of <strong>{formatCurrency(rejectModal?.amount)}</strong> from <strong>{rejectModal?.store_name}</strong></p>
          <label className="label">Rejection Reason *</label>
          <textarea className="input resize-none" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Why is this withdrawal being rejected?" />
          <div className="flex gap-3 mt-4">
            <button onClick={() => { setRejectModal(null); setRejectReason('') }} className="btn-secondary">Cancel</button>
            <button onClick={reject} className="btn-danger">Reject Withdrawal</button>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  )
}

// Recursive category tree item for admin
function CategoryTreeItem({ cat, categories, depth, onAdd, onEdit, onDelete, onApprove, onReject, onToggle }: { cat: any; categories: any[]; depth: number; onAdd: (parentId?: number) => void; onEdit: (cat: any) => void; onDelete: (id: number) => void; onApprove: (id: number) => void; onReject: (id: number) => void; onToggle: (id: number) => void }) {
  const [expanded, setExpanded] = useState(depth === 0)
  const children = categories.filter(c => c.parent_id === cat.id)

  return (
    <div className={`${depth === 0 ? 'border border-gray-200 rounded-xl bg-white overflow-hidden' : ''}`}>
      <div className={`flex items-center justify-between px-4 py-3 ${depth > 0 ? 'border-b border-gray-50' : ''}`} style={{ paddingLeft: `${depth * 20 + 16}px` }}>
        <div className="flex items-center gap-2">
          {children.length > 0 ? (
            <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600 p-0.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${expanded ? 'rotate-90' : ''}`}><path d="M9 18l6-6-6-6"/></svg>
            </button>
          ) : <span className="w-5" />}
          {depth > 0 && <span className="text-gray-300 text-xs">↳</span>}
          <div>
            <p className={`font-medium ${depth === 0 ? 'text-gray-900 text-sm' : 'text-gray-700 text-xs'}`}>{cat.name}</p>
            {cat.vendor_name && <p className="text-[9px] text-gray-400">by {cat.vendor_name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">{cat.product_count || 0}</span>
          {cat.status === 'pending' ? (
            <div className="flex gap-1">
              <button onClick={() => onApprove(cat.id)} className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-medium">✓</button>
              <button onClick={() => onReject(cat.id)} className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-medium">✗</button>
            </div>
          ) : (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${cat.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{cat.status}</span>
          )}
          <button onClick={() => onAdd(cat.id)} className="p-1 hover:bg-gray-100 rounded text-primary-500" title="Add child"><Plus size={12} /></button>
          {cat.status === 'active' && <button onClick={() => onToggle(cat.id)} className="p-1 hover:bg-yellow-50 rounded text-yellow-600" title="Disable"><ToggleRight size={12} /></button>}
          {cat.status === 'disabled' && <button onClick={() => onToggle(cat.id)} className="p-1 hover:bg-green-50 rounded text-green-600" title="Enable"><ToggleLeft size={12} /></button>}
          <button onClick={() => onEdit(cat)} className="p-1 hover:bg-gray-100 rounded text-blue-500"><Edit2 size={11} /></button>
          <button onClick={() => onDelete(cat.id)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 size={11} /></button>
        </div>
      </div>
      {expanded && children.length > 0 && (
        <div className={`${depth === 0 ? 'bg-gray-50 border-t border-gray-100' : ''}`}>
          {children.map(child => (
            <CategoryTreeItem key={child.id} cat={child} categories={categories} depth={depth + 1} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} onApprove={onApprove} onReject={onReject} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  )
}

// ============ ADMIN CATEGORIES ============
export function AdminCategories() {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCat, setEditingCat] = useState<any>(null)
  const [form, setForm] = useState({ name: '', description: '', imageUrl: '', parentId: '' })
  const [catRequests, setCatRequests] = useState<any[]>([])
  const [catFilter, setCatFilter] = useState('all')

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/categories/all'),
      api.get('/admin/category-requests').catch(() => ({ data: { requests: [] } })),
    ]).then(([c, r]) => {
      setCategories(c.data.categories || [])
      setCatRequests(r.data.requests || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openAdd = (parentId?: number) => { setEditingCat(null); setForm({ name: '', description: '', imageUrl: '', parentId: parentId ? String(parentId) : '' }); setShowModal(true) }
  const openEdit = (cat: any) => { setEditingCat(cat); setForm({ name: cat.name, description: cat.description || '', imageUrl: cat.image_url || '', parentId: cat.parent_id ? String(cat.parent_id) : '' }); setShowModal(true) }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Category name is required'); return }
    try {
      if (editingCat) {
        await api.put(`/categories/${editingCat.id}`, { name: form.name, description: form.description, imageUrl: form.imageUrl || null })
        toast.success('Category updated')
      } else {
        await api.post('/categories', { name: form.name, description: form.description, imageUrl: form.imageUrl || null, parentId: form.parentId ? Number(form.parentId) : null })
        toast.success('Category created')
      }
      setShowModal(false)
      load()
    } catch { toast.error('Failed to save category') }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this category? Products in it will lose their category.')) return
    try {
      await api.delete(`/categories/${id}`)
      toast.success('Category deleted')
      load()
    } catch { toast.error('Failed to delete category') }
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
            <p className="text-gray-500 text-sm mt-1">{categories.length} categories</p>
          </div>
          <div className="flex items-center gap-2">
            {catRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                {catRequests.filter(r => r.status === 'pending').length} Pending Request{catRequests.filter(r => r.status === 'pending').length > 1 ? 's' : ''}
              </span>
            )}
            <button onClick={() => openAdd()} className="btn-primary"><Plus size={16} /> Add Category</button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {[
            { key: 'all', label: 'All' },
            { key: 'requests', label: 'Requests' },
            { key: 'disabled', label: 'Disabled' },
            { key: 'rejected', label: 'Rejected' },
          ].map(f => {
            const reqCount = f.key === 'requests' ? (catRequests.filter(r => r.status === 'pending').length + categories.filter(c => c.status === 'pending').length) : 0
            return (
              <button key={f.key} onClick={() => setCatFilter(f.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${catFilter === f.key ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {f.label}
                {reqCount > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full inline-flex items-center justify-center">{reqCount}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Vendor Category Requests - show when 'requests' or 'all' tab */}
        {(catFilter === 'all' || catFilter === 'requests') && catRequests.filter(r => r.status === 'pending').length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Pending Requests ({catRequests.filter(r => r.status === 'pending').length})
            </h2>
            <div className="space-y-2.5">
              {catRequests.filter(r => r.status === 'pending').map(r => {
                // Build full parent path
                const getPath = (parentId: number | null): string[] => {
                  if (!parentId) return []
                  const cat = categories.find(c => c.id === parentId)
                  if (!cat) return []
                  return [...getPath(cat.parent_id), cat.name]
                }
                const parentPath = getPath(r.parent_id)

                return (
                  <div key={r.id} className="border border-amber-200 rounded-xl bg-amber-50/50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-sm">"{r.name}"</p>
                        {r.description && <p className="text-xs text-gray-600 mt-0.5">{r.description}</p>}
                        {/* Full parent path */}
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          <span className="text-[10px] text-gray-400 font-medium uppercase">Will be under:</span>
                          {parentPath.length > 0 ? (
                            <>
                              {parentPath.map((p, i) => (
                                <span key={i} className="flex items-center gap-1">
                                  <span className="text-xs text-gray-600 bg-white border border-gray-200 px-1.5 py-0.5 rounded">{p}</span>
                                  <span className="text-gray-300 text-xs">›</span>
                                </span>
                              ))}
                              <span className="text-xs text-primary-600 font-bold bg-primary-50 border border-primary-200 px-1.5 py-0.5 rounded">{r.name}</span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-500 italic">New top-level category</span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2">
                          Requested by: <span className="font-medium text-gray-600">{r.vendor_name || 'Vendor'}</span>
                          {r.created_at && <span> • {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={async () => { await api.put(`/admin/category-requests/${r.id}`, { status: 'approved' }); toast.success('Category approved & created'); load() }}
                          className="text-xs bg-green-500 text-white hover:bg-green-600 px-3 py-1.5 rounded-lg font-medium transition-colors">✓ Approve</button>
                        <button onClick={async () => { await api.put(`/admin/category-requests/${r.id}`, { status: 'rejected', adminNote: 'Not needed' }); toast.success('Request rejected'); load() }}
                          className="text-xs bg-white text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg font-medium transition-colors">✗ Reject</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {loading ? <Skeleton className="h-64 rounded-2xl" /> : catFilter === 'requests' ? (
          /* Requests tab - show pending from both sources */
          (() => {
            // Combine: category_requests (pending) + categories with status='pending'
            const pendingFromRequests = catRequests.filter(r => r.status === 'pending').map(r => ({ ...r, source: 'request' }))
            const pendingFromCategories = categories.filter(c => c.status === 'pending').map(c => ({ ...c, source: 'category', name: c.name, vendor_name: c.vendor_name, parent_id: c.parent_id, created_at: c.created_at }))
            const allPending = [...pendingFromCategories, ...pendingFromRequests]
            // Also show history (approved/rejected requests)
            const history = catRequests.filter(r => r.status !== 'pending').map(r => ({ ...r, source: 'request' }))

            return allPending.length === 0 && history.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No category requests</div>
            ) : (
              <div className="space-y-3">
                {allPending.length > 0 && <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wide">Pending ({allPending.length})</h3>}
                {allPending.map((r, idx) => {
                  const getPath = (parentId: number | null): string[] => {
                    if (!parentId) return []
                    const cat = categories.find(c => c.id === parentId)
                    if (!cat) return []
                    return [...getPath(cat.parent_id), cat.name]
                  }
                  const parentPath = getPath(r.parent_id || null)
                  return (
                    <div key={`${r.source}-${r.id}-${idx}`} className="border border-amber-200 rounded-xl bg-amber-50/50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 text-sm">"{r.name}"</p>
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">pending</span>
                          </div>
                          {r.description && <p className="text-xs text-gray-600 mt-0.5">{r.description}</p>}
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            <span className="text-[10px] text-gray-400 font-medium">Under:</span>
                            {parentPath.length > 0 ? (
                              <>
                                {parentPath.map((p, i) => (
                                  <span key={i} className="flex items-center gap-1">
                                    <span className="text-xs text-gray-600 bg-white border border-gray-200 px-1.5 py-0.5 rounded">{p}</span>
                                    <span className="text-gray-300 text-xs">›</span>
                                  </span>
                                ))}
                                <span className="text-xs text-primary-600 font-bold bg-primary-50 border border-primary-200 px-1.5 py-0.5 rounded">{r.name}</span>
                              </>
                            ) : (
                              <span className="text-xs text-gray-500 italic">Top-level category</span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-2">By: <span className="font-medium text-gray-600">{r.vendor_name || 'Vendor'}</span>{r.created_at && ` • ${new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {r.source === 'category' ? (
                            <>
                              <button onClick={async () => { await api.put(`/categories/${r.id}/approve`, { status: 'active' }); toast.success('Approved'); load() }}
                                className="text-xs bg-green-500 text-white hover:bg-green-600 px-3 py-1.5 rounded-lg font-medium">✓ Approve</button>
                              <button onClick={async () => { await api.put(`/categories/${r.id}/approve`, { status: 'rejected' }); toast.success('Rejected'); load() }}
                                className="text-xs bg-white text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg font-medium">✗ Reject</button>
                            </>
                          ) : (
                            <>
                              <button onClick={async () => { await api.put(`/admin/category-requests/${r.id}`, { status: 'approved' }); toast.success('Approved'); load() }}
                                className="text-xs bg-green-500 text-white hover:bg-green-600 px-3 py-1.5 rounded-lg font-medium">✓ Approve</button>
                              <button onClick={async () => { await api.put(`/admin/category-requests/${r.id}`, { status: 'rejected', adminNote: '' }); toast.success('Rejected'); load() }}
                                className="text-xs bg-white text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg font-medium">✗ Reject</button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {history.length > 0 && (
                  <>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-6">History</h3>
                    {history.map(r => (
                      <div key={`h-${r.id}`} className={`border rounded-xl p-3 ${r.status === 'approved' ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30'}`}>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-700">{r.name}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.status}</span>
                          <span className="text-[10px] text-gray-400 ml-auto">{r.vendor_name}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )
          })()
        ) : (
          <div className="space-y-2">
            {categories.filter(c => !c.parent_id).filter(c => {
              if (catFilter === 'all') return c.status !== 'pending'
              if (catFilter === 'disabled') return c.status === 'disabled'
              if (catFilter === 'rejected') return c.status === 'rejected'
              return true
            }).map(cat => (
              <CategoryTreeItem key={cat.id} cat={cat} categories={categories} depth={0} onAdd={openAdd} onEdit={openEdit} onDelete={handleDelete} onApprove={async (id) => { await api.put(`/categories/${id}/approve`, { status: 'active' }); toast.success('Approved'); load() }} onReject={async (id) => { await api.put(`/categories/${id}/approve`, { status: 'rejected' }); toast.success('Rejected'); load() }} onToggle={async (id) => { await api.patch(`/categories/${id}/toggle`); toast.success('Status updated'); load() }} />
            ))}
            {categories.filter(c => !c.parent_id).filter(c => catFilter === 'all' ? c.status !== 'pending' : c.status === catFilter).length === 0 && <div className="p-8 text-center text-gray-400">No categories found</div>}
          </div>
        )}

        <Modal open={showModal} onClose={() => setShowModal(false)} title={editingCat ? 'Edit Category' : 'Add Category'}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Electronics" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category (optional)</label>
              <select className="input" value={form.parentId} onChange={e => setForm({ ...form, parentId: e.target.value })}>
                <option value="">None (top-level category)</option>
                {(() => {
                  // Recursive option builder for infinite depth
                  const buildOptions = (parentId: number | null, depth: number): any[] => {
                    return categories
                      .filter(c => c.parent_id === parentId && c.status === 'active' && c.id !== editingCat?.id)
                      .flatMap(c => [
                        <option key={c.id} value={c.id}>{'—'.repeat(depth)} {c.name}</option>,
                        ...buildOptions(c.id, depth + 1)
                      ])
                  }
                  return buildOptions(null, 0)
                })()}
              </select>
              <p className="text-[10px] text-gray-400 mt-1">Select any category as parent to create deeper nesting.</p>
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
      <div className="p-4 sm:p-6 lg:p-8">
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

// ============ ADMIN BANNERS ============
export function AdminBanners() {
  const [banners, setBanners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ image_url: '', title: '', subtitle: '', description: '', link_url: '', sort_order: 0 })
  const [uploading, setUploading] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/admin/banners').then(r => setBanners(r.data.banners || [])).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ image_url: '', title: '', subtitle: '', description: '', link_url: '', sort_order: banners.length })
    setModalOpen(true)
  }

  const openEdit = (b: any) => {
    setEditing(b)
    setForm({ image_url: b.image_url, title: b.title || '', subtitle: b.subtitle || '', description: b.description || '', link_url: b.link_url || '', sort_order: b.sort_order })
    setModalOpen(true)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('image', file)
    setUploading(true)
    try {
      const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setForm(prev => ({ ...prev, image_url: res.data.url }))
      toast.success('Image uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!form.image_url) return toast.error('Image is required')
    try {
      if (editing) {
        await api.put(`/admin/banners/${editing.id}`, form)
        toast.success('Banner updated')
      } else {
        await api.post('/admin/banners', form)
        toast.success('Banner created')
      }
      setModalOpen(false)
      load()
    } catch {
      toast.error('Failed to save banner')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await api.delete(`/admin/banners/${deleteId}`)
      toast.success('Banner deleted')
      setDeleteId(null)
      load()
    } catch {
      toast.error('Failed to delete banner')
    }
  }

  const toggleActive = async (b: any) => {
    try {
      await api.put(`/admin/banners/${b.id}`, { is_active: !b.is_active })
      toast.success(b.is_active ? 'Banner deactivated' : 'Banner activated')
      load()
    } catch {
      toast.error('Failed to update banner')
    }
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Homepage Banners</h1>
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} /> Add Banner
          </button>
        </div>

        {loading ? <Skeleton className="h-64 rounded-2xl" /> : banners.length === 0 ? (
          <EmptyState icon={<Image size={48} />} title="No banners" description="Add banners to display on the homepage slider." action={<button onClick={openAdd} className="btn-primary"><Plus size={16} /> Add Banner</button>} />
        ) : (
          <div className="card overflow-hidden">
            <Table headers={['Image', 'Title', 'Sort Order', 'Active', 'Actions']}>
              {banners.map(b => (
                <tr key={b.id}>
                  <td className="table-cell px-4">
                    <div className="w-24 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img src={b.image_url} alt={b.title || 'Banner'} className="w-full h-full object-cover" />
                    </div>
                  </td>
                  <td className="table-cell px-4">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{b.title || '(No title)'}</p>
                      {b.subtitle && <p className="text-xs text-gray-400 truncate max-w-[200px]">{b.subtitle}</p>}
                    </div>
                  </td>
                  <td className="table-cell px-4 text-center text-sm text-gray-600">{b.sort_order}</td>
                  <td className="table-cell px-4">
                    <button onClick={() => toggleActive(b)} className="text-gray-500 hover:text-primary-500 transition-colors">
                      {b.is_active ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} />}
                    </button>
                  </td>
                  <td className="table-cell px-4">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(b)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteId(b.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        )}

        {/* Add/Edit Modal */}
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Banner' : 'Add Banner'}>
          <div className="space-y-4">
            <div>
              <label className="label">Banner Image *</label>
              {form.image_url && (
                <div className="mb-3 rounded-xl overflow-hidden bg-gray-100 h-40">
                  <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleUpload} className="input" disabled={uploading} />
              {uploading && <p className="text-xs text-gray-400 mt-1">Uploading...</p>}
              <p className="text-xs text-gray-400 mt-1">Or paste URL directly:</p>
              <input type="text" className="input mt-1" placeholder="https://..." value={form.image_url} onChange={e => setForm(prev => ({ ...prev, image_url: e.target.value }))} />
            </div>
            <div>
              <label className="label">Title</label>
              <input type="text" className="input" placeholder="Banner title" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">Subtitle (shown as badge/tagline on top)</label>
              <input type="text" className="input" placeholder="e.g. New arrivals every day" value={form.subtitle} onChange={e => setForm(prev => ({ ...prev, subtitle: e.target.value }))} />
            </div>
            <div>
              <label className="label">Description (shown below title)</label>
              <input type="text" className="input" placeholder="e.g. Discover millions of products from verified vendors." value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} />
            </div>
            <div>
              <label className="label">Link URL</label>
              <input type="text" className="input" placeholder="/products or https://..." value={form.link_url} onChange={e => setForm(prev => ({ ...prev, link_url: e.target.value }))} />
            </div>
            <div>
              <label className="label">Sort Order</label>
              <input type="number" className="input" value={form.sort_order} onChange={e => setForm(prev => ({ ...prev, sort_order: Number(e.target.value) }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn-primary" disabled={uploading}>{editing ? 'Update' : 'Create'} Banner</button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDelete}
          title="Delete Banner"
          message="Are you sure you want to delete this banner? This action cannot be undone."
          confirmLabel="Delete"
          danger
        />
      </div>
    </AdminLayout>
  )
}

// ============ ADMIN PROMO CARDS ============
export function AdminPromoCards() {
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ image_url: '', title: '', subtitle: '', link_url: '', sort_order: 0 })
  const [uploading, setUploading] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/admin/promo-cards').then(r => setCards(r.data.cards || [])).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ image_url: '', title: '', subtitle: '', link_url: '', sort_order: cards.length })
    setModalOpen(true)
  }

  const openEdit = (c: any) => {
    setEditing(c)
    setForm({ image_url: c.image_url, title: c.title || '', subtitle: c.subtitle || '', link_url: c.link_url || '', sort_order: c.sort_order })
    setModalOpen(true)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('image', file)
    setUploading(true)
    try {
      const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setForm(prev => ({ ...prev, image_url: res.data.url }))
      toast.success('Image uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!form.image_url || !form.title) return toast.error('Image and title are required')
    try {
      if (editing) {
        await api.put(`/admin/promo-cards/${editing.id}`, form)
        toast.success('Promo card updated')
      } else {
        await api.post('/admin/promo-cards', form)
        toast.success('Promo card created')
      }
      setModalOpen(false)
      load()
    } catch {
      toast.error('Failed to save promo card')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await api.delete(`/admin/promo-cards/${deleteId}`)
      toast.success('Promo card deleted')
      setDeleteId(null)
      load()
    } catch {
      toast.error('Failed to delete promo card')
    }
  }

  const toggleActive = async (c: any) => {
    try {
      await api.put(`/admin/promo-cards/${c.id}`, { is_active: !c.is_active })
      toast.success(c.is_active ? 'Card deactivated' : 'Card activated')
      load()
    } catch {
      toast.error('Failed to update card')
    }
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Promo Cards</h1>
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} /> Add Promo Card
          </button>
        </div>

        {loading ? <Skeleton className="h-64 rounded-2xl" /> : cards.length === 0 ? (
          <EmptyState icon={<Image size={48} />} title="No promo cards" description="Add promotional cards to display on the homepage." action={<button onClick={openAdd} className="btn-primary"><Plus size={16} /> Add Promo Card</button>} />
        ) : (
          <div className="card overflow-hidden">
            <Table headers={['Image', 'Title', 'Subtitle', 'Link', 'Order', 'Active', 'Actions']}>
              {cards.map(c => (
                <tr key={c.id}>
                  <td className="table-cell px-4">
                    <div className="w-24 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img src={c.image_url} alt={c.title} className="w-full h-full object-cover" />
                    </div>
                  </td>
                  <td className="table-cell px-4 font-medium text-gray-800 text-sm">{c.title}</td>
                  <td className="table-cell px-4 text-sm text-gray-500">{c.subtitle || '—'}</td>
                  <td className="table-cell px-4 text-sm text-gray-500 truncate max-w-[150px]">{c.link_url || '—'}</td>
                  <td className="table-cell px-4 text-center text-sm text-gray-600">{c.sort_order}</td>
                  <td className="table-cell px-4">
                    <button onClick={() => toggleActive(c)} className="text-gray-500 hover:text-primary-500 transition-colors">
                      {c.is_active ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} />}
                    </button>
                  </td>
                  <td className="table-cell px-4">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteId(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        )}

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Promo Card' : 'Add Promo Card'}>
          <div className="space-y-4">
            <div>
              <label className="label">Card Image *</label>
              {form.image_url && (
                <div className="mb-3 rounded-xl overflow-hidden bg-gray-100 h-40">
                  <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleUpload} className="input" disabled={uploading} />
              {uploading && <p className="text-xs text-gray-400 mt-1">Uploading...</p>}
              <p className="text-xs text-gray-400 mt-1">Or paste URL directly:</p>
              <input type="text" className="input mt-1" placeholder="https://..." value={form.image_url} onChange={e => setForm(prev => ({ ...prev, image_url: e.target.value }))} />
            </div>
            <div>
              <label className="label">Title *</label>
              <input type="text" className="input" placeholder="e.g. Latest Electronics" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">Subtitle</label>
              <input type="text" className="input" placeholder="e.g. Up to 40% off" value={form.subtitle} onChange={e => setForm(prev => ({ ...prev, subtitle: e.target.value }))} />
            </div>
            <div>
              <label className="label">Link URL</label>
              <input type="text" className="input" placeholder="/products?categoryId=1" value={form.link_url} onChange={e => setForm(prev => ({ ...prev, link_url: e.target.value }))} />
            </div>
            <div>
              <label className="label">Sort Order</label>
              <input type="number" className="input" value={form.sort_order} onChange={e => setForm(prev => ({ ...prev, sort_order: Number(e.target.value) }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn-primary" disabled={uploading}>{editing ? 'Update' : 'Create'} Promo Card</button>
            </div>
          </div>
        </Modal>

        <ConfirmDialog
          open={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDelete}
          title="Delete Promo Card"
          message="Are you sure you want to delete this promo card? This action cannot be undone."
          confirmLabel="Delete"
          danger
        />
      </div>
    </AdminLayout>
  )
}

// ============ ADMIN RETURNS & REFUNDS ============
export function AdminReturns() {
  const [returns, setReturns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.get('/orders/returns/admin').then(r => setReturns(r.data.returns || [])).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const processRefund = async (id: number) => {
    if (!confirm('Process refund? Amount will be credited to customer within 3-5 business days.')) return
    try {
      await api.put(`/orders/returns/${id}/refund`, { adminNote: 'Refund processed. Amount will be credited within 3-5 business days.' })
      toast.success('Refund processed')
      load()
    } catch {
      toast.error('Failed to process refund')
    }
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Returns & Refunds</h1>

        {loading ? <Skeleton className="h-64 rounded-2xl" /> : returns.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">No return requests yet.</div>
        ) : (
          <div className="card overflow-hidden">
            <Table headers={['Order', 'Customer', 'Vendor', 'Reason', 'Proof', 'Amount', 'Status', 'Actions']}>
              {returns.map(r => (
                <tr key={r.id}>
                  <td className="table-cell px-4 font-mono font-bold text-gray-800">#{r.order_id}</td>
                  <td className="table-cell px-4">
                    <p className="text-sm font-medium">{r.first_name} {r.last_name}</p>
                    <p className="text-xs text-gray-400">{r.customer_email}</p>
                  </td>
                  <td className="table-cell px-4 text-sm text-gray-600">{r.vendor_name}</td>
                  <td className="table-cell px-4 text-sm text-gray-600 max-w-[150px] truncate" title={r.reason}>{r.reason}</td>
                  <td className="table-cell px-4">
                    {r.proof_image_url && (
                      <a href={r.proof_image_url} target="_blank" rel="noopener noreferrer">
                        <img src={r.proof_image_url} alt="Proof" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                      </a>
                    )}
                  </td>
                  <td className="table-cell px-4 font-bold text-sm">{formatCurrency(r.refund_amount || r.total)}</td>
                  <td className="table-cell px-4"><StatusBadge status={r.status === 'refund_pending' ? 'pending' : r.status} /></td>
                  <td className="table-cell px-4">
                    {r.status === 'refund_pending' && (
                      <button onClick={() => processRefund(r.id)} className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                        Process Refund
                      </button>
                    )}
                    {r.status === 'refunded' && <span className="text-xs text-green-600">Done</span>}
                    {r.status === 'pending' && <span className="text-xs text-gray-400">Awaiting vendor</span>}
                    {r.status === 'rejected' && <span className="text-xs text-red-500">Rejected</span>}
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


// ============ ADMIN REVIEWS ============
export function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([])
  const [stats, setStats] = useState<any>({ total: 0, avgRating: 0 })
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.get('/reviews/admin').then(r => {
      setReviews(r.data.reviews || [])
      setStats(r.data.stats || { total: 0, avgRating: 0 })
    }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const deleteReview = async (id: number) => {
    if (!confirm('Delete this review?')) return
    try {
      await api.delete(`/reviews/admin/${id}`)
      toast.success('Review deleted')
      load()
    } catch { toast.error('Failed to delete') }
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">All Reviews</h1>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border border-gray-200 rounded-xl bg-white p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total Reviews</p>
          </div>
          <div className="border border-gray-200 rounded-xl bg-white p-4 text-center">
            <p className="text-3xl font-bold text-amber-500">⭐ {stats.avgRating}</p>
            <p className="text-xs text-gray-500">Average Rating</p>
          </div>
        </div>

        {loading ? <Skeleton className="h-64 rounded-2xl" /> : reviews.length === 0 ? (
          <div className="border border-gray-200 rounded-xl bg-white p-8 text-center text-gray-400">No reviews yet.</div>
        ) : (
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className="border border-gray-200 rounded-xl bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                    {r.product_image && <img src={r.product_image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.product_name}</p>
                    <p className="text-xs text-gray-400">{r.vendor_name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {[1,2,3,4,5].map(s => (
                        <span key={s} className={`text-xs ${s <= r.rating ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => deleteReview(r.id)} className="text-xs text-red-500 hover:text-red-700 p-1">Delete</button>
                </div>
                <div className="mt-2 pl-15">
                  <p className="text-xs text-gray-500">by {r.first_name} {r.last_name} ({r.customer_email}) • {formatDateTime(r.created_at)}</p>
                  {r.title && <p className="font-medium text-gray-800 text-sm mt-1">{r.title}</p>}
                  {r.comment && <p className="text-sm text-gray-600 mt-0.5">{r.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}


// ============ ADMIN NOTIFICATIONS ============
export function AdminNotifications() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [customerCount, setCustomerCount] = useState(0)

  useEffect(() => {
    api.get('/admin/notifications/customers').then(r => setCustomerCount(r.data.total || 0)).catch(() => {})
  }, [])

  const sendEmail = async () => {
    if (!subject.trim() || !message.trim()) return toast.error('Subject and message are required')
    if (!confirm(`Send this email to ${customerCount} customers?`)) return
    setSending(true)
    try {
      const res = await api.post('/admin/notifications/send-email', { subject, message })
      toast.success(res.data.message)
      setSubject('')
      setMessage('')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send')
    } finally { setSending(false) }
  }

  const shareWhatsApp = () => {
    if (!message.trim()) return toast.error('Write a message first')
    const text = `*${subject || 'MarketHub Offer'}*\n\n${message}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Send Notification</h1>
        <p className="text-sm text-gray-500 mb-6">Notify all registered customers about offers, coupons, or updates.</p>

        {/* Stats */}
        <div className="border border-gray-200 rounded-xl bg-white p-4 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Users size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{customerCount}</p>
            <p className="text-xs text-gray-500">Registered Customers</p>
          </div>
        </div>

        {/* Compose */}
        <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-900">Compose Message</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="label">Subject / Title *</label>
              <input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. 🎉 Flat 20% OFF on all products!" />
            </div>
            <div>
              <label className="label">Message *</label>
              <textarea className="input resize-none" rows={6} value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Write your offer details, coupon code, validity, etc.&#10;&#10;Example:&#10;Use code SAVE20 to get 20% off on your next order!&#10;Valid till 30th May 2026.&#10;Shop now at MarketHub!" />
            </div>

            {/* Preview */}
            {message && (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <p className="text-xs text-gray-500 uppercase font-medium mb-2">Preview</p>
                <p className="font-bold text-gray-900 mb-1">{subject || 'No subject'}</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{message}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button onClick={sendEmail} disabled={sending}
                className="btn-primary flex-1 justify-center py-2.5">
                {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                  <><Mail size={16} /> Send Email to All ({customerCount})</>
                )}
              </button>
              <button onClick={shareWhatsApp}
                className="flex-1 justify-center py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium text-sm flex items-center gap-2 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Share via WhatsApp
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center">Email: sends to all customers automatically. WhatsApp: opens your WhatsApp to share manually.</p>
          </div>
        </div>

        {/* WhatsApp Broadcast Helper */}
        <div className="border border-gray-200 rounded-xl bg-white overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-900">WhatsApp Broadcast Helper</h2>
            <p className="text-xs text-gray-500 mt-0.5">Copy customer numbers to create a WhatsApp Broadcast List</p>
          </div>
          <div className="p-6">
            <CustomerPhoneList />
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}


function CustomerPhoneList() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/notifications/customers').then(r => setCustomers(r.data.customers || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const phonesWithNumbers = customers.filter(c => c.phone)

  const copyAllNumbers = () => {
    const numbers = phonesWithNumbers.map(c => c.phone).join('\n')
    navigator.clipboard.writeText(numbers)
    toast.success(`${phonesWithNumbers.length} numbers copied!`)
  }

  const copyMessage = () => {
    const msgEl = document.querySelector('[data-notification-message]') as HTMLTextAreaElement
    if (msgEl && msgEl.value) {
      navigator.clipboard.writeText(msgEl.value)
      toast.success('Message copied!')
    } else {
      toast.error('Write a message first')
    }
  }

  if (loading) return <div className="text-sm text-gray-400">Loading...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-700"><span className="font-bold">{phonesWithNumbers.length}</span> customers with phone numbers</p>
        <button onClick={copyAllNumbers} disabled={phonesWithNumbers.length === 0}
          className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50">
          Copy All Numbers
        </button>
      </div>

      {phonesWithNumbers.length > 0 && (
        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-1">
          {phonesWithNumbers.map(c => (
            <div key={c.id} className="flex items-center justify-between text-sm py-1">
              <span className="text-gray-700">{c.first_name} {c.last_name}</span>
              <span className="text-gray-500 font-mono text-xs">{c.phone}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 space-y-2">
        <p className="font-bold">How to send WhatsApp to all customers:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click "Copy All Numbers" above</li>
          <li>Open WhatsApp → New Broadcast → paste numbers one by one (or save as contacts first)</li>
          <li>Write your message in the broadcast and send</li>
        </ol>
        <p className="text-blue-500 mt-2">Tip: Save all customer numbers as contacts first, then they'll appear in your Broadcast List.</p>
      </div>
    </div>
  )
}

// ============ ADMIN BRANDS ============
export function AdminBrands() {
  const [brands, setBrands] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editBrand, setEditBrand] = useState<any>(null)
  const [form, setForm] = useState({ name: '', logoUrl: '', subcategoryIds: [] as number[] })
  const [tab, setTab] = useState<'brands' | 'requests'>('brands')
  const [rejectNote, setRejectNote] = useState('')
  const [rejectModal, setRejectModal] = useState<any>(null)

  const loadBrands = () => {
    setLoading(true)
    Promise.all([
      api.get('/brands?showAll=true'),
      api.get('/categories'),
      api.get('/brands/requests'),
    ]).then(([b, c, r]) => {
      setBrands(b.data.brands || [])
      setCategories(c.data.categories || [])
      setRequests(r.data.requests || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(loadBrands, [])

  const subcategories = categories.filter(c => c.parent_id)

  const openAdd = () => {
    setEditBrand(null)
    setForm({ name: '', logoUrl: '', subcategoryIds: [] })
    setShowForm(true)
  }

  const openEdit = async (brand: any) => {
    setEditBrand(brand)
    try {
      const res = await api.get(`/brands/${brand.id}`)
      const detail = res.data.brand
      setForm({
        name: detail.name,
        logoUrl: detail.logo_url || '',
        subcategoryIds: (detail.categories || []).map((c: any) => c.id),
      })
    } catch {
      setForm({ name: brand.name, logoUrl: brand.logo_url || '', subcategoryIds: [] })
    }
    setShowForm(true)
  }

  const saveBrand = async () => {
    if (!form.name.trim()) return toast.error('Brand name is required')
    try {
      if (editBrand) {
        await api.put(`/brands/${editBrand.id}`, form)
        toast.success('Brand updated!')
      } else {
        await api.post('/brands', form)
        toast.success('Brand created!')
      }
      setShowForm(false)
      loadBrands()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving brand')
    }
  }

  const deleteBrand = async (id: number) => {
    if (!confirm('Delete this brand? Products using it will have their brand cleared.')) return
    await api.delete(`/brands/${id}`).catch(() => {})
    toast.success('Brand deleted')
    loadBrands()
  }

  const toggleBrand = async (id: number, currentStatus: string) => {
    try {
      await api.patch(`/brands/${id}/toggle`)
      toast.success(currentStatus === 'active' ? 'Brand disabled' : 'Brand enabled')
      loadBrands()
    } catch { toast.error('Failed to update brand') }
  }

  const approveRequest = async (id: number) => {
    await api.put(`/brands/requests/${id}`, { status: 'approved' })
    toast.success('Brand request approved')
    loadBrands()
  }

  const rejectRequest = async () => {
    if (!rejectModal) return
    await api.put(`/brands/requests/${rejectModal.id}`, { status: 'rejected', adminNote: rejectNote })
    toast.success('Brand request rejected')
    setRejectModal(null)
    setRejectNote('')
    loadBrands()
  }

  const toggleSubcategory = (id: number) => {
    setForm(prev => ({
      ...prev,
      subcategoryIds: prev.subcategoryIds.includes(id)
        ? prev.subcategoryIds.filter(s => s !== id)
        : [...prev.subcategoryIds, id],
    }))
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Brands</h1>
          <button onClick={openAdd} className="btn-primary text-sm"><Plus size={14} /> Add Brand</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('brands')}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${tab === 'brands' ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            Brands
          </button>
          <button onClick={() => setTab('requests')}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${tab === 'requests' ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            Requests {requests.filter(r => r.status === 'pending').length > 0 && <span className="ml-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full inline-flex items-center justify-center">{requests.filter(r => r.status === 'pending').length}</span>}
          </button>
        </div>

        {loading ? <Skeleton className="h-64 rounded-2xl" /> : tab === 'brands' ? (
          brands.length === 0 ? (
            <EmptyState icon={<Tag size={48} />} title="No brands yet" description="Create brands to associate with products."
              action={<button onClick={openAdd} className="btn-primary"><Plus size={16} /> Add Brand</button>} />
          ) : (
            <div className="card overflow-hidden">
              <Table headers={['Brand', 'Logo', 'Subcategories', 'Products', 'Actions']}>
                {brands.map(b => (
                  <tr key={b.id}>
                    <td className="table-cell px-4 font-medium text-gray-800">{b.name}</td>
                    <td className="table-cell px-4">
                      {b.logo_url ? <img src={b.logo_url} alt="" className="w-8 h-8 rounded object-cover" /> : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="table-cell px-4 text-sm text-gray-500">{b.subcategory_count || '—'}</td>
                    <td className="table-cell px-4 text-sm">{b.product_count || 0}</td>
                    <td className="table-cell px-4">
                      <div className="flex gap-2">
                        <button onClick={() => toggleBrand(b.id, b.status)} className={`p-1.5 rounded-lg transition-colors ${b.status === 'active' ? 'hover:bg-yellow-50 text-yellow-600' : 'hover:bg-green-50 text-green-600'}`} title={b.status === 'active' ? 'Disable' : 'Enable'}>
                          {b.status === 'active' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        </button>
                        <button onClick={() => openEdit(b)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Edit2 size={14} /></button>
                        <button onClick={() => deleteBrand(b.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
          )
        ) : (
          /* Brand Requests Tab */
          requests.length === 0 ? (
            <EmptyState icon={<Tag size={48} />} title="No brand requests" description="Vendor brand requests will appear here." />
          ) : (
            <div className="card overflow-hidden">
              <Table headers={['Brand Name', 'Vendor', 'Subcategory', 'Status', 'Actions']}>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td className="table-cell px-4 font-medium text-gray-800">{r.brand_name}</td>
                    <td className="table-cell px-4 text-sm text-gray-500">{r.vendor_name}</td>
                    <td className="table-cell px-4 text-sm text-gray-500">{r.category_name}</td>
                    <td className="table-cell px-4"><StatusBadge status={r.status} /></td>
                    <td className="table-cell px-4">
                      {r.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => approveRequest(r.id)} className="p-1.5 hover:bg-green-50 rounded-lg text-green-600"><CheckCircle size={14} /></button>
                          <button onClick={() => setRejectModal(r)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><XCircle size={14} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
          )
        )}

        {/* Brand Create/Edit Modal */}
        <Modal open={showForm} onClose={() => setShowForm(false)} title={editBrand ? 'Edit Brand' : 'Create Brand'} size="sm">
          <div className="space-y-4">
            <div>
              <label className="label">Brand Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Samsung" />
            </div>
            <div>
              <label className="label">Logo URL</label>
              <input className="input" value={form.logoUrl} onChange={e => setForm(prev => ({ ...prev, logoUrl: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <label className="label">Subcategories</label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                {subcategories.map(cat => (
                  <label key={cat.id} className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer text-sm">
                    <input type="checkbox" checked={form.subcategoryIds.includes(cat.id)}
                      onChange={() => toggleSubcategory(cat.id)} className="rounded" />
                    {cat.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button onClick={saveBrand} className="btn-primary flex-1 justify-center">{editBrand ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </Modal>

        {/* Reject Request Modal */}
        <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Brand Request" size="sm">
          <p className="text-sm text-gray-500 mb-3">Rejecting: <strong>{rejectModal?.brand_name}</strong></p>
          <label className="label">Admin Note (optional)</label>
          <textarea className="input resize-none" rows={3} value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Reason for rejection..." />
          <div className="flex gap-3 mt-4">
            <button onClick={() => setRejectModal(null)} className="btn-secondary">Cancel</button>
            <button onClick={rejectRequest} className="btn-danger">Reject</button>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  )
}
