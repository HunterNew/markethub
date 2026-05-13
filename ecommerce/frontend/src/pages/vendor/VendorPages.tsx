import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, Package, ShoppingBag, DollarSign, Tag, Upload, Download, CheckCircle, XCircle, Zap, Eye } from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { VendorLayout } from '../../components/layout/DashboardLayout'
import { Modal, StatusBadge, Table, Skeleton, ConfirmDialog, StatCard, EmptyState } from '../../components/ui'
import { formatCurrency, formatDateTime, getStatusLabel } from '../../utils/helpers'
import toast from '../../components/ui/Toast'
import VariantConfigPanel, { VariantConfigPanelRef } from '../../components/vendor/VariantConfigPanel'

// ============ VENDOR DASHBOARD HOME ============
export function VendorDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      api.get('/vendor/products/mine').catch(() => ({ data: { products: [] } })),
      api.get('/orders/vendor').catch(() => ({ data: { orders: [] } })),
      api.get('/vendor/withdrawals').catch(() => ({ data: { availableBalance: 0 } })),
    ]).then(([p, o, w]) => {
      setStats({
        products: p.data.products?.length || 0,
        orders: o.data.orders?.length || 0,
        balance: w.data.availableBalance || 0,
        pending: o.data.orders?.filter((x: any) => x.status === 'confirmed').length || 0,
      })
    })
  }, [])

  const vendor = user?.vendor
  if (vendor?.status === 'pending') {
    return (
      <VendorLayout>
        <div className="p-8 flex items-center justify-center min-h-96">
          <div className="card p-10 text-center max-w-md">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package size={28} className="text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Account Pending Approval</h2>
            <p className="text-gray-500 text-sm">Your vendor account is being reviewed by our team. You'll receive an email once approved.</p>
          </div>
        </div>
      </VendorLayout>
    )
  }

  return (
    <VendorLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Vendor Dashboard</h1>
        <p className="text-gray-500 mb-8">Welcome back, {user?.firstName}!</p>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Package size={22} />} label="Total Products" value={stats?.products || 0} color="orange" />
          <StatCard icon={<ShoppingBag size={22} />} label="Total Orders" value={stats?.orders || 0} color="blue" />
          <StatCard icon={<DollarSign size={22} />} label="Available Balance" value={formatCurrency(stats?.balance || 0)} color="green" />
          <StatCard icon={<ShoppingBag size={22} />} label="Pending Orders" value={stats?.pending || 0} color="purple" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Link to="/vendor/products" className="card p-5 hover:border-primary-200 transition-colors flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center"><Package size={20} className="text-primary-500" /></div>
            <div><p className="font-bold text-gray-900">Manage Products</p><p className="text-sm text-gray-400">Add, edit, delete products</p></div>
          </Link>
          <Link to="/vendor/orders" className="card p-5 hover:border-primary-200 transition-colors flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center"><ShoppingBag size={20} className="text-blue-500" /></div>
            <div><p className="font-bold text-gray-900">View Orders</p><p className="text-sm text-gray-400">Manage customer orders</p></div>
          </Link>
        </div>
      </div>
    </VendorLayout>
  )
}

