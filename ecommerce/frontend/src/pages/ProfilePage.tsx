import React, { useEffect, useState } from 'react'
import { User, Mail, Phone, Shield, Calendar, MapPin, Plus, Trash2, Edit2, Check, FileText, Building2, Upload, Store } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { CustomerLayout, VendorLayout, AdminLayout } from '../components/layout/DashboardLayout'
import toast from '../components/ui/Toast'

function AddressSection() {
  const [addresses, setAddresses] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', address: '', city: '', state: '', pincode: '', landmark: '', isDefault: false })

  const load = () => {
    api.get('/auth/addresses').then(r => setAddresses(r.data.addresses || [])).catch(() => {})
  }
  useEffect(load, [])

  const resetForm = () => {
    setForm({ name: '', phone: '', address: '', city: '', state: '', pincode: '', landmark: '', isDefault: false })
    setEditingId(null)
    setShowForm(false)
  }

  const openEdit = (addr: any) => {
    setForm({
      name: addr.name, phone: addr.phone, address: addr.address,
      city: addr.city, state: addr.state, pincode: addr.pincode,
      landmark: addr.landmark || '', isDefault: !!addr.is_default
    })
    setEditingId(addr.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.phone || !form.address || !form.city || !form.state || !form.pincode) {
      return toast.error('Please fill all required fields')
    }
    try {
      if (editingId) {
        await api.put(`/auth/addresses/${editingId}`, form)
        toast.success('Address updated')
      } else {
        await api.post('/auth/addresses', form)
        toast.success('Address added')
      }
      resetForm()
      load()
    } catch { toast.error('Failed to save address') }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this address?')) return
    await api.delete(`/auth/addresses/${id}`).catch(() => {})
    toast.success('Address deleted')
    load()
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-900 flex items-center gap-2"><MapPin size={18} className="text-primary-500" /> Saved Addresses</h2>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary text-sm py-1.5 px-3"><Plus size={14} /> Add</button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">{editingId ? 'Edit Address' : 'New Address'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
              <input className="input text-sm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone *</label>
              <input className="input text-sm" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Address *</label>
              <textarea className="input text-sm resize-none" rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Flat/House No, Street, Area" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">City *</label>
              <input className="input text-sm" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Mumbai" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">State *</label>
              <input className="input text-sm" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="Maharashtra" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pincode *</label>
              <input className="input text-sm" value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} placeholder="400001" maxLength={6} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Landmark</label>
              <input className="input text-sm" value={form.landmark} onChange={e => setForm({ ...form, landmark: e.target.value })} placeholder="Near..." />
            </div>
          </div>
          <label className="flex items-center gap-2 mt-3 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.isDefault} onChange={e => setForm({ ...form, isDefault: e.target.checked })} className="accent-primary-500" />
            Set as default address
          </label>
          <div className="flex gap-2 mt-4">
            <button onClick={resetForm} className="btn-secondary text-sm">Cancel</button>
            <button onClick={handleSave} className="btn-primary text-sm">Save Address</button>
          </div>
        </div>
      )}

      {addresses.length === 0 && !showForm ? (
        <p className="text-sm text-gray-400 text-center py-4">No saved addresses. Add one to speed up checkout.</p>
      ) : (
        <div className="space-y-3">
          {addresses.map(addr => (
            <div key={addr.id} className={`p-4 rounded-xl border ${addr.is_default ? 'border-primary-200 bg-orange-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800 text-sm">{addr.name}</p>
                    {addr.is_default && <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">Default</span>}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{addr.address}</p>
                  <p className="text-sm text-gray-600">{addr.city}, {addr.state} - {addr.pincode}</p>
                  {addr.landmark && <p className="text-xs text-gray-400 mt-0.5">Landmark: {addr.landmark}</p>}
                  <p className="text-xs text-gray-500 mt-1">📞 {addr.phone}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(addr)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-500"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(addr.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProfileContent() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profileData, setProfileData] = useState<any>(null)

  useEffect(() => {
    api.get('/auth/me').then(r => {
      const u = r.data.user
      setProfileData(u)
      setForm({ firstName: u.firstName || '', lastName: u.lastName || '', phone: u.phone || '' })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/auth/me', form)
      updateUser({ firstName: form.firstName, lastName: form.lastName })
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to update profile')
    } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">My Profile</h1>
      <p className="text-gray-500 text-sm mb-8">Manage your account information</p>

      {/* Profile Header Card */}
      <div className="border border-gray-200 rounded-xl bg-white p-6 mb-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {form.firstName?.[0]?.toUpperCase() || user?.email[0].toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">{form.firstName} {form.lastName}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="inline-flex items-center gap-1 text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full mt-1 font-medium capitalize">
              <Shield size={10} /> {user?.role}
            </span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">First Name</label>
            <input className="input" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="First name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Last Name</label>
            <input className="input" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Last name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Phone</label>
            <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
            <input className="input bg-gray-50 text-gray-500" value={user?.email || ''} disabled />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
          {profileData?.createdAt && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar size={12} /> Member since {new Date(profileData.createdAt).toLocaleDateString()}
            </p>
          )}
          <button onClick={handleSave} disabled={saving} className="btn-primary px-6">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save Changes'}
          </button>
        </div>
      </div>

      <AddressSection />
    </div>
  )
}

export function CustomerProfilePage() {
  const [adminWhatsapp, setAdminWhatsapp] = useState('919876543210')
  useEffect(() => {
    api.get('/config/support-contact').then(r => { if (r.data.whatsapp) setAdminWhatsapp(r.data.whatsapp) }).catch(() => {})
  }, [])
  return (
    <CustomerLayout>
      <ProfileContent />
      <div className="px-6 sm:px-8 pb-6">
        <a href={`https://wa.me/${adminWhatsapp}?text=${encodeURIComponent('Hi, I need help with my account on MarketHub.')}`} target="_blank" rel="noopener noreferrer"
          className="border border-gray-200 rounded-xl p-4 bg-white flex items-center justify-between w-full hover:border-green-300 transition-colors">
          <div>
            <p className="font-bold text-gray-900 text-sm">Need Help?</p>
            <p className="text-xs text-gray-400">Chat with our support team on WhatsApp</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Chat Support
          </span>
        </a>
      </div>
    </CustomerLayout>
  )
}

function VendorDocumentsSection() {
  const [vendor, setVendor] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    contactPhone: '', gstNumber: '', fssaiNumber: '',
    gstCertificateUrl: '', fssaiCertificateUrl: '',
    bankAccountName: '', bankAccountNumber: '', bankIfsc: '', bankName: '',
    logoUrl: '', bannerUrl: '', returnPolicyEnabled: false, codEnabled: true,
    signatureUrl: '', businessAddress: '', whatsappNumber: ''
  })

  useEffect(() => {
    api.get('/vendor/profile').then(r => {
      const v = r.data.vendor
      setVendor(v)
      setForm({
        contactPhone: v.contact_phone || '',
        gstNumber: v.gst_number || '',
        fssaiNumber: v.fssai_number || '',
        gstCertificateUrl: v.gst_certificate_url || '',
        fssaiCertificateUrl: v.fssai_certificate_url || '',
        bankAccountName: v.bank_account_name || '',
        bankAccountNumber: v.bank_account_number || '',
        bankIfsc: v.bank_ifsc || '',
        bankName: v.bank_name || '',
        logoUrl: v.logo_url || '',
        bannerUrl: v.banner_url || '',
        returnPolicyEnabled: !!v.return_policy_enabled,
        codEnabled: v.cod_enabled !== false && v.cod_enabled !== 0,
        signatureUrl: v.signature_url || '',
        businessAddress: v.business_address || '',
        whatsappNumber: v.whatsapp_number || '',
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      console.log('[VENDOR PROFILE] Saving:', JSON.stringify({ logoUrl: form.logoUrl, bannerUrl: form.bannerUrl }))
      await api.put('/vendor/profile', form)
      toast.success('Vendor documents updated!')
    } catch (err: any) {
      console.error('[VENDOR PROFILE] Save error:', err?.response?.data || err)
      toast.error('Failed to update')
    } finally { setSaving(false) }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'gstCertificateUrl' | 'fssaiCertificateUrl') => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('image', file)
    try {
      const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setForm(prev => ({ ...prev, [field]: res.data.url }))
      toast.success('File uploaded!')
    } catch {
      toast.error('Upload failed')
    }
    e.target.value = ''
  }

  if (loading) return <div className="border border-gray-200 rounded-xl p-6 animate-pulse bg-white"><div className="h-48 bg-gray-100 rounded-lg" /></div>

  return (
    <div className="space-y-6">
      {/* Store Appearance */}
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Store size={16} className="text-primary-500" /> Store Appearance</h2>
        </div>
        <div className="p-6 space-y-5">
          {/* Banner */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Store Banner</label>
            <div className="relative h-32 sm:h-40 rounded-xl overflow-hidden bg-gray-50 border border-gray-200">
              {form.bannerUrl ? (
                <img src={form.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">No banner uploaded</div>
              )}
              <label className="absolute bottom-2 right-2 bg-white border border-gray-200 text-xs py-1.5 px-3 rounded-lg cursor-pointer shadow-sm hover:bg-gray-50 inline-flex items-center gap-1 font-medium text-gray-700">
                <Upload size={12} /> {form.bannerUrl ? 'Change' : 'Upload'}
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return
                  const fd = new FormData(); fd.append('image', file)
                  try { const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); setForm(prev => ({ ...prev, bannerUrl: res.data.url })); toast.success('Banner uploaded!') }
                  catch { toast.error('Upload failed') }
                  e.target.value = ''
                }} />
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-1">Recommended: 1200×400px</p>
          </div>
          {/* Logo */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Store Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Store size={24} className="text-gray-300" />
                )}
              </div>
              <div>
                <label className="bg-white border border-gray-200 text-xs py-1.5 px-3 rounded-lg cursor-pointer hover:bg-gray-50 inline-flex items-center gap-1 font-medium text-gray-700">
                  <Upload size={12} /> {form.logoUrl ? 'Change Logo' : 'Upload Logo'}
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return
                    const fd = new FormData(); fd.append('image', file)
                    try { const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); setForm(prev => ({ ...prev, logoUrl: res.data.url })); toast.success('Logo uploaded!') }
                    catch { toast.error('Upload failed') }
                    e.target.value = ''
                  }} />
                </label>
                <p className="text-xs text-gray-400 mt-1">Recommended: 200×200px</p>
              </div>
            </div>
          </div>
          {/* Contact Phone */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Contact Phone *</label>
            <input className="input" value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} placeholder="9876543210" />
          </div>
          {/* WhatsApp Number */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">WhatsApp Number</label>
            <input className="input" value={form.whatsappNumber} onChange={e => setForm({ ...form, whatsappNumber: e.target.value })} placeholder="919876543210 (with country code)" />
            <p className="text-xs text-gray-400 mt-1">Include country code (e.g. 91 for India). Used for admin communication.</p>
          </div>
          {/* Business Address */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Business Address (shown on invoice)</label>
            <textarea className="input text-sm resize-none" rows={2} value={form.businessAddress} onChange={e => setForm({ ...form, businessAddress: e.target.value })} placeholder="123, Main Street, City, State - Pincode" />
          </div>
        </div>
      </div>

      {/* Business Documents */}
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><FileText size={16} className="text-primary-500" /> Business Documents</h2>
        </div>
        <div className="p-6">
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">GST Number</label>
              <input className="input" value={form.gstNumber} onChange={e => setForm({ ...form, gstNumber: e.target.value })} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">FSSAI Number</label>
              <input className="input" value={form.fssaiNumber} onChange={e => setForm({ ...form, fssaiNumber: e.target.value })} placeholder="12345678901234" />
              <p className="text-xs text-gray-400 mt-1">Required for food vendors</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">GST Certificate</label>
              <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                {form.gstCertificateUrl ? (
                  <a href={form.gstCertificateUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline truncate flex-1">
                    ✓ Uploaded
                  </a>
                ) : (
                  <span className="text-xs text-gray-400 flex-1">No file</span>
                )}
                <label className="text-xs text-primary-600 font-medium cursor-pointer hover:text-primary-700">
                  {form.gstCertificateUrl ? 'Replace' : 'Upload'}
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleFileUpload(e, 'gstCertificateUrl')} />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">FSSAI Certificate</label>
              <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                {form.fssaiCertificateUrl ? (
                  <a href={form.fssaiCertificateUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline truncate flex-1">
                    ✓ Uploaded
                  </a>
                ) : (
                  <span className="text-xs text-gray-400 flex-1">No file</span>
                )}
                <label className="text-xs text-primary-600 font-medium cursor-pointer hover:text-primary-700">
                  {form.fssaiCertificateUrl ? 'Replace' : 'Upload'}
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleFileUpload(e, 'fssaiCertificateUrl')} />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bank Details */}
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Building2 size={16} className="text-primary-500" /> Bank Details</h2>
        </div>
        <div className="p-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Account Holder Name</label>
              <input className="input" value={form.bankAccountName} onChange={e => setForm({ ...form, bankAccountName: e.target.value })} placeholder="Account holder name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Account Number</label>
              <input className="input" value={form.bankAccountNumber} onChange={e => setForm({ ...form, bankAccountNumber: e.target.value })} placeholder="1234567890" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">IFSC Code</label>
              <input className="input" value={form.bankIfsc} onChange={e => setForm({ ...form, bankIfsc: e.target.value })} placeholder="SBIN0001234" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Bank Name</label>
              <input className="input" value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} placeholder="State Bank of India" />
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Signature */}
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><FileText size={16} className="text-primary-500" /> Invoice Signature</h2>
        </div>
        <div className="p-6">
          <p className="text-xs text-gray-400 mb-3">Upload your signature or stamp to appear on invoices as "Authorized Signatory"</p>
          <div className="flex items-center gap-4">
            <div className="w-32 h-16 rounded-lg overflow-hidden bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
              {form.signatureUrl ? (
                <img src={form.signatureUrl} alt="Signature" className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-xs text-gray-300">No signature</span>
              )}
            </div>
            <div>
              <label className="bg-white border border-gray-200 text-xs py-1.5 px-3 rounded-lg cursor-pointer hover:bg-gray-50 inline-flex items-center gap-1 font-medium text-gray-700">
                <Upload size={12} /> {form.signatureUrl ? 'Change' : 'Upload Signature'}
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return
                  const fd = new FormData(); fd.append('image', file)
                  try { const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); setForm(prev => ({ ...prev, signatureUrl: res.data.url })); toast.success('Signature uploaded!') }
                  catch { toast.error('Upload failed') }
                  e.target.value = ''
                }} />
              </label>
              <p className="text-xs text-gray-400 mt-1">PNG with transparent background recommended</p>
            </div>
          </div>
        </div>
      </div>

      {/* Store Policies */}
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Shield size={16} className="text-primary-500" /> Store Policies</h2>
        </div>
        <div className="p-6 space-y-5">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-700">Enable Return Policy</p>
              <p className="text-xs text-gray-400 mt-0.5">When enabled, "10-Day Easy Returns" will be shown on your product pages</p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={form.returnPolicyEnabled}
                onChange={e => setForm({ ...form, returnPolicyEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-primary-500 transition-colors"></div>
              <div className="absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
            </div>
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-700">Cash on Delivery (COD)</p>
              <p className="text-xs text-gray-400 mt-0.5">When disabled, customers can only pay online for your products</p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={form.codEnabled}
                onChange={e => setForm({ ...form, codEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-primary-500 transition-colors"></div>
              <div className="absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
            </div>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pb-4">
        <button onClick={handleSave} disabled={saving} className="btn-primary px-8 py-2.5">
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save All Changes'}
        </button>
      </div>
    </div>
  )
}

export function VendorProfilePage() {
  return (
    <VendorLayout>
      <ProfileContent />
      <div className="px-6 sm:px-8 pb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Business Documents & Bank</h2>
        <p className="text-gray-500 mb-6 text-sm">Update your store details, documents, and bank info for payouts</p>
        <VendorDocumentsSection />
      </div>
    </VendorLayout>
  )
}

export function AdminProfilePage() {
  return <AdminLayout><ProfileContent /></AdminLayout>
}
