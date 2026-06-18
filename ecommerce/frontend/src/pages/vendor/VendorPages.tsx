import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, Package, ShoppingBag, DollarSign, Tag, Upload, Download, CheckCircle, XCircle, Zap, Eye, EyeOff } from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { VendorLayout } from '../../components/layout/DashboardLayout'
import { Modal, StatusBadge, Table, Skeleton, ConfirmDialog, StatCard, EmptyState } from '../../components/ui'
import { formatCurrency, formatDateTime, getStatusLabel } from '../../utils/helpers'
import toast from '../../components/ui/Toast'
import VariantConfigPanel, { VariantConfigPanelRef } from '../../components/vendor/VariantConfigPanel'
import CategoryPicker from '../../components/ui/CategoryPicker'

// ============ VENDOR DASHBOARD HOME ============
export function VendorDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [vendorProfile, setVendorProfile] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      api.get('/vendor/products/mine').catch(() => ({ data: { products: [] } })),
      api.get('/orders/vendor').catch(() => ({ data: { orders: [] } })),
      api.get('/vendor/withdrawals').catch(() => ({ data: { availableBalance: 0 } })),
      api.get('/vendor/profile').catch(() => ({ data: { vendor: null } })),
    ]).then(([p, o, w, v]) => {
      setStats({
        products: p.data.products?.length || 0,
        orders: o.data.orders?.length || 0,
        balance: w.data.availableBalance || 0,
        pending: o.data.orders?.filter((x: any) => x.status === 'confirmed').length || 0,
      })
      setVendorProfile(v.data.vendor || null)
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
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Welcome Banner */}
        <div className="relative rounded-2xl overflow-hidden mb-6">
          {/* Banner background */}
          {vendorProfile?.banner_url ? (
            <div className="absolute inset-0">
              <img src={vendorProfile.banner_url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900" />
          )}
          {/* Decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-20 w-32 h-32 bg-primary-500/5 rounded-full translate-y-1/2" />
          {/* Content */}
          <div className="relative p-5 sm:p-8 flex items-center gap-4">
            {vendorProfile?.logo_url ? (
              <img src={vendorProfile.logo_url} alt={vendorProfile.store_name} className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border-2 border-white/20" />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-primary-500/20 border-2 border-white/20 flex items-center justify-center text-2xl font-bold text-primary-300">
                {user?.firstName?.[0] || 'V'}
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-0.5">Welcome back, {user?.firstName}! 🚀</h1>
              <p className="text-white/60 text-sm">{vendorProfile?.store_name || user?.vendor?.storeName || 'Your Store'} — Here's your store overview</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            { icon: <Package size={20} />, label: 'Products', value: stats?.products || 0, color: 'bg-orange-50 text-orange-600' },
            { icon: <ShoppingBag size={20} />, label: 'Orders', value: stats?.orders || 0, color: 'bg-blue-50 text-blue-600' },
            { icon: <DollarSign size={20} />, label: 'Balance', value: formatCurrency(stats?.balance || 0), color: 'bg-green-50 text-green-600' },
            { icon: <ShoppingBag size={20} />, label: 'Pending', value: stats?.pending || 0, color: 'bg-purple-50 text-purple-600' },
          ].map(s => (
            <div key={s.label} className="border border-gray-200 rounded-xl p-3 sm:p-4 bg-white">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${s.color.split(' ')[0]}`}>
                <span className={s.color.split(' ')[1]}>{s.icon}</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link to="/vendor/products" className="border border-gray-200 rounded-xl p-4 bg-white hover:border-primary-300 transition-colors flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0"><Package size={18} className="text-primary-500" /></div>
            <div><p className="font-bold text-gray-900 text-sm">Manage Products</p><p className="text-xs text-gray-400">Add, edit, delete products</p></div>
          </Link>
          <Link to="/vendor/orders" className="border border-gray-200 rounded-xl p-4 bg-white hover:border-primary-300 transition-colors flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0"><ShoppingBag size={18} className="text-blue-500" /></div>
            <div><p className="font-bold text-gray-900 text-sm">View Orders</p><p className="text-xs text-gray-400">Manage customer orders</p></div>
          </Link>
          <Link to="/vendor/earnings" className="border border-gray-200 rounded-xl p-4 bg-white hover:border-primary-300 transition-colors flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0"><DollarSign size={18} className="text-green-500" /></div>
            <div><p className="font-bold text-gray-900 text-sm">Earnings</p><p className="text-xs text-gray-400">View balance & withdrawals</p></div>
          </Link>
          <Link to="/vendor/coupons" className="border border-gray-200 rounded-xl p-4 bg-white hover:border-primary-300 transition-colors flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0"><Tag size={18} className="text-amber-500" /></div>
            <div><p className="font-bold text-gray-900 text-sm">Coupons</p><p className="text-xs text-gray-400">Create discount codes</p></div>
          </Link>
        </div>

        {/* Contact Admin */}
        <ContactAdminCard />
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
  const [form, setForm] = useState({ name:'', description:'', price:'', mrp:'', categoryId:'', stockQuantity:'', unit:'', unitValue:'', images:[''], wholesaleEnabled:false, wholesalePrice:'', wholesaleMinQty:'', weightKg:'', deliveryType:'vendor_default', deliveryCharge:'', brandId:'' })
  const variantPanelRef = useRef<VariantConfigPanelRef>(null)
  const [showCategoryRequest, setShowCategoryRequest] = useState(false)
  const [catReqForm, setCatReqForm] = useState({ name: '', description: '', parentId: '' })
  const [brands, setBrands] = useState<any[]>([])
  const [showBrandRequest, setShowBrandRequest] = useState(false)
  const [brandReqForm, setBrandReqForm] = useState({ brandName: '', categoryId: '' })
  const [myBrandRequests, setMyBrandRequests] = useState<any[]>([])

  const loadBrands = (catId: string) => {
    if (!catId) { setBrands([]); return }
    api.get(`/brands?subcategoryId=${catId}`).then(r => setBrands(r.data.brands || [])).catch(() => setBrands([]))
  }

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

  const openAdd = () => { setEditProduct(null); setForm({ name:'', description:'', price:'', mrp:'', categoryId:'', stockQuantity:'', unit:'', unitValue:'', images:[''], wholesaleEnabled:false, wholesalePrice:'', wholesaleMinQty:'', weightKg:'', deliveryType:'vendor_default', deliveryCharge:'', brandId:'' }); setBrands([]); setShowForm(true) }
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
    setForm({ name: p.name, description: p.description || '', price: String(p.price), mrp: String(p.mrp || ''), categoryId: String(p.category_id), stockQuantity: String(p.stock_quantity), unit: p.unit || '', unitValue: String(p.unit_value || ''), images: imgs, wholesaleEnabled: !!p.wholesale_enabled, wholesalePrice: String(p.wholesale_price || ''), wholesaleMinQty: String(p.wholesale_min_qty || ''), weightKg: String(p.weight_kg || ''), deliveryType: p.delivery_type || 'vendor_default', deliveryCharge: String(p.delivery_charge || ''), brandId: String(p.brand_id || '') })
    loadBrands(String(p.category_id))
    setShowForm(true)
  }

  const saveProduct = async () => {
    try {
      const data = { ...form, price: parseFloat(form.price), mrp: form.mrp ? parseFloat(form.mrp) : null, categoryId: parseInt(form.categoryId), stockQuantity: parseInt(form.stockQuantity), wholesalePrice: parseFloat(form.wholesalePrice), wholesaleMinQty: parseInt(form.wholesaleMinQty), weightKg: form.weightKg ? parseFloat(form.weightKg) : null, deliveryType: form.deliveryType, deliveryCharge: form.deliveryCharge ? parseFloat(form.deliveryCharge) : null, brandId: form.brandId ? parseInt(form.brandId) : null, images: form.images.filter(u => u.trim()) }
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

  const toggleProduct = async (id: number) => {
    try {
      const res = await api.patch(`/products/${id}/toggle-status`)
      toast.success(res.data.message); load()
    } catch { toast.error('Failed to update product status') }
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
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Products</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowImport(true)} className="btn-secondary text-xs sm:text-sm"><Upload size={14} /> Import</button>
            <button onClick={openAdd} className="btn-primary text-xs sm:text-sm"><Plus size={14} /> Add Product</button>
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
                        {!!p.wholesale_enabled && <span className="text-xs text-blue-600 flex items-center gap-0.5"><Zap size={10} />Wholesale</span>}
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
                      {(p.status === 'active' || p.status === 'disabled') && (
                        <button
                          onClick={() => toggleProduct(p.id)}
                          className={`p-1.5 rounded-lg transition-colors ${p.status === 'active' ? 'hover:bg-yellow-50 text-yellow-600' : 'hover:bg-green-50 text-green-600'}`}
                          title={p.status === 'active' ? 'Disable product' : 'Enable product'}
                        >
                          {p.status === 'active' ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div><label className="label">MRP (₹)</label><input type="number" className="input" value={form.mrp} onChange={e => setField('mrp', e.target.value)} placeholder="0.00" min="0" step="0.01" /></div>
              <div><label className="label">Retail Price (₹) *</label><input type="number" className="input" value={form.price} onChange={e => setField('price', e.target.value)} placeholder="0.00" min="0.01" step="0.01" /></div>
              <div><label className="label">Stock Qty *</label><input type="number" className="input" value={form.stockQuantity} onChange={e => setField('stockQuantity', e.target.value)} placeholder="0" min="0" /></div>
              <div><label className="label">Net Qty</label><input type="number" className="input" value={form.unitValue} onChange={e => setField('unitValue', e.target.value)} placeholder="e.g. 500" min="0" step="1" /></div>
              <div><label className="label">Unit</label>
                <select className="input" value={form.unit} onChange={e => setField('unit', e.target.value)}>
                  <option value="">None</option>
                  <option value="pcs">Pieces (pcs)</option>
                  <option value="g">Grams (g)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="ml">Millilitres (ml)</option>
                  <option value="ltr">Litres (ltr)</option>
                  <option value="m">Meters (m)</option>
                  <option value="cm">Centimeters (cm)</option>
                  <option value="inch">Inches (inch)</option>
                  <option value="pack">Pack</option>
                  <option value="box">Box</option>
                  <option value="set">Set</option>
                  <option value="pair">Pair</option>
                  <option value="dozen">Dozen</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Shipping Weight (KG) — actual package weight for delivery</label>
              <input type="number" className="input" value={form.weightKg} onChange={e => setField('weightKg', e.target.value)} placeholder="e.g. 0.1 for 100g, 0.5 for 500g, 1 for 1kg" min="0" step="0.01" />
              <p className="text-[10px] text-gray-400 mt-1">Enter in KG. Example: 100ml oil = 0.1, 1L bottle = 1, 5kg rice = 5</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <label className="label">Delivery Charge Type</label>
              <select className="input mb-3" value={form.deliveryType} onChange={e => setField('deliveryType', e.target.value)}>
                <option value="vendor_default">Use store default setting</option>
                <option value="per_product">Fixed charge per piece (₹)</option>
                <option value="per_kg">Charge per KG (₹)</option>
              </select>
              {form.deliveryType !== 'vendor_default' && (
                <div>
                  <label className="label text-xs">{form.deliveryType === 'per_kg' ? 'Charge per KG (₹)' : 'Charge per piece (₹)'}</label>
                  <input type="number" className="input" value={form.deliveryCharge} onChange={e => setField('deliveryCharge', e.target.value)} placeholder="e.g. 50" min="0" step="1" />
                </div>
              )}
            </div>
            <div><label className="label">Category *</label>
              <CategoryPicker
                categories={categories}
                value={form.categoryId}
                onChange={(val) => { setField('categoryId', val); setField('brandId', ''); loadBrands(val) }}
                placeholder="Select category"
                onRequestCategory={(parentId) => { setCatReqForm({ name: '', description: '', parentId: parentId ? String(parentId) : '' }); setShowCategoryRequest(true) }}
              />
            </div>
            <div><label className="label">Brand (optional)</label>
              <select className="input" value={form.brandId} onChange={e => setField('brandId', e.target.value)}>
                <option value="">No brand</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <button type="button" onClick={() => { setShowBrandRequest(true); setBrandReqForm({ brandName: '', categoryId: form.categoryId }) }} className="text-xs text-primary-500 hover:text-primary-700 mt-1">Can't find your brand? Request one →</button>
            </div>
            <div><label className="label">Product Images</label>
              <p className="text-[10px] text-gray-400 mb-2">Recommended: 800×800px (square), max 5 images. Use white/clean background for best results.</p>
              <p className="text-xs text-gray-400 mb-2">Recommended: 800×800px (square). Min 500×500px. Max 5 images. Use white/clean background for best display.</p>
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
                <p className="font-semibold">Required: name, price (Retail ₹), category_name, stock</p>
                <p>Optional: description, mrp, subcategory_name, unit, unit_value, weight_kg, delivery_type (vendor_default/per_product/per_kg), delivery_charge, brand_name</p>
                <p>Images: image_url, image_url_2, image_url_3, image_url_4, image_url_5</p>
                <p>Wholesale: wholesale_enabled (true/false), wholesale_price, wholesale_min_qty</p>
                <p className="text-xs text-blue-500 mt-1">Category/Subcategory/Brand auto-created if not found.</p>
                <p className="text-xs text-blue-500">Images: Recommended 800×800px (square). Use full URL or filename from uploaded images.</p>
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

        {/* Category Request Modal */}
        <Modal open={showCategoryRequest} onClose={() => setShowCategoryRequest(false)} title="Request New Subcategory">
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Can't find your product subcategory? Request a new one under an existing category.</p>
            <div>
              <label className="label">Parent Category *</label>
              <select className="input" value={catReqForm.parentId || ''} onChange={e => setCatReqForm(p => ({ ...p, parentId: e.target.value }))}>
                <option value="">Select parent category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Subcategory Name *</label>
              <input className="input" value={catReqForm.name} onChange={e => setCatReqForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Wireless Earbuds" />
            </div>
            <div>
              <label className="label">Description (optional)</label>
              <input className="input" value={catReqForm.description} onChange={e => setCatReqForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCategoryRequest(false)} className="btn-secondary">Cancel</button>
              <button onClick={async () => {
                if (!catReqForm.name.trim() || !catReqForm.parentId) return toast.error('Parent category and name are required')
                try {
                  await api.post('/categories/subcategory', { name: catReqForm.name, description: catReqForm.description, parentId: Number(catReqForm.parentId) })
                  toast.success('Subcategory request submitted! Admin will review it.')
                  setShowCategoryRequest(false)
                  setCatReqForm({ name: '', description: '', parentId: '' })
                } catch (err: any) { toast.error(err.response?.data?.message || 'Failed') }
              }} className="btn-primary flex-1 justify-center">Submit Request</button>
            </div>
          </div>
        </Modal>

        {/* Brand Request Modal */}
        <Modal open={showBrandRequest} onClose={() => setShowBrandRequest(false)} title="Request New Brand">
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Can't find your product brand? Request a new one to be added.</p>
            <div>
              <label className="label">Brand Name *</label>
              <input className="input" value={brandReqForm.brandName} onChange={e => setBrandReqForm(p => ({ ...p, brandName: e.target.value }))} placeholder="e.g. Samsung" />
            </div>
            <div>
              <label className="label">For Subcategory</label>
              <select className="input" value={brandReqForm.categoryId} onChange={e => setBrandReqForm(p => ({ ...p, categoryId: e.target.value }))}>
                <option value="">Select subcategory</option>
                {categories.filter(c => c.parent_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {myBrandRequests.length > 0 && (
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Your Brand Requests</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {myBrandRequests.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-xs py-1">
                      <span className="text-gray-700">{r.brand_name}</span>
                      <span className={`px-2 py-0.5 rounded-full font-medium ${r.status === 'approved' ? 'bg-green-50 text-green-700' : r.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>{r.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowBrandRequest(false)} className="btn-secondary">Cancel</button>
              <button onClick={async () => {
                if (!brandReqForm.brandName.trim() || !brandReqForm.categoryId) return toast.error('Brand name and subcategory are required')
                try {
                  await api.post('/brands/request', { brandName: brandReqForm.brandName, categoryId: Number(brandReqForm.categoryId) })
                  toast.success('Brand request submitted! Admin will review it.')
                  setShowBrandRequest(false)
                  setBrandReqForm({ brandName: '', categoryId: '' })
                  api.get('/brands/my-requests').then(r => setMyBrandRequests(r.data.requests || [])).catch(() => {})
                } catch (err: any) { toast.error(err.response?.data?.message || 'Failed') }
              }} className="btn-primary flex-1 justify-center">Submit Request</button>
            </div>
          </div>
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
  const [vendorProfile, setVendorProfile] = useState<any>(null)

  useEffect(() => {
    api.get('/orders/vendor').then(r => setOrders(r.data.orders || [])).catch(() => {}).finally(() => setLoading(false))
    api.get('/vendor/profile').then(r => setVendorProfile(r.data.vendor || null)).catch(() => {})
  }, [])

  const updateStatus = async (orderId: number, status: string) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status })
      toast.success('Order status updated')
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
      if (selected?.id === orderId) setSelected((prev: any) => ({ ...prev, status }))
    } catch { toast.error('Failed to update') }
  }

  const printDeliverySticker = (order: any) => {
      const addr = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address
      const items = (order.items || [])
      const itemsList = items.map((item: any) => `${item.product_name || item.name} x${item.quantity}`).join(' | ')
      const totalQty = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)
      const paymentLabel = order.payment_method === 'cod' ? 'CASH ON DELIVERY' : 'PREPAID'
      const paymentIcon = order.payment_method === 'cod' ? '💰' : '✅'
      const seller = vendorProfile || {}

      const stickerHtml = `
        <!DOCTYPE html>
        <html><head><title>Delivery Sticker - Order #${order.id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { size: 6in 4in; margin: 0; }
          body { font-family: 'Arial', sans-serif; width: 6in; height: 4in; padding: 0; }
          .sticker { border: 3px solid #000; border-radius: 10px; height: 100%; display: grid; grid-template-columns: 1.5fr 1fr; grid-template-rows: auto 1fr auto; }
          /* Header */
          .header { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-bottom: 3px solid #000; }
          .logo { display: flex; align-items: center; gap: 6px; }
          .logo img { height: 24px; width: 24px; }
          .logo-text { font-size: 18px; font-weight: 900; }
          .logo-text .go { color: #1e3a5f; }
          .logo-text .marts { color: #f97316; }
          .order-info { text-align: right; }
          .order-id { font-size: 20px; font-weight: 900; }
          .order-date { font-size: 10px; color: #666; margin-top: 1px; }
          /* Left - Delivery */
          .deliver-section { padding: 12px 16px; display: flex; flex-direction: column; }
          .deliver-label { font-size: 9px; font-weight: 800; color: #f97316; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
          .customer-name { font-size: 18px; font-weight: 900; color: #000; margin-bottom: 4px; }
          .customer-address { font-size: 11px; color: #333; line-height: 1.5; }
          .customer-phone { font-size: 12px; font-weight: 700; margin-top: 6px; }
          .pincode-box { margin-top: 10px; border: 3px solid #000; border-radius: 6px; padding: 4px 14px; font-size: 26px; font-weight: 900; letter-spacing: 4px; width: fit-content; font-family: 'Courier New', monospace; }
          /* Right - Payment & From */
          .right-section { padding: 12px 16px; border-left: 2px dashed #ccc; display: flex; flex-direction: column; }
          .payment-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 800; padding: 6px 12px; border-radius: 6px; width: fit-content; }
          .payment-cod { background: #fef3c7; color: #92400e; border: 2px solid #f59e0b; }
          .payment-prepaid { background: #d1fae5; color: #065f46; border: 2px solid #10b981; }
          .from-block { margin-top: auto; padding-top: 10px; border-top: 2px solid #000; }
          .from-label { font-size: 9px; font-weight: 800; color: #f97316; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
          .from-name { font-size: 13px; font-weight: 800; color: #000; }
          .from-detail { font-size: 10px; color: #444; line-height: 1.5; margin-top: 2px; }
          /* Footer */
          .footer { grid-column: 1 / -1; border-top: 2px dashed #ccc; padding: 6px 16px; font-size: 9px; color: #555; }
          .footer b { color: #000; }
        </style></head>
        <body>
          <div class="sticker">
            <div class="header">
              <div class="logo">
                <img src="/logo.png" />
                <span class="logo-text"><span class="go">Go</span><span class="marts">Marts</span></span>
              </div>
              <div class="order-info">
                <div class="order-id">#${order.id}</div>
                <div class="order-date">${new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
            </div>
            <div class="deliver-section">
              <div class="deliver-label">📦 Deliver To</div>
              <div class="customer-name">${addr.name || `${order.first_name || ''} ${order.last_name || ''}`.trim()}</div>
              <div class="customer-address">
                ${addr.address || ''}${addr.landmark ? '<br>Near: ' + addr.landmark : ''}<br>
                ${addr.city || ''}, ${addr.state || ''}
              </div>
              ${addr.phone ? `<div class="customer-phone">📞 ${addr.phone}</div>` : ''}
              <div class="pincode-box">${addr.pincode || '000000'}</div>
            </div>
            <div class="right-section">
              <span class="payment-badge ${order.payment_method === 'cod' ? 'payment-cod' : 'payment-prepaid'}">${paymentIcon} ${paymentLabel}</span>
              <div class="from-block">
                <div class="from-label">📮 From (Seller)</div>
                <div class="from-name">${seller.store_name || 'GoMarts Seller'}</div>
                <div class="from-detail">
                  ${seller.business_address || ''}
                  ${seller.contact_phone ? '<br>📞 ' + seller.contact_phone : ''}
                  ${seller.gst_number ? '<br>GST: ' + seller.gst_number : ''}
                </div>
              </div>
            </div>
            <div class="footer">
              <b>Items (${totalQty}):</b> ${itemsList.substring(0, 140)}${itemsList.length > 140 ? '...' : ''}
            </div>
          </div>
        </body></html>
      `

      const win = window.open('', '_blank', 'width=620,height=420')
      if (win) {
        win.document.write(stickerHtml)
        win.document.close()
        setTimeout(() => win.print(), 300)
      }
    }

  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set())

  const toggleSelect = (orderId: number) => {
    setSelectedOrders(prev => {
      const next = new Set(prev)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }

  const selectAll = () => {
    const pending = orders.filter(o => o.status === 'confirmed' || o.status === 'shipped')
    if (selectedOrders.size === pending.length) setSelectedOrders(new Set())
    else setSelectedOrders(new Set(pending.map(o => o.id)))
  }

  const printBulkStickers = async (ordersToPrint: any[]) => {
    if (ordersToPrint.length === 0) { toast.error('No orders selected'); return }
    const fullOrders: any[] = []
    for (const o of ordersToPrint) {
      try {
        const r = await api.get(`/orders/${o.id}`)
        fullOrders.push(r.data.order || r.data)
      } catch { fullOrders.push(o) }
    }

    const seller = vendorProfile || {}

    const buildSticker = (order: any) => {
      const addr = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address
      if (!addr) return ''
      const items = (order.items || [])
      const itemsList = items.map((item: any) => `${item.product_name || item.name} x${item.quantity}`).join(' | ')
      const totalQty = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)
      const paymentLabel = order.payment_method === 'cod' ? 'COD' : 'PREPAID'
      const paymentIcon = order.payment_method === 'cod' ? '💰' : '✅'
      const paymentClass = order.payment_method === 'cod' ? 'pay-cod' : 'pay-prepaid'

      return `
        <div class="sticker">
          <div class="s-header">
            <div class="s-logo"><img src="/logo.png" /><span><b style="color:#1e3a5f">Go</b><b style="color:#f97316">Marts</b></span></div>
            <div class="s-order"><div class="s-oid">#${order.id}</div><div class="s-odate">${new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</div></div>
          </div>
          <div class="s-body">
            <div class="s-left">
              <div class="s-dlabel">📦 DELIVER TO</div>
              <div class="s-cname">${addr.name || `${order.first_name || ''} ${order.last_name || ''}`.trim()}</div>
              <div class="s-caddr">${addr.address || ''}${addr.landmark ? ', Nr. ' + addr.landmark : ''}<br>${addr.city || ''}, ${addr.state || ''}</div>
              ${addr.phone ? `<div class="s-cphone">📞 ${addr.phone}</div>` : ''}
              <div class="s-pinbox">${addr.pincode || '000000'}</div>
            </div>
            <div class="s-right">
              <span class="s-paybadge ${paymentClass}">${paymentIcon} ${paymentLabel}</span>
              <div class="s-from">
                <div class="s-flabel">📮 FROM</div>
                <div class="s-fname">${seller.store_name || 'Seller'}</div>
                <div class="s-faddr">${seller.business_address || ''}${seller.contact_phone ? '<br>📞 ' + seller.contact_phone : ''}${seller.gst_number ? '<br>GST: ' + seller.gst_number : ''}</div>
              </div>
            </div>
          </div>
          <div class="s-footer"><b>Items (${totalQty}):</b> ${itemsList.substring(0, 100)}${itemsList.length > 100 ? '...' : ''}</div>
        </div>`
    }

    const stickersHtml = fullOrders.map(buildSticker).join('')

    const pageHtml = `<!DOCTYPE html><html><head><title>Delivery Stickers - A4</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        @page{size:A4 landscape;margin:6mm}
        body{font-family:Arial,sans-serif}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:5mm}
        .sticker{border:2px solid #000;border-radius:6px;height:92mm;display:grid;grid-template-rows:auto 1fr auto;page-break-inside:avoid;overflow:hidden}
        .s-header{display:flex;align-items:center;justify-content:space-between;padding:5px 10px;border-bottom:2px solid #000}
        .s-logo{display:flex;align-items:center;gap:4px;font-size:11px}
        .s-logo img{height:14px;width:14px}
        .s-order{text-align:right}
        .s-oid{font-size:13px;font-weight:900}
        .s-odate{font-size:8px;color:#666}
        .s-body{display:grid;grid-template-columns:1.4fr 1fr;padding:0}
        .s-left{padding:8px 10px;display:flex;flex-direction:column}
        .s-right{padding:8px 10px;border-left:1.5px dashed #ccc;display:flex;flex-direction:column}
        .s-dlabel{font-size:7px;font-weight:800;color:#f97316;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px}
        .s-cname{font-size:12px;font-weight:900;margin-bottom:2px}
        .s-caddr{font-size:9px;color:#333;line-height:1.3}
        .s-cphone{font-size:9px;font-weight:700;margin-top:2px}
        .s-pinbox{margin-top:auto;border:2px solid #000;border-radius:4px;padding:2px 8px;font-size:16px;font-weight:900;letter-spacing:3px;width:fit-content;font-family:'Courier New',monospace}
        .s-paybadge{display:inline-block;font-size:8px;font-weight:800;padding:3px 6px;border-radius:4px}
        .pay-cod{background:#fef3c7;color:#92400e;border:1px solid #f59e0b}
        .pay-prepaid{background:#d1fae5;color:#065f46;border:1px solid #10b981}
        .s-from{margin-top:auto;padding-top:5px;border-top:1.5px solid #000}
        .s-flabel{font-size:7px;font-weight:800;color:#f97316;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1px}
        .s-fname{font-size:9px;font-weight:800}
        .s-faddr{font-size:8px;color:#444;line-height:1.3}
        .s-footer{grid-column:1/-1;border-top:1.5px dashed #ccc;padding:4px 10px;font-size:8px;color:#555}
      </style></head><body><div class="grid">${stickersHtml}</div></body></html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(pageHtml)
      win.document.close()
      setTimeout(() => win.print(), 400)
    }
  }

  return (
    <VendorLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Orders</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {orders.filter(o => o.status === 'confirmed' || o.status === 'shipped').length > 0 && (
              <>
                <button onClick={selectAll} className="btn-secondary text-xs flex items-center gap-1">
                  <input type="checkbox" checked={selectedOrders.size > 0 && selectedOrders.size === orders.filter(o => o.status === 'confirmed' || o.status === 'shipped').length} readOnly className="accent-primary-500" />
                  {selectedOrders.size > 0 ? `${selectedOrders.size} Selected` : 'Select All'}
                </button>
                {selectedOrders.size > 0 && (
                  <button onClick={() => printBulkStickers(orders.filter(o => selectedOrders.has(o.id)))} className="btn-primary text-xs flex items-center gap-1">
                    🏷️ Print Selected ({selectedOrders.size})
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        {loading ? (
          <div className="space-y-3">{Array(4).fill(0).map((_,i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : orders.length === 0 ? (
          <EmptyState icon={<ShoppingBag size={48} />} title="No orders yet" description="Orders for your products will appear here." />
        ) : (
          <>
            {/* Mobile card view */}
            <div className="sm:hidden space-y-3">
              {orders.map(o => (
                <div key={o.id} className="border border-gray-200 rounded-xl bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-gray-800 text-sm">#{o.id}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="text-sm font-medium text-gray-800">{o.first_name} {o.last_name}</p>
                  <p className="text-xs text-gray-400 mb-2">{formatDateTime(o.created_at)}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="font-bold text-gray-900">{formatCurrency(o.total)}</span>
                    <div className="flex gap-2">
                      <button onClick={() => api.get('/orders/' + o.id).then(r => setSelected(r.data.order || r.data)).catch(() => toast.error('Failed'))} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg font-medium">View</button>
                      {o.status === 'confirmed' && (
                        <button onClick={() => updateStatus(o.id, 'shipped')} className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-medium">Ship</button>
                      )}
                      {o.status === 'shipped' && (
                        <button onClick={() => updateStatus(o.id, 'delivered')} className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-medium">Deliver</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table view */}
            <div className="hidden sm:block card overflow-hidden">
              <Table headers={['', 'Order #', 'Customer', 'Date', 'Total', 'Status', 'Actions']}>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td className="table-cell px-2 w-8">
                      {(o.status === 'confirmed' || o.status === 'shipped') && (
                        <input type="checkbox" checked={selectedOrders.has(o.id)} onChange={() => toggleSelect(o.id)} className="accent-primary-500 w-4 h-4 cursor-pointer" />
                      )}
                    </td>
                    <td className="table-cell px-4"><span className="font-mono font-bold text-gray-800">#{o.id}</span></td>
                    <td className="table-cell px-4"><div><p className="text-sm font-medium">{o.first_name} {o.last_name}</p><p className="text-xs text-gray-400">{o.customer_email}</p></div></td>
                    <td className="table-cell px-4 text-xs text-gray-500">{formatDateTime(o.created_at)}</td>
                    <td className="table-cell px-4 font-bold">{formatCurrency(o.total)}</td>
                    <td className="table-cell px-4"><StatusBadge status={o.status} /></td>
                    <td className="table-cell px-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => api.get('/orders/' + o.id).then(r => setSelected(r.data.order || r.data)).catch(() => toast.error('Failed to load order'))} className="text-gray-500 hover:text-primary-600 p-1" title="View details"><Eye size={16} /></button>
                        {o.status === 'confirmed' && (
                          <button onClick={() => updateStatus(o.id, 'shipped')} className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1 rounded-lg font-medium transition-colors">Mark Shipped</button>
                        )}
                        {o.status === 'shipped' && (
                          <button onClick={() => updateStatus(o.id, 'delivered')} className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1 rounded-lg font-medium transition-colors">Mark Delivered</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
          </>
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
              <div className="flex gap-3 pt-2 border-t border-gray-100 flex-wrap">
                {selected.status === 'confirmed' && (
                  <button onClick={() => { updateStatus(selected.id, 'shipped'); setSelected((prev: any) => prev ? { ...prev, status: 'shipped' } : null) }} className="btn-primary text-sm">Mark Shipped</button>
                )}
                {selected.status === 'shipped' && (
                  <button onClick={() => { updateStatus(selected.id, 'delivered'); setSelected((prev: any) => prev ? { ...prev, status: 'delivered' } : null) }} className="btn-primary text-sm">Mark Delivered</button>
                )}
                <button onClick={() => printDeliverySticker(selected)} className="btn-secondary text-sm inline-flex items-center gap-1">🏷️ Print Sticker</button>
                <a href={`/invoice/${selected.id}`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm inline-flex items-center gap-1">Print Invoice</a>
                <button onClick={() => setSelected(null)} className="btn-secondary text-sm">Close</button>
              </div>
            </div>
          </Modal>
        )}

        {/* Return Requests Section */}
        <VendorReturnRequests />
      </div>
    </VendorLayout>
  )
}

function ContactAdminCard() {
  const [adminWhatsapp, setAdminWhatsapp] = useState('919876543210')
  useEffect(() => {
    api.get('/config/support-contact').then(r => { if (r.data.whatsapp) setAdminWhatsapp(r.data.whatsapp) }).catch(() => {})
  }, [])
  return (
    <div className="mt-6 border border-gray-200 rounded-xl p-4 bg-white flex items-center justify-between">
      <div>
        <p className="font-bold text-gray-900 text-sm">Need Help?</p>
        <p className="text-xs text-gray-400">Contact admin via WhatsApp for support</p>
      </div>
      <a href={`https://wa.me/${adminWhatsapp}?text=${encodeURIComponent('Hi GoMarts Admin, I need help with my vendor account.')}`} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Chat with Admin
      </a>
    </div>
  )
}

