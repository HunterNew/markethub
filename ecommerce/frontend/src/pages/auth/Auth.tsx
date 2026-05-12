import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Store, Mail, Lock, User, Phone } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from '../../components/ui/Toast'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname
    || new URLSearchParams(location.search).get('redirect')
    || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Welcome back!')
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const redirect = user.role === 'admin' ? '/admin' : user.role === 'vendor' ? '/vendor' : from
      navigate(redirect, { replace: true })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
              <Store size={20} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-xl">Market<span className="text-primary-500">Hub</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@example.com" className="input pl-10" />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••" className="input pl-10 pr-10" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center mb-3">Demo accounts:</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Customer', email: 'customer1@email.com', pass: 'customer123' },
                { label: 'Vendor', email: 'vendor1@shop.com', pass: 'vendor123' },
                { label: 'Admin', email: 'admin@marketplace.com', pass: 'admin123' },
              ].map(d => (
                <button key={d.label} onClick={() => { setEmail(d.email); setPassword(d.pass) }}
                  className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 px-2 py-1.5 rounded-lg border border-gray-200 transition-colors">
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            Don't have an account?{' '}
            <Link to="/auth/register" className="text-primary-600 font-semibold hover:text-primary-700">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState<'customer'|'vendor'>('customer')
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'', phone:'', storeName:'', storeDescription:'' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await register({ ...form, role })
      toast.success('Account created!')
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      navigate(user.role === 'vendor' ? '/vendor' : '/')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
              <Store size={20} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-xl">Market<span className="text-primary-500">Hub</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-gray-500 text-sm mt-1">Join thousands of shoppers and sellers</p>
        </div>

        <div className="card p-8">
          {/* Role toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {(['customer','vendor'] as const).map(r => (
              <button key={r} onClick={() => setRole(r)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${role === r ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                {r === 'vendor' ? '🏪 Sell' : '🛍 Shop'} as {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="John" className="input pl-9 text-sm" />
                </div>
              </div>
              <div>
                <label className="label">Last Name</label>
                <input value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Doe" className="input text-sm" />
              </div>
            </div>
            <div>
              <label className="label">Email *</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" className="input pl-9 text-sm" />
              </div>
            </div>
            <div>
              <label className="label">Password *</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type={showPass ? 'text' : 'password'} required minLength={6} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 6 characters" className="input pl-9 pr-9 text-sm" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {role === 'vendor' && (
              <>
                <div>
                  <label className="label">Store Name *</label>
                  <div className="relative">
                    <Store size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input required value={form.storeName} onChange={e => set('storeName', e.target.value)} placeholder="Your Store Name" className="input pl-9 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="label">Store Description</label>
                  <textarea value={form.storeDescription} onChange={e => set('storeDescription', e.target.value)} rows={2}
                    placeholder="Tell customers about your store..." className="input text-sm resize-none" />
                </div>
              </>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base mt-2">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-primary-600 font-semibold hover:text-primary-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
