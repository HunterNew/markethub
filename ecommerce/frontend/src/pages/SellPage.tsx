import React from 'react'
import { Link } from 'react-router-dom'
import { Store, TrendingUp, Shield, Truck, Users, DollarSign, BarChart2, Package, Zap, CheckCircle } from 'lucide-react'

export default function SellPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-700/20 rounded-full blur-3xl" />
        </div>
        {/* Logo nav */}
        <div className="relative page-container pt-6" style={{marginLeft:'5%', zIndex: 50}}>
          <Link to="/" className="flex items-center gap-1.5 flex-shrink-0 relative z-50">
            <img src="/logo.png" alt="GoMarts" className="h-14 w-14 object-contain" />
            <div className="hidden sm:block" style={{ marginTop: '12px' }}>
              <span className="font-bold text-xl block" style={{ marginBottom: '-12px' }}>
                <span className="text-[#1e3a5f]">Go</span><span className="text-primary-500">Marts</span>
              </span>
              <span className="text-[9px] text-gray-400 font-medium tracking-wide">Shop Easy. Go Fast.</span>
            </div>
          </Link>
        </div>
        <div className="relative page-container py-16 sm:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary-500/20 border border-primary-500/30 rounded-full px-4 py-1.5 text-sm text-primary-300 font-medium mb-6">
              <Zap size={14} /> Join 2000+ sellers growing with GoMarts
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Sell Online with <span className="text-primary-400">Zero Hassle</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Start your online business today. Reach thousands of customers, manage orders easily, and grow your revenue — all from one dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth/register/vendor" className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-4 rounded-xl text-lg font-bold transition-colors shadow-lg shadow-primary-500/25">
                Start Selling Free →
              </Link>
              <a href="#how-it-works" className="border border-white/20 hover:bg-white/10 text-white px-8 py-4 rounded-xl text-lg font-medium transition-colors">
                How It Works
              </a>
            </div>
            <p className="text-sm text-gray-400 mt-4">No monthly fees. No setup cost. Pay only when you sell.</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-b border-gray-100">
        <div className="page-container">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: '50K+', label: 'Products Listed' },
              { value: '2K+', label: 'Active Sellers' },
              { value: '1L+', label: 'Monthly Orders' },
              { value: '₹5Cr+', label: 'Seller Earnings' },
            ].map(s => (
              <div key={s.label}>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Sell on GoMarts */}
      <section className="py-16 sm:py-20">
        <div className="page-container">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-4">Why Sell on GoMarts?</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Everything you need to run a successful online business, built right in.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <DollarSign size={24} />, title: 'Low Commission', desc: 'Industry-lowest commission rates. Keep more of what you earn.', color: 'bg-green-50 text-green-600' },
              { icon: <Users size={24} />, title: 'Huge Customer Base', desc: 'Access thousands of active buyers ready to purchase your products.', color: 'bg-blue-50 text-blue-600' },
              { icon: <Truck size={24} />, title: 'Easy Shipping', desc: 'We handle logistics. Just pack and ship — or use our delivery partners.', color: 'bg-purple-50 text-purple-600' },
              { icon: <BarChart2 size={24} />, title: 'Powerful Dashboard', desc: 'Track orders, revenue, reviews, and analytics in real-time.', color: 'bg-orange-50 text-orange-600' },
              { icon: <Shield size={24} />, title: 'Secure Payments', desc: 'Get paid on time, every time. Multiple payout options available.', color: 'bg-indigo-50 text-indigo-600' },
              { icon: <TrendingUp size={24} />, title: 'Marketing Tools', desc: 'Create offers, coupons, and run promotions to boost your sales.', color: 'bg-pink-50 text-pink-600' },
            ].map(f => (
              <div key={f.title} className="border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:border-gray-200 transition-all">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>{f.icon}</div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 sm:py-20 bg-gray-50">
        <div className="page-container">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-4">Start Selling in 3 Steps</h2>
            <p className="text-gray-500">It takes less than 5 minutes to set up your store.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '1', title: 'Register Free', desc: 'Create your seller account with basic details. No documents needed to start.' },
              { step: '2', title: 'List Products', desc: 'Add your products with photos, pricing, and descriptions. Bulk upload via CSV.' },
              { step: '3', title: 'Start Earning', desc: 'Receive orders, ship them, and get paid directly to your bank account.' },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 bg-primary-500 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg shadow-primary-500/25">
                  {s.step}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Detail */}
      <section className="py-16 sm:py-20">
        <div className="page-container">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-4">Seller Tools & Features</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {[
              'Vendor Dashboard with real-time analytics',
              'Product management with variants & images',
              'Offer & discount management (% based)',
              'Coupon code creation',
              'Order management & invoice generation',
              'Customer reviews & ratings',
              'Earnings tracking & bank withdrawals',
              'WhatsApp support & notifications',
              'Return policy control (enable/disable)',
              'COD enable/disable per vendor',
              'CSV bulk product import',
              'Custom store page for your brand',
            ].map(f => (
              <div key={f} className="flex items-center gap-3 py-3">
                <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="page-container">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-4">What Our Sellers Say</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { name: 'Rahul S.', store: 'TechGadgets Store', quote: 'Grew my electronics business 3x in 6 months. The dashboard makes it so easy to manage everything.' },
              { name: 'Priya M.', store: 'Fashion Boutique', quote: 'Best platform for small sellers. Low commission and the customer reach is amazing.' },
              { name: 'Amit K.', store: 'Home Essentials', quote: 'The CSV import saved me hours. Listed 200 products in minutes. Highly recommend!' },
            ].map(t => (
              <div key={t.name} className="bg-white border border-gray-100 rounded-2xl p-6">
                <p className="text-sm text-gray-600 italic mb-4">"{t.quote}"</p>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.store}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="page-container">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-3xl p-8 sm:p-12 text-center text-white">
            <Store size={40} className="mx-auto mb-4 opacity-80" />
            <h2 className="text-2xl sm:text-4xl font-bold mb-4">Ready to Start Selling?</h2>
            <p className="text-white/80 max-w-xl mx-auto mb-8">Join thousands of sellers already growing their business on GoMarts. Registration is free and takes 2 minutes.</p>
            <Link to="/auth/register/vendor" className="inline-block bg-white text-primary-600 px-8 py-4 rounded-xl text-lg font-bold hover:bg-gray-100 transition-colors shadow-lg">
              Create Seller Account — It's Free
            </Link>
            <p className="text-sm text-white/60 mt-4">No credit card required • No monthly fees • Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="page-container max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: 'Is it free to register as a seller?', a: 'Yes! Registration is completely free. You only pay a small commission when you make a sale.' },
              { q: 'What commission does GoMarts charge?', a: 'Our commission rates are industry-lowest, starting from 5-10% depending on the category.' },
              { q: 'How do I receive payments?', a: 'Payments are transferred directly to your bank account. You can request withdrawals anytime from your dashboard.' },
              { q: 'Can I sell any product?', a: 'You can sell products in any approved category. If your category doesn\'t exist, you can request a new one.' },
              { q: 'Do I need GST to sell?', a: 'GST is optional for registration but recommended. You can add it later from your profile.' },
              { q: 'How does shipping work?', a: 'You handle shipping for now. Pack the order, print the invoice from your dashboard, and ship it to the customer.' },
            ].map((faq, i) => (
              <details key={i} className="bg-white border border-gray-100 rounded-xl overflow-hidden group">
                <summary className="px-6 py-4 cursor-pointer font-medium text-gray-900 flex items-center justify-between hover:bg-gray-50">
                  {faq.q}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 text-gray-400 group-open:rotate-180 transition-transform"><path d="M6 9l6 6 6-6"/></svg>
                </summary>
                <p className="px-6 pb-4 text-sm text-gray-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-8 border-t border-gray-100">
        <div className="page-container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="GoMarts" className="h-8 w-8 object-contain" />
            <span className="font-bold text-lg"><span className="text-[#1e3a5f]">Go</span><span className="text-primary-500">Marts</span></span>
          </div>
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} GoMarts. All rights reserved.</p>
          <Link to="/auth/register/vendor" className="btn-primary text-sm">Start Selling</Link>
        </div>
      </section>
    </div>
  )
}
