import React, { useState, useRef } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Store, Mail, Lock, User, ArrowLeft, CheckCircle, Phone, FileText, Building2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from '../../components/ui/Toast'
import api from '../../api/client'
import { sendPhoneOTP, verifyPhoneOTP } from '../../utils/firebase'
import type { ConfirmationResult } from 'firebase/auth'

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
          <Link to="/" className="inline-flex items-center gap-1 mb-2" style={{marginLeft:'-6px'}}>
             <img src="/logo.png" alt="GoMarts" className="h-14 w-14 object-contain" />
            <div className="hidden sm:block" style={{ marginTop: '12px' }}>
              <span className="font-bold text-xl block" style={{ marginBottom: '-12px' }}>
                <span className="text-[#1e3a5f]">Go</span><span className="text-primary-500">Marts</span>
              </span>
              <span className="text-[9px] text-gray-400 font-medium tracking-wide">Shop Easy. Go Fast.</span>
            </div>
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
            <div className="flex justify-end">
              <Link to="/auth/forgot-password" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                Forgot Password?
              </Link>
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
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'', phone:'', storeName:'', storeDescription:'', contactPhone:'', gstNumber:'', fssaiNumber:'', bankAccountName:'', bankAccountNumber:'', bankIfsc:'', bankName:'' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpTimer, setOtpTimer] = useState(0)

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  React.useEffect(() => {
    if (otpTimer > 0) {
      const t = setTimeout(() => setOtpTimer(otpTimer - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [otpTimer])

  const sendOtp = async () => {
    if (!form.email) return toast.error('Enter your email first')
    setOtpSending(true)
    try {
      await api.post('/auth/send-otp', { email: form.email, purpose: 'registration' })
      toast.success('OTP sent to your email!')
      setOtpStep(true)
      setOtpTimer(60)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send OTP')
    } finally { setOtpSending(false) }
  }

  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) return toast.error('Enter 6-digit OTP')
    try {
      await api.post('/auth/verify-otp', { email: form.email, code: otp })
      toast.success('Email verified!')
      setOtpVerified(true)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid OTP')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpVerified) return toast.error('Please verify your email first')
    if (!form.phone.trim()) return toast.error('Phone number is required')
    setLoading(true)
    try {
      await register({ ...form, role: 'customer' })
      toast.success('Account created!')
      navigate('/')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-1 mb-2">
            <img src="/logo.png" alt="GoMarts" className="h-14 w-14 object-contain" />
            <div className="hidden sm:block" style={{ marginTop: '12px' }}>
              <span className="font-bold text-xl block" style={{ marginBottom: '-12px' }}>
                <span className="text-[#1e3a5f]">Go</span><span className="text-primary-500">Marts</span>
              </span>
              <span className="text-[9px] text-gray-400 font-medium tracking-wide">Shop Easy. Go Fast.</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-gray-500 text-sm mt-1">Join thousands of shoppers</p>
        </div>

        <div className="card p-8">
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
                <input type="email" required value={form.email} onChange={e => { set('email', e.target.value); setOtpVerified(false); setOtpStep(false) }} placeholder="you@example.com" className="input pl-9 pr-24 text-sm" disabled={otpVerified} />
                {!otpVerified ? (
                  <button type="button" onClick={sendOtp} disabled={otpSending || otpTimer > 0}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-medium px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg disabled:opacity-50 transition-colors">
                    {otpSending ? '...' : otpTimer > 0 ? `${otpTimer}s` : 'Send OTP'}
                  </button>
                ) : (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600 font-medium">✓ Verified</span>
                )}
              </div>
              {otpStep && !otpVerified && (
                <div className="mt-2 flex gap-2">
                  <input type="text" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP" className="input text-sm flex-1 text-center tracking-widest font-mono" />
                  <button type="button" onClick={verifyOtp} className="btn-primary text-xs px-4">Verify</button>
                </div>
              )}
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
            <div>
              <label className="label">Phone Number *</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="tel" required value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="9876543210" className="input pl-9 text-sm" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base mt-2">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-primary-600 font-semibold hover:text-primary-700">Sign in</Link>
          </p>
          <p className="text-center text-sm text-gray-500 mt-2">
            Want to sell on GoMarts?{' '}
            <Link to="/auth/register/vendor" className="text-primary-600 font-semibold hover:text-primary-700">Register as Seller</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export function VendorRegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'', phone:'', storeName:'', storeDescription:'', contactPhone:'', gstNumber:'', fssaiNumber:'', bankAccountName:'', bankAccountNumber:'', bankIfsc:'', bankName:'' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpTimer, setOtpTimer] = useState(0)

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  React.useEffect(() => {
    if (otpTimer > 0) {
      const t = setTimeout(() => setOtpTimer(otpTimer - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [otpTimer])

  const sendOtp = async () => {
    if (!form.email) return toast.error('Enter your email first')
    setOtpSending(true)
    try {
      await api.post('/auth/send-otp', { email: form.email, purpose: 'registration' })
      toast.success('OTP sent to your email!')
      setOtpStep(true)
      setOtpTimer(60)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send OTP')
    } finally { setOtpSending(false) }
  }

  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) return toast.error('Enter 6-digit OTP')
    try {
      await api.post('/auth/verify-otp', { email: form.email, code: otp })
      toast.success('Email verified!')
      setOtpVerified(true)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid OTP')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpVerified) return toast.error('Please verify your email first')
    if (!form.contactPhone.trim()) return toast.error('Phone number is required')
    if (!form.storeName.trim()) return toast.error('Store name is required')
    setLoading(true)
    try {
      await register({ ...form, role: 'vendor', description: form.storeDescription })
      toast.success('Seller account created! Pending approval.')
      navigate('/vendor')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-1 mb-2">
            <img src="/logo.png" alt="GoMarts" className="h-14 w-14 object-contain" />
            <div className="hidden sm:block" style={{ marginTop: '12px' }}>
              <span className="font-bold text-xl block" style={{ marginBottom: '-12px' }}>
                <span className="text-[#1e3a5f]">Go</span><span className="text-primary-500">Marts</span>
              </span>
              <span className="text-[9px] text-gray-400 font-medium tracking-wide">Shop Easy. Go Fast.</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">🏪 Start Selling</h1>
          <p className="text-gray-500 text-sm mt-1">Register as a vendor on GoMarts</p>
        </div>

        <div className="card p-8">
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
                <input type="email" required value={form.email} onChange={e => { set('email', e.target.value); setOtpVerified(false); setOtpStep(false) }} placeholder="you@example.com" className="input pl-9 pr-24 text-sm" disabled={otpVerified} />
                {!otpVerified ? (
                  <button type="button" onClick={sendOtp} disabled={otpSending || otpTimer > 0}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-medium px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg disabled:opacity-50 transition-colors">
                    {otpSending ? '...' : otpTimer > 0 ? `${otpTimer}s` : 'Send OTP'}
                  </button>
                ) : (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600 font-medium">✓ Verified</span>
                )}
              </div>
              {otpStep && !otpVerified && (
                <div className="mt-2 flex gap-2">
                  <input type="text" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP" className="input text-sm flex-1 text-center tracking-widest font-mono" />
                  <button type="button" onClick={verifyOtp} className="btn-primary text-xs px-4">Verify</button>
                </div>
              )}
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
            <div>
              <label className="label">Phone Number *</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="tel" required value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} placeholder="9876543210" className="input pl-9 text-sm" />
              </div>
            </div>
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
            <div>
              <label className="label">GST Number</label>
              <div className="relative">
                <FileText size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={form.gstNumber} onChange={e => set('gstNumber', e.target.value)} placeholder="22AAAAA0000A1Z5" className="input pl-9 text-sm" />
              </div>
            </div>
            <div>
              <label className="label">FSSAI Number</label>
              <div className="relative">
                <FileText size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={form.fssaiNumber} onChange={e => set('fssaiNumber', e.target.value)} placeholder="12345678901234" className="input pl-9 text-sm" />
              </div>
              <p className="text-xs text-gray-400 mt-1">Required for food vendors</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5"><Building2 size={14} className="text-gray-400" /> Bank Details <span className="text-xs text-gray-400 font-normal">(optional)</span></p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Account Name</label>
                  <input value={form.bankAccountName} onChange={e => set('bankAccountName', e.target.value)} placeholder="Account holder name" className="input text-sm" />
                </div>
                <div>
                  <label className="label text-xs">Account Number</label>
                  <input value={form.bankAccountNumber} onChange={e => set('bankAccountNumber', e.target.value)} placeholder="1234567890" className="input text-sm" />
                </div>
                <div>
                  <label className="label text-xs">IFSC Code</label>
                  <input value={form.bankIfsc} onChange={e => set('bankIfsc', e.target.value)} placeholder="SBIN0001234" className="input text-sm" />
                </div>
                <div>
                  <label className="label text-xs">Bank Name</label>
                  <input value={form.bankName} onChange={e => set('bankName', e.target.value)} placeholder="State Bank of India" className="input text-sm" />
                </div>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base mt-2">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Register as Seller'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-primary-600 font-semibold hover:text-primary-700">Sign in</Link>
          </p>
          <p className="text-center text-sm text-gray-500 mt-2">
            Want to shop instead?{' '}
            <Link to="/auth/register" className="text-primary-600 font-semibold hover:text-primary-700">Register as Customer</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setNotFound(false)
    try {
      await api.post('/auth/forgot-password', { email })
      setSubmitted(true)
    } catch (err: any) {
      if (err.response?.status === 404) {
        setNotFound(true)
      } else {
        toast.error(err.response?.data?.message || 'Something went wrong')
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-1 mb-2">
            <img src="/logo.png" alt="GoMarts" className="h-14 w-14 object-contain" />
            <div className="hidden sm:block" style={{ marginTop: '12px' }}>
              <span className="font-bold text-xl block" style={{ marginBottom: '-12px' }}>
                <span className="text-[#1e3a5f]">Go</span><span className="text-primary-500">Marts</span>
              </span>
              <span className="text-[9px] text-gray-400 font-medium tracking-wide">Shop Easy. Go Fast.</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
          <p className="text-gray-500 text-sm mt-1">We'll send you a link to reset your password</p>
        </div>

        <div className="card p-8">
          {submitted ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h3>
              <p className="text-sm text-gray-500 mb-6">
                We've sent a password reset link to <span className="font-medium text-gray-700">{email}</span>
              </p>
              <Link to="/auth/login" className="btn-primary inline-flex items-center gap-2 justify-center py-2.5 px-6">
                <ArrowLeft size={16} /> Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              {notFound && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  No account found with this email.{' '}
                  <Link to="/auth/register" className="font-semibold text-primary-600 hover:text-primary-700 underline">
                    Create a new account
                  </Link>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="label">Email address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      placeholder="you@example.com" className="input pl-10" />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Send Reset Link'}
                </button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-4">
                <Link to="/auth/login" className="text-primary-600 font-semibold hover:text-primary-700 inline-flex items-center gap-1">
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, newPassword })
      setSuccess(true)
      toast.success('Password reset successfully!')
      setTimeout(() => navigate('/auth/login'), 3000)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reset password')
    } finally { setLoading(false) }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="card p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Reset Link</h2>
            <p className="text-sm text-gray-500 mb-6">This password reset link is invalid or has expired.</p>
            <Link to="/auth/forgot-password" className="btn-primary inline-flex items-center gap-2 justify-center py-2.5 px-6">
              Request a new link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-1 mb-2">
             <img src="/logo.png" alt="GoMarts" className="h-14 w-14 object-contain" />
            <div className="hidden sm:block" style={{ marginTop: '12px' }}>
              <span className="font-bold text-xl block" style={{ marginBottom: '-12px' }}>
                <span className="text-[#1e3a5f]">Go</span><span className="text-primary-500">Marts</span>
              </span>
              <span className="text-[9px] text-gray-400 font-medium tracking-wide">Shop Easy. Go Fast.</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
          <p className="text-gray-500 text-sm mt-1">Enter your new password below</p>
        </div>

        <div className="card p-8">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Password reset!</h3>
              <p className="text-sm text-gray-500 mb-6">
                Your password has been updated. Redirecting to login...
              </p>
              <Link to="/auth/login" className="btn-primary inline-flex items-center gap-2 justify-center py-2.5 px-6">
                <ArrowLeft size={16} /> Go to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPass ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                    minLength={6} placeholder="Min 6 characters" className="input pl-10 pr-10" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPass ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                    minLength={6} placeholder="Repeat your password" className="input pl-10" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