// ============ VENDOR PRODUCTS ============
export function VendorProducts() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<any>(null)
  const [showImport, setShowImport] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [csvData, setCsvData] = useState('')
  const [form, setForm] = useState({ name:'', description:'', price:'', categoryId:'', stockQuantity:'', images:[''], wholesaleEnabled:false, wholesalePrice:'', wholesaleMinQty:'' })
  const variantPanelRef = useRef<VariantConfigPanelRef>(null)

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/products/vendor/mine'),
      api.get('/categories'),
    ]).then(([p, c]) => {
      setProducts(p.data.products || [])
      setCategories(c.data.categories || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const setField = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  const openAdd = () => { setEditProduct(null); setForm({ name:'', description:'', price:'', categoryId:'', stockQuantity:'', images:[''], wholesaleEnabled:false, wholesalePrice:'', wholesaleMinQty:'' }); setShowForm(true) }
  const openEdit = async (p: any) => {
    setEditProduct(p)
    // Fetch full product detail to get all images
    let imgs = ['']
    try {
      const res = await api.get(`/products/${p.id}`)
      const detail = res.data.product
      if (detail?.images?.length > 0) {
        imgs = detail.images.map((img: any) => img.image_url)
      }
    } catch { /* use empty */ }
    setForm({ name: p.name, description: p.description || '', price: String(p.price), categoryId: String(p.category_id), stockQuantity: String(p.stock_quantity), images: imgs, wholesaleEnabled: !!p.wholesale_enabled, wholesalePrice: String(p.wholesale_price || ''), wholesaleMinQty: String(p.wholesale_min_qty || '') })
    setShowForm(true)
  }

  const saveProduct = async () => {
    try {
      const data = { ...form, price: parseFloat(form.price), categoryId: parseInt(form.categoryId), stockQuantity: parseInt(form.stockQuantity), wholesalePrice: parseFloat(form.wholesalePrice), wholesaleMinQty: parseInt(form.wholesaleMinQty), images: form.images.filter(u => u.trim()) }
      if (editProduct) await api.put(`/products/${editProduct.id}`, data)
      else await api.post('/products', data)
      // Save variants if there are unsaved changes
      if (variantPanelRef.current?.hasUnsavedVariants()) {
        await variantPanelRef.current.saveIfNeeded()
      }
      toast.success(editProduct ? 'Product updated!' : 'Product created!')
      setShowForm(false); load()
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error saving product') }
  }

  const deleteProduct = async (id: number) => {
    if (!confirm('Delete this product?')) return
    await api.delete(`/products/${id}`).catch(() => {})
    toast.success('Product deleted'); load()
  }

  const handleImport = async () => {
    if (!csvData.trim()) return
    setImportLoading(true)
    try {
      const res = await api.post('/vendor/products/import', { csvData })
      setImportResult(res.data)
      toast.success(res.data.message)
      load()
    } catch (err: any) { toast.error('Import failed') } finally { setImportLoading(false) }
  }

  const downloadTemplate = async () => {
    const res = await api.get('/vendor/products/import/template', { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a'); a.href = url; a.download = 'product_template.csv'; a.click()
  }

  return (
    <VendorLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Products</h1>
          <div className="flex gap-3">
            <button onClick={() => setShowImport(true)} className="btn-secondary text-sm"><Upload size={16} /> Import CSV</button>
            <button onClick={openAdd} className="btn-primary text-sm"><Plus size={16} /> Add Product</button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{Array(5).fill(0).map((_,i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : products.length === 0 ? (
          <EmptyState icon={<Package size={48} />} title="No products yet" description="Start adding products to your store."
            action={<button onClick={openAdd} className="btn-primary"><Plus size={16} /> Add Product</button>} />
        ) : (
          <div className="card overflow-hidden">
            <Table headers={['Product', 'Category', 'Price', 'Stock', 'Status', 'Actions']}>
              {products.map(p => (
                <tr key={p.id}>
                  <td className="table-cell px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {p.primary_image && <img src={p.primary_image} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{p.name}</p>
                        {p.wholesale_enabled && <span className="text-xs text-blue-600 flex items-center gap-0.5"><Zap size={10} />Wholesale</span>}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell px-4"><span className="text-xs text-gray-500">{p.category_name}</span></td>
                  <td className="table-cell px-4"><span className="font-medium">{formatCurrency(p.price)}</span></td>
                  <td className="table-cell px-4"><span className={`text-sm ${p.stock_quantity === 0 ? 'text-red-600' : 'text-gray-700'}`}>{p.stock_quantity}</span></td>
                  <td className="table-cell px-4"><StatusBadge status={p.status} /></td>
                  <td className="table-cell px-4">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"><Edit size={14} /></button>
                      <button onClick={() => deleteProduct(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-500 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        )}

        {/* Product Form Modal */}
        <Modal open={showForm} onClose={() => setShowForm(false)} title={editProduct ? 'Edit Product' : 'Add New Product'} size="lg">
          <div className="space-y-4">
            <div><label className="label">Product Name *</label><input className="input" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Product name" /></div>
            <div><label className="label">Description</label><textarea className="input resize-none" rows={3} value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Product description..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Price (₹) *</label><input type="number" className="input" value={form.price} onChange={e => setField('price', e.target.value)} placeholder="0.00" min="0.01" step="0.01" /></div>
              <div><label className="label">Stock Qty *</label><input type="number" className="input" value={form.stockQuantity} onChange={e => setField('stockQuantity', e.target.value)} placeholder="0" min="0" /></div>
            </div>
            <div><label className="label">Category *</label>
              <select className="input" value={form.categoryId} onChange={e => setField('categoryId', e.target.value)}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="label">Product Images</label>
              <div className="space-y-2">
                {form.images.map((url, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input className="input flex-1 text-sm" value={url} onChange={e => {
                      const imgs = [...form.images]; imgs[i] = e.target.value; setField('images', imgs)
                    }} placeholder={`Image URL ${i + 1}`} />
                    {form.images.length > 1 && (
                      <button type="button" onClick={() => setField('images', form.images.filter((_, j) => j !== i))}
                        className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                    )}
                  </div>
                ))}
                <div className="flex gap-2 flex-wrap">
                  {form.images.length < 5 && (
                    <button type="button" onClick={() => setField('images', [...form.images, ''])}
                      className="text-sm text-primary-500 hover:text-primary-700 flex items-center gap-1"><Plus size={14} /> Add URL</button>
                  )}
                  {form.images.filter(u => u.trim()).length < 5 && (
                    <label className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1 cursor-pointer">
                      <Upload size={14} /> Upload files
                      <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                        const files = e.target.files
                        if (!files || files.length === 0) return
                        const currentImages = form.images.filter(u => u.trim())
                        const slotsAvailable = 5 - currentImages.length
                        const filesToUpload = Array.from(files).slice(0, slotsAvailable)
                        if (filesToUpload.length === 0) { toast.error('Maximum 5 images allowed'); return }
                        let uploaded = 0
                        const newUrls: string[] = []
                        for (const file of filesToUpload) {
                          const fd = new FormData(); fd.append('image', file)
                          try {
                            const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                            newUrls.push(res.data.url)
                            uploaded++
                          } catch { /* skip failed */ }
                        }
                        if (uploaded > 0) {
                          const allImgs = [...currentImages, ...newUrls]
                          setField('images', allImgs.length > 0 ? allImgs : [''])
                          toast.success(`${uploaded} image${uploaded > 1 ? 's' : ''} uploaded!`)
                        } else { toast.error('Upload failed') }
                        e.target.value = ''
                      }} />
                    </label>
                  )}
                </div>
                {form.images.filter(u => u.trim()).length > 0 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto">
                    {form.images.filter(u => u.trim()).map((url, i) => (
                      <img key={i} src={url} alt={`Preview ${i+1}`} className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input type="checkbox" checked={form.wholesaleEnabled} onChange={e => setField('wholesaleEnabled', e.target.checked)} className="accent-primary-500 w-4 h-4" />
                <span className="font-medium text-sm flex items-center gap-1"><Zap size={14} className="text-blue-500" /> Enable Wholesale Pricing</span>
              </label>
              {form.wholesaleEnabled && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div><label className="label text-xs">Wholesale Price *</label><input type="number" className="input text-sm" value={form.wholesalePrice} onChange={e => setField('wholesalePrice', e.target.value)} placeholder="0.00" /></div>
                  <div><label className="label text-xs">Min Quantity *</label><input type="number" className="input text-sm" value={form.wholesaleMinQty} onChange={e => setField('wholesaleMinQty', e.target.value)} placeholder="Min 2" min="2" /></div>
                </div>
              )}
            </div>
            <VariantConfigPanel
              ref={variantPanelRef}
              productId={editProduct?.id || null}
              categoryId={form.categoryId}
              onSaved={() => {}}
            />
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button onClick={saveProduct} className="btn-primary flex-1 justify-center">{editProduct ? 'Update Product' : 'Create Product'}</button>
          </div>
        </Modal>

        {/* CSV Import Modal */}
        <Modal open={showImport} onClose={() => { setShowImport(false); setImportResult(null); setCsvData('') }} title="Import Products via CSV" size="lg">
          {!importResult ? (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 space-y-1">
                <p className="font-semibold">Required columns: name, price (₹), category_name, stock</p>
                <p>Optional: description, image_url, image_url_2, image_url_3, wholesale_enabled, wholesale_price, wholesale_min_qty</p>
                <p className="text-xs text-blue-500 mt-1">Images: Use full URL (https://...) or just the filename (e.g., headphones.jpg) from your uploaded images below.</p>
              </div>

              {/* Bulk Image Upload */}
              <div className="border border-dashed border-gray-300 rounded-xl p-4 bg-gray-50">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5"><Upload size={14} /> Step 1: Upload Product Images</h4>
                <p className="text-xs text-gray-500 mb-3">Upload all your product images first. Then use the filenames in your CSV.</p>
                <label className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-primary-300 hover:bg-orange-50 transition-colors">
                  <Upload size={16} className="text-primary-500" />
                  <span className="text-sm font-medium text-gray-700">Select Images (bulk)</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                    const files = e.target.files
                    if (!files || files.length === 0) return
                    const fileList = Array.from(files)
                    let uploaded = 0
                    const names: string[] = []
                    for (const file of fileList) {
                      const fd = new FormData(); fd.append('image', file)
                      try {
                        const res = await api.post('/upload/vendor-images', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                        names.push(res.data.filename)
                        uploaded++
                      } catch { /* skip failed */ }
                    }
                    if (uploaded > 0) {
                      toast.success(`${uploaded} image${uploaded > 1 ? 's' : ''} uploaded! Use these filenames in your CSV: ${names.join(', ')}`)
                    } else { toast.error('Upload failed') }
                    e.target.value = ''
                  }} />
                </label>
              </div>

              <button onClick={downloadTemplate} className="btn-secondary text-sm w-full justify-center"><Download size={14} /> Download Example Template</button>
              <div><label className="label">Step 2: Paste CSV Data</label>
                <textarea className="input font-mono text-xs resize-none" rows={8} value={csvData} onChange={e => setCsvData(e.target.value)} placeholder="name,price,category_name,stock,image_url&#10;Headphones,2999,Electronics,50,headphones.jpg" /></div>
              <div className="flex gap-3">
                <button onClick={() => setShowImport(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleImport} disabled={importLoading || !csvData.trim()} className="btn-primary flex-1 justify-center">
                  {importLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Upload size={14} /> Import Products</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl ${importResult.errors > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                <p className={`font-bold ${importResult.errors > 0 ? 'text-amber-700' : 'text-green-700'}`}>{importResult.message}</p>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {importResult.results?.map((r: any) => (
                  <div key={r.row} className={`flex items-start gap-2 p-2 rounded-lg text-sm ${r.status === 'created' ? 'bg-green-50' : 'bg-red-50'}`}>
                    {r.status === 'created' ? <CheckCircle size={14} className="text-green-600 mt-0.5" /> : <XCircle size={14} className="text-red-500 mt-0.5" />}
                    <div><p className="font-medium">Row {r.row}: {r.name}</p>{r.message && <p className="text-xs text-red-500">{r.message}</p>}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => { setImportResult(null); setCsvData('') }} className="btn-secondary w-full justify-center">Import More</button>
            </div>
          )}
        </Modal>
      </div>
    </VendorLayout>
  )
}

// ============ VENDOR ORDERS ============
export function VendorOrders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    api.get('/orders/vendor').then(r => setOrders(r.data.orders || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const updateStatus = async (orderId: number, status: string) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status })
      toast.success('Order status updated')
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
      if (selected?.id === orderId) setSelected((prev: any) => ({ ...prev, status }))
    } catch { toast.error('Failed to update') }
  }

  return (
    <VendorLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Orders</h1>
        {loading ? (
          <div className="space-y-3">{Array(4).fill(0).map((_,i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : orders.length === 0 ? (
          <EmptyState icon={<ShoppingBag size={48} />} title="No orders yet" description="Orders for your products will appear here." />
        ) : (
          <div className="card overflow-hidden">
            <Table headers={['Order #', 'Customer', 'Date', 'Discount', 'Total', 'Status', 'Actions']}>
              {orders.map(o => (
                <tr key={o.id}>
                  <td className="table-cell px-4"><span className="font-mono font-bold text-gray-800">#{o.id}</span></td>
                  <td className="table-cell px-4"><div><p className="text-sm font-medium">{o.first_name} {o.last_name}</p><p className="text-xs text-gray-400">{o.customer_email}</p></div></td>
                  <td className="table-cell px-4 text-xs text-gray-500">{formatDateTime(o.created_at)}</td>
                  <td className="table-cell px-4">{Number(o.discount_amount) > 0 ? <span className="text-green-600 text-sm">-{formatCurrency(o.discount_amount)}<br/><span className="text-xs text-gray-400">{o.coupon_code}</span></span> : <span className="text-gray-300 text-xs">—</span>}</td>
                  <td className="table-cell px-4 font-bold">{formatCurrency(o.total)}</td>
                  <td className="table-cell px-4"><StatusBadge status={o.status} /></td>
                  <td className="table-cell px-4 flex items-center gap-2">
                    <button onClick={() => api.get('/orders/' + o.id).then(r => setSelected(r.data.order || r.data)).catch(() => toast.error('Failed to load order'))} className="text-gray-500 hover:text-primary-600 p-1" title="View details"><Eye size={16} /></button>
                    {o.status === 'confirmed' && (
                      <button onClick={() => updateStatus(o.id, 'shipped')} className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1 rounded-lg font-medium transition-colors">Mark Shipped</button>
                    )}
                    {o.status === 'shipped' && (
                      <button onClick={() => updateStatus(o.id, 'delivered')} className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1 rounded-lg font-medium transition-colors">Mark Delivered</button>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        )}
        {selected && (
          <Modal open={!!selected} title={`Order #${selected.id} Details`} onClose={() => setSelected(null)} size="lg">
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
                          {addr.landmark && <p className="text-xs text-gray-400">Near: {addr.landmark}</p>}
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-500">Payment: <span className="font-medium text-gray-800 capitalize">{selected.payment_method === 'cod' ? 'Cash on Delivery' : selected.payment_method}</span></span>
                    <StatusBadge status={selected.status} />
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-900">{formatCurrency(selected.total)}</span>
                    {Number(selected.discount_amount) > 0 && (
                      <p className="text-xs text-green-600">Discount: -{formatCurrency(selected.discount_amount)} {selected.coupon_code && `(${selected.coupon_code})`}</p>
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

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                {selected.status === 'confirmed' && (
                  <button onClick={() => { updateStatus(selected.id, 'shipped'); setSelected((prev: any) => prev ? { ...prev, status: 'shipped' } : null) }} className="btn-primary text-sm">Mark Shipped</button>
                )}
                {selected.status === 'shipped' && (
                  <button onClick={() => { updateStatus(selected.id, 'delivered'); setSelected((prev: any) => prev ? { ...prev, status: 'delivered' } : null) }} className="btn-primary text-sm">Mark Delivered</button>
                )}
                <button onClick={() => setSelected(null)} className="btn-secondary text-sm">Close</button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </VendorLayout>
  )
}

// ============ VENDOR COUPONS ============
export function VendorCoupons() {
  const [coupons, setCoupons] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ code:'', discountType:'percentage', discountValue:'', minOrderAmount:'', usageLimit:'', expiresAt:'' })
  const setField = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  useEffect(() => {
    api.get('/vendor/coupons').then(r => setCoupons(r.data.coupons || [])).catch(() => {})
  }, [])

  const saveCoupon = async () => {
    try {
      await api.post('/vendor/coupons', form)
      toast.success('Coupon created!'); setShowForm(false)
      api.get('/vendor/coupons').then(r => setCoupons(r.data.coupons || [])).catch(() => {})
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error') }
  }

  const deleteCoupon = async (id: number) => {
    await api.delete(`/vendor/coupons/${id}`).catch(() => {})
    setCoupons(prev => prev.filter(c => c.id !== id))
    toast.success('Coupon deleted')
  }

  const toggleCoupon = async (c: any) => {
    await api.put(`/vendor/coupons/${c.id}`, {
      discountValue: c.discount_value,
      minOrderAmount: c.min_order_amount,
      usageLimit: c.usage_limit,
      expiresAt: c.expires_at,
      isActive: !c.is_active
    })
    toast.success(c.is_active ? 'Coupon deactivated' : 'Coupon reactivated')
    api.get('/vendor/coupons').then(r => setCoupons(r.data.coupons || [])).catch(() => {})
  }

  return (
    <VendorLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm"><Plus size={16} /> Create Coupon</button>
        </div>
        {coupons.length === 0 ? (
          <EmptyState icon={<Tag size={48} />} title="No coupons" description="Create coupon codes for your customers."
            action={<button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} /> Create Coupon</button>} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coupons.map(c => (
              <div key={c.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="bg-orange-50 border-2 border-dashed border-orange-200 rounded-xl px-4 py-2">
                    <p className="font-mono font-bold text-primary-600 text-lg tracking-widest">{c.code}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => deleteCoupon(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-gray-800">{c.discount_type === 'percentage' ? `${c.discount_value}% off` : `₹${c.discount_value} off`}</p>
                  {c.min_order_amount && <p className="text-gray-400">Min order: {formatCurrency(c.min_order_amount)}</p>}
                  {c.usage_limit && <p className="text-gray-400">Used: {c.usage_count}/{c.usage_limit}</p>}
                  {c.expires_at && <p className="text-gray-400">Expires: {new Date(c.expires_at).toLocaleDateString()}</p>}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className={c.is_active ? 'badge-success' : 'badge-error'}>{c.is_active ? 'Active' : 'Inactive'}</span>
                  <button onClick={() => toggleCoupon(c)}
                    className={`text-xs px-3 py-1 rounded-lg ${c.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                    {c.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal open={showForm} onClose={() => setShowForm(false)} title="Create Coupon" size="sm">
          <div className="space-y-4">
            <div><label className="label">Coupon Code *</label><input className="input font-mono uppercase" value={form.code} onChange={e => setField('code', e.target.value.toUpperCase())} placeholder="SUMMER20" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Type</label>
                <select className="input text-sm" value={form.discountType} onChange={e => setField('discountType', e.target.value)}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed (₹)</option>
                </select>
              </div>
              <div><label className="label">Value *</label><input type="number" className="input" value={form.discountValue} onChange={e => setField('discountValue', e.target.value)} placeholder={form.discountType === 'percentage' ? '20' : '100'} /></div>
            </div>
            <div><label className="label">Min Order Amount</label><input type="number" className="input" value={form.minOrderAmount} onChange={e => setField('minOrderAmount', e.target.value)} placeholder="Optional" /></div>
            <div><label className="label">Usage Limit</label><input type="number" className="input" value={form.usageLimit} onChange={e => setField('usageLimit', e.target.value)} placeholder="Unlimited" /></div>
            <div><label className="label">Expires At</label><input type="datetime-local" className="input" value={form.expiresAt} onChange={e => setField('expiresAt', e.target.value)} /></div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button onClick={saveCoupon} className="btn-primary flex-1 justify-center">Create Coupon</button>
          </div>
        </Modal>
      </div>
    </VendorLayout>
  )
}

// ============ VENDOR EARNINGS & WITHDRAWALS ============
export function VendorEarnings() {
  const [data, setData] = useState<any>({ withdrawals: [], availableBalance: 0 })
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const load = () => {
    api.get('/vendor/withdrawals').then(r => setData(r.data)).catch(() => {})
  }
  useEffect(load, [])

  const requestWithdrawal = async () => {
    if (!amount || parseFloat(amount) <= 0) return toast.error('Enter a valid amount')
    setLoading(true)
    try {
      await api.post('/vendor/withdrawals', { amount: parseFloat(amount) })
      toast.success('Withdrawal request submitted!'); setAmount(''); load()
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error') } finally { setLoading(false) }
  }

  return (
    <VendorLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Earnings & Withdrawals</h1>
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <div className="card p-6 text-center col-span-1 sm:col-span-1">
            <div className="text-3xl font-bold text-green-600 mb-1">{formatCurrency(data.availableBalance)}</div>
            <div className="text-sm text-gray-500">Available Balance</div>
          </div>
          <div className="card p-6 col-span-1 sm:col-span-2">
            <h3 className="font-bold text-gray-900 mb-3">Request Withdrawal</h3>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount" className="input pl-7" max={data.availableBalance} />
              </div>
              <button onClick={requestWithdrawal} disabled={loading} className="btn-primary px-6">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Withdraw'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">Max: {formatCurrency(data.availableBalance)}</p>
          </div>
        </div>

        <h2 className="font-bold text-gray-900 mb-4">Withdrawal History</h2>
        {data.withdrawals.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">No withdrawal requests yet.</div>
        ) : (
          <div className="card overflow-hidden">
            <Table headers={['Date', 'Amount', 'Status', 'Note']}>
              {data.withdrawals.map((w: any) => (
                <tr key={w.id}>
                  <td className="table-cell px-4 text-xs text-gray-500">{formatDateTime(w.created_at)}</td>
                  <td className="table-cell px-4 font-bold">{formatCurrency(w.amount)}</td>
                  <td className="table-cell px-4"><StatusBadge status={w.status} /></td>
                  <td className="table-cell px-4 text-xs text-gray-500">{w.note || '—'}</td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </div>
    </VendorLayout>
  )
}
