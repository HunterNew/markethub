import React, { useEffect, useState } from 'react'
import { User, Mail, Phone, Shield, Calendar, MapPin, Plus, Trash2, Edit2, Check } from 'lucide-react'
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
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">My Profile</h1>
      <p className="text-gray-500 mb-8">Manage your account information</p>

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {form.firstName?.[0]?.toUpperCase() || user?.email[0].toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">{form.firstName} {form.lastName}</p>
            <p className="text-sm text-gray-500 flex items-center gap-1"><Shield size={12} /> {user?.role}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input className="input" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="First name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input className="input" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Last name" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input className="input bg-gray-50" value={user?.email || ''} disabled />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={handleSave} disabled={saving} className="btn-primary px-6">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save Changes'}
          </button>
        </div>
      </div>

      <AddressSection />

      <div className="card p-6 mt-6">
        <h2 className="font-bold text-gray-900 mb-4">Account Details</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3 text-gray-600">
            <Mail size={16} className="text-gray-400" />
            <span>{user?.email}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <Shield size={16} className="text-gray-400" />
            <span className="capitalize">{user?.role}</span>
          </div>
          {profileData?.createdAt && (
            <div className="flex items-center gap-3 text-gray-600">
              <Calendar size={16} className="text-gray-400" />
              <span>Member since {new Date(profileData.createdAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function CustomerProfilePage() {
  return <CustomerLayout><ProfileContent /></CustomerLayout>
}

export function VendorProfilePage() {
  return <VendorLayout><ProfileContent /></VendorLayout>
}

export function AdminProfilePage() {
  return <AdminLayout><ProfileContent /></AdminLayout>
}