function VendorReturnRequests() {
  const [returns, setReturns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    api.get('/orders/returns/vendor').then(r => setReturns(r.data.returns || [])).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleAction = async (id: number, status: 'approved' | 'rejected', vendorNote?: string) => {
    try {
      await api.put(`/orders/returns/${id}`, { status, vendorNote })
      toast.success(`Return ${status}`)
      load()
    } catch { toast.error('Failed to update return request') }
  }

  if (loading) return <Skeleton className="h-32 rounded-2xl mt-8" />
  if (returns.length === 0) return null

  return (
    <div className="mt-8">
      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Return Requests</h2>

      {/* Mobile card view */}
      <div className="sm:hidden space-y-4">
        {returns.map(r => (
          <div key={r.id} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <span className="font-mono font-bold text-gray-800 text-sm">Order #{r.order_id}</span>
              <StatusBadge status={r.status === 'refund_pending' ? 'pending' : r.status} />
            </div>
            {/* Body */}
            <div className="p-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{r.first_name} {r.last_name}</p>
                <p className="text-xs text-gray-400">{r.customer_email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Reason</p>
                <p className="text-sm text-gray-700">{r.reason}</p>
              </div>
              {r.proof_image_url && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium mb-1">Proof</p>
                  <a href={r.proof_image_url} target="_blank" rel="noopener noreferrer">
                    <img src={r.proof_image_url} alt="Proof" className="w-20 h-20 rounded-lg object-cover border border-gray-200" />
                  </a>
                </div>
              )}
              <p className="text-xs text-gray-400">{formatDateTime(r.created_at)}</p>
              {/* Actions */}
              {r.status === 'pending' && (
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button onClick={() => handleAction(r.id, 'approved')} className="flex-1 text-xs bg-green-50 text-green-700 hover:bg-green-100 px-3 py-2 rounded-lg font-medium transition-colors text-center">Approve</button>
                  <button onClick={() => handleAction(r.id, 'rejected', 'Return not eligible')} className="flex-1 text-xs bg-red-50 text-red-700 hover:bg-red-100 px-3 py-2 rounded-lg font-medium transition-colors text-center">Reject</button>
                </div>
              )}
              {r.status === 'refund_pending' && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">Awaiting admin refund</p>
              )}
              {r.status === 'refunded' && (
                <p className="text-xs text-green-600 bg-green-50 rounded-lg p-2">Refund completed</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block card overflow-hidden">
        <Table headers={['Order', 'Customer', 'Reason', 'Proof', 'Date', 'Status', 'Actions']}>
          {returns.map(r => (
            <tr key={r.id}>
              <td className="table-cell px-4 font-mono font-bold text-gray-800">#{r.order_id}</td>
              <td className="table-cell px-4">
                <p className="text-sm font-medium">{r.first_name} {r.last_name}</p>
                <p className="text-xs text-gray-400">{r.customer_email}</p>
              </td>
              <td className="table-cell px-4 text-sm text-gray-600 max-w-[200px] truncate">{r.reason}</td>
              <td className="table-cell px-4">
                {r.proof_image_url && (
                  <a href={r.proof_image_url} target="_blank" rel="noopener noreferrer">
                    <img src={r.proof_image_url} alt="Proof" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                  </a>
                )}
              </td>
              <td className="table-cell px-4 text-xs text-gray-500">{formatDateTime(r.created_at)}</td>
              <td className="table-cell px-4"><StatusBadge status={r.status === 'refund_pending' ? 'pending' : r.status} /></td>
              <td className="table-cell px-4">
                {r.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleAction(r.id, 'approved')} className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1 rounded-lg font-medium transition-colors">Approve</button>
                    <button onClick={() => handleAction(r.id, 'rejected', 'Return not eligible')} className="text-xs bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1 rounded-lg font-medium transition-colors">Reject</button>
                  </div>
                )}
                {r.status === 'refund_pending' && <span className="text-xs text-amber-600">Awaiting admin refund</span>}
                {r.status === 'refunded' && <span className="text-xs text-green-600">Refunded</span>}
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  )
}

// ============ VENDOR NOTIFICATIONS ============
export function VendorNotifications() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/vendor/customers').then(r => setCustomers(r.data.customers || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const phonesWithNumbers = customers.filter(c => c.phone)

  const sendEmail = async () => {
    if (!subject.trim() || !message.trim()) return toast.error('Subject and message are required')
    if (!confirm(`Send this email to ${customers.length} customers?`)) return
    setSending(true)
    try {
      const res = await api.post('/vendor/notifications/send-email', { subject, message })
      toast.success(res.data.message)
      setSubject('')
      setMessage('')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send')
    } finally { setSending(false) }
  }

  const shareWhatsApp = () => {
    if (!message.trim()) return toast.error('Write a message first')
    const text = `*${subject || 'Special Offer'}*\n\n${message}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const copyAllNumbers = () => {
    const numbers = phonesWithNumbers.map(c => c.phone).join('\n')
    navigator.clipboard.writeText(numbers)
    toast.success(`${phonesWithNumbers.length} numbers copied!`)
  }

  return (
    <VendorLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Send Notification</h1>
        <p className="text-sm text-gray-500 mb-6">Notify your customers about offers, new products, or updates.</p>

        {/* Stats */}
        <div className="border border-gray-200 rounded-xl bg-white p-4 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <ShoppingBag size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
            <p className="text-xs text-gray-500">Your Customers (who ordered from you)</p>
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
              <input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. 🎉 New arrivals in our store!" />
            </div>
            <div>
              <label className="label">Message *</label>
              <textarea className="input resize-none" rows={5} value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Write your offer details, coupon code, new product info, etc." />
            </div>

            {message && (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <p className="text-xs text-gray-500 uppercase font-medium mb-2">Preview</p>
                <p className="font-bold text-gray-900 mb-1">{subject || 'No subject'}</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{message}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button onClick={sendEmail} disabled={sending || customers.length === 0}
                className="btn-primary flex-1 justify-center py-2.5">
                {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                  <>📧 Send Email ({customers.length})</>
                )}
              </button>
              <button onClick={shareWhatsApp}
                className="flex-1 justify-center py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium text-sm flex items-center gap-2 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Share via WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* Customer Phone List */}
        {phonesWithNumbers.length > 0 && (
          <div className="border border-gray-200 rounded-xl bg-white overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-sm">Customer Phone Numbers ({phonesWithNumbers.length})</h2>
              <button onClick={copyAllNumbers} className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                Copy All
              </button>
            </div>
            <div className="p-4 max-h-48 overflow-y-auto space-y-1">
              {phonesWithNumbers.map(c => (
                <div key={c.id} className="flex items-center justify-between text-sm py-1">
                  <span className="text-gray-700">{c.first_name} {c.last_name}</span>
                  <span className="text-gray-500 font-mono text-xs">{c.phone}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </VendorLayout>
  )
}

// ============ VENDOR REVIEWS ============
export function VendorReviews() {
  const [reviews, setReviews] = useState<any[]>([])
  const [stats, setStats] = useState<any>({ total: 0, avgRating: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/reviews/vendor').then(r => {
      setReviews(r.data.reviews || [])
      setStats(r.data.stats || { total: 0, avgRating: 0 })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <VendorLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Product Reviews</h1>

        {/* Stats */}
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

        {loading ? (
          <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : reviews.length === 0 ? (
          <EmptyState icon={<Eye size={48} />} title="No reviews yet" description="Reviews from customers will appear here." />
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
                    <div className="flex items-center gap-1 mt-0.5">
                      {[1,2,3,4,5].map(s => (
                        <span key={s} className={`text-xs ${s <= r.rating ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                      ))}
                      <span className="text-xs text-gray-500 ml-1">{r.rating}/5</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">by {r.first_name} {r.last_name} • {formatDateTime(r.created_at)}</p>
                  </div>
                </div>
                {r.title && <p className="font-medium text-gray-800 text-sm mt-3">{r.title}</p>}
                {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </VendorLayout>
  )
}

// ============ VENDOR OFFERS ============
export function VendorOffers() {
  const [offers, setOffers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [editingOffer, setEditingOffer] = useState<any>(null)
  const [form, setForm] = useState({ productId: '', discountPercent: '', startDate: '', endDate: '' })
  const [bulkForm, setBulkForm] = useState({ productIds: [] as string[], discountPercent: '', startDate: '', endDate: '' })

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/vendor/offers'),
      api.get('/products/vendor/mine'),
    ]).then(([o, p]) => {
      setOffers(o.data.offers || [])
      setProducts(p.data.products || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openAdd = () => {
    setEditingOffer(null)
    setForm({ productId: '', discountPercent: '', startDate: '', endDate: '' })
    setShowForm(true)
  }

  const openEdit = (offer: any) => {
    setEditingOffer(offer)
    const discount = Math.round((1 - offer.offer_price / offer.original_price) * 100)
    const startStr = String(offer.starts_at).slice(0, 10)
    const endStr = String(offer.ends_at).slice(0, 10)
    setForm({
      productId: String(offer.product_id),
      discountPercent: String(discount),
      startDate: startStr,
      endDate: endStr,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.productId || !form.discountPercent || !form.startDate || !form.endDate) return toast.error('All fields are required')
    const pct = Number(form.discountPercent)
    if (pct <= 0 || pct >= 100) return toast.error('Discount must be between 1-99%')
    const prod = products.find(p => String(p.id) === form.productId)
    if (!prod) return toast.error('Select a product')
    const offerPrice = Math.round(prod.price * (1 - pct / 100) * 100) / 100
    const startsAt = `${form.startDate} 00:00:00`
    const endsAt = `${form.endDate} 23:59:59`
    try {
      if (editingOffer) {
        await api.put(`/vendor/products/${form.productId}/offer`, { offerPrice, startsAt, endsAt })
        toast.success('Offer updated!')
      } else {
        await api.post(`/vendor/products/${form.productId}/offer`, { offerPrice, startsAt, endsAt })
        toast.success('Offer created!')
      }
      setShowForm(false)
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save offer')
    }
  }

  const handleBulkSave = async () => {
    if (!bulkForm.productIds.length || !bulkForm.discountPercent || !bulkForm.startDate || !bulkForm.endDate) return toast.error('All fields are required')
    try {
      const startsAt = `${bulkForm.startDate} 00:00:00`
      const endsAt = `${bulkForm.endDate} 23:59:59`
      await api.post('/vendor/offers/bulk', {
        productIds: bulkForm.productIds.map(Number),
        discountPercent: parseFloat(bulkForm.discountPercent),
        startsAt,
        endsAt,
      })
      toast.success('Bulk offer applied!')
      setShowBulkForm(false)
      setBulkForm({ productIds: [], discountPercent: '', startDate: '', endDate: '' })
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to apply bulk offer')
    }
  }

  const removeOffer = async (productId: number) => {
    if (!confirm('Remove this offer?')) return
    try {
      await api.delete(`/vendor/products/${productId}/offer`)
      toast.success('Offer removed')
      load()
    } catch { toast.error('Failed to remove offer') }
  }

  const toggleBulkProduct = (id: string) => {
    setBulkForm(prev => ({
      ...prev,
      productIds: prev.productIds.includes(id) ? prev.productIds.filter(p => p !== id) : [...prev.productIds, id]
    }))
  }

  const now = new Date()
  const activeOffers = offers.filter(o => new Date(o.starts_at) <= now && new Date(o.ends_at) >= now)
  const upcomingOffers = offers.filter(o => new Date(o.starts_at) > now)
  const expiredOffers = offers.filter(o => new Date(o.ends_at) < now)

  return (
    <VendorLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Sale / Offers</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowBulkForm(true)} className="btn-secondary text-xs sm:text-sm"><Zap size={14} /> Bulk % Off</button>
            <button onClick={openAdd} className="btn-primary text-xs sm:text-sm"><Plus size={14} /> Single Offer</button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : offers.length === 0 ? (
          <EmptyState icon={<Tag size={48} />} title="No offers yet" description="Create sale offers to attract more customers."
            action={<button onClick={openAdd} className="btn-primary"><Plus size={16} /> Create Offer</button>} />
        ) : (
          <div className="space-y-6">
            {activeOffers.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-green-700 uppercase tracking-wide mb-3">🟢 Active ({activeOffers.length})</h2>
                <div className="space-y-3">
                  {activeOffers.map(o => <OfferCard key={o.id} offer={o} onRemove={removeOffer} onEdit={openEdit} />)}
                </div>
              </div>
            )}
            {upcomingOffers.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-3">🔵 Upcoming ({upcomingOffers.length})</h2>
                <div className="space-y-3">
                  {upcomingOffers.map(o => <OfferCard key={o.id} offer={o} onRemove={removeOffer} onEdit={openEdit} />)}
                </div>
              </div>
            )}
            {expiredOffers.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">⚫ Expired ({expiredOffers.length})</h2>
                <div className="space-y-3">
                  {expiredOffers.map(o => <OfferCard key={o.id} offer={o} onRemove={removeOffer} onEdit={openEdit} expired />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Single Offer Modal */}
        <Modal open={showForm} onClose={() => setShowForm(false)} title={editingOffer ? 'Edit Offer' : 'Create Sale Offer'}>
          <div className="space-y-4">
            <div>
              <label className="label">Product *</label>
              <select className="input" value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })} disabled={!!editingOffer}>
                <option value="">Select a product</option>
                {products.filter(p => p.status === 'active').map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Discount Percentage *</label>
              <div className="relative">
                <input type="number" className="input pr-8" value={form.discountPercent} onChange={e => setForm({ ...form, discountPercent: e.target.value })} placeholder="e.g. 20" min="1" max="99" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">%</span>
              </div>
              {form.productId && form.discountPercent && (() => {
                const prod = products.find(p => String(p.id) === form.productId)
                const pct = Number(form.discountPercent)
                if (prod && pct > 0 && pct < 100) {
                  const salePrice = Math.round(prod.price * (1 - pct / 100) * 100) / 100
                  return <p className="text-xs text-green-600 mt-1">Sale price: {formatCurrency(salePrice)} (was {formatCurrency(prod.price)})</p>
                }
                return null
              })()}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Start Date *</label>
                <input type="date" className="input text-sm" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <label className="label">End Date *</label>
                <input type="date" className="input text-sm" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn-primary flex-1 justify-center">{editingOffer ? 'Update Offer' : 'Create Offer'}</button>
            </div>
          </div>
        </Modal>

        {/* Bulk Offer Modal */}
        <Modal open={showBulkForm} onClose={() => setShowBulkForm(false)} title="Bulk Percentage Discount" size="lg">
          <div className="space-y-4">
            <div>
              <label className="label">Discount Percentage *</label>
              <div className="relative">
                <input type="number" className="input pr-8" value={bulkForm.discountPercent} onChange={e => setBulkForm({ ...bulkForm, discountPercent: e.target.value })} placeholder="e.g. 20" min="1" max="99" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">%</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Start Date *</label>
                <input type="date" className="input text-sm" value={bulkForm.startDate} onChange={e => setBulkForm({ ...bulkForm, startDate: e.target.value })} />
              </div>
              <div>
                <label className="label">End Date *</label>
                <input type="date" className="input text-sm" value={bulkForm.endDate} onChange={e => setBulkForm({ ...bulkForm, endDate: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Select Products * ({bulkForm.productIds.length} selected)</label>
              <div className="border border-gray-200 rounded-xl max-h-60 overflow-y-auto p-2 space-y-1">
                {products.filter(p => p.status === 'active').map(p => (
                  <label key={p.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${bulkForm.productIds.includes(String(p.id)) ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={bulkForm.productIds.includes(String(p.id))} onChange={() => toggleBulkProduct(String(p.id))} className="accent-primary-500 w-4 h-4" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">{formatCurrency(p.price)} → {bulkForm.discountPercent ? formatCurrency(p.price * (1 - Number(bulkForm.discountPercent) / 100)) : '—'}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowBulkForm(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleBulkSave} className="btn-primary flex-1 justify-center">Apply {bulkForm.discountPercent ? `${bulkForm.discountPercent}%` : ''} Discount</button>
            </div>
          </div>
        </Modal>
      </div>
    </VendorLayout>
  )
}

function OfferCard({ offer, onRemove, onEdit, expired }: { offer: any; onRemove: (id: number) => void; onEdit: (offer: any) => void; expired?: boolean }) {
  const discount = Math.round((1 - offer.offer_price / offer.original_price) * 100)
  return (
    <div className={`border rounded-xl bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 ${expired ? 'border-gray-200 opacity-60' : 'border-gray-200'}`}>
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
        {offer.product_image && <img src={offer.product_image} alt="" className="w-full h-full object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm truncate">{offer.product_name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-bold text-primary-600">{formatCurrency(offer.offer_price)}</span>
          <span className="text-xs text-gray-400 line-through">{formatCurrency(offer.original_price)}</span>
          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">-{discount}%</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {formatDateTime(offer.starts_at)} → {formatDateTime(offer.ends_at)}
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {!expired && (
          <>
            <button onClick={() => onEdit(offer)} className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-medium transition-colors">Edit</button>
            <button onClick={() => onRemove(offer.product_id)} className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium transition-colors">Remove</button>
          </>
        )}
      </div>
    </div>
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
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Coupons</h1>
          <button onClick={() => setShowForm(true)} className="btn-primary text-xs sm:text-sm"><Plus size={14} /> Create Coupon</button>
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
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Earnings & Withdrawals</h1>

        {/* Balance & Withdraw */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="border border-gray-200 rounded-xl bg-white p-5 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">{formatCurrency(data.availableBalance)}</div>
            <div className="text-sm text-gray-500">Available Balance</div>
          </div>
          <div className="border border-gray-200 rounded-xl bg-white p-5 sm:col-span-2">
            <h3 className="font-bold text-gray-900 mb-3 text-sm">Request Withdrawal</h3>
            <div className="flex flex-col sm:flex-row gap-3">
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

        {/* Withdrawal History */}
        <h2 className="font-bold text-gray-900 mb-4">Withdrawal History</h2>
        {data.withdrawals.length === 0 ? (
          <div className="border border-gray-200 rounded-xl bg-white p-8 text-center text-gray-400">No withdrawal requests yet.</div>
        ) : (
          <>
            {/* Mobile */}
            <div className="sm:hidden space-y-3">
              {data.withdrawals.map((w: any) => (
                <div key={w.id} className="border border-gray-200 rounded-xl bg-white p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-900">{formatCurrency(w.amount)}</span>
                    <StatusBadge status={w.status} />
                  </div>
                  <p className="text-xs text-gray-500">{formatDateTime(w.created_at)}</p>
                  {w.note && <p className="text-xs text-gray-400 mt-1">{w.note}</p>}
                </div>
              ))}
            </div>
            {/* Desktop */}
            <div className="hidden sm:block card overflow-hidden">
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
          </>
        )}
      </div>
    </VendorLayout>
  )
}
