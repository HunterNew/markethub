import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Store, Star, Package, MapPin, Phone, Shield, Mail, Award } from 'lucide-react'
import api from '../api/client'
import ProductCard from '../components/storefront/ProductCard'
import { Pagination, ProductCardSkeleton, EmptyState } from '../components/ui'

export default function VendorStorePage() {
  const { slug } = useParams<{ slug: string }>()
  const [vendor, setVendor] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/vendors/${slug}`).then(r => {
      const v = r.data.vendor
      setVendor(v)
      return api.get(`/products?vendorId=${v.id}&page=1`)
    }).then(r => {
      setProducts(r.data.products || [])
      setPagination(r.data.pagination || { page: 1, pages: 1, total: 0 })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [slug])

  const loadPage = async (page: number) => {
    const r = await api.get(`/products?vendorId=${vendor.id}&page=${page}`)
    setProducts(r.data.products || [])
    setPagination(r.data.pagination)
    window.scrollTo(0, 0)
  }

  if (loading) {
    return (
      <div className="page-container py-8">
        <div className="h-56 bg-gray-200 rounded-2xl mb-8 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_,i) => <ProductCardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  if (!vendor) return (
    <div className="page-container py-16 text-center">
      <h2 className="text-xl font-bold text-gray-600">Vendor not found</h2>
      <Link to="/products" className="btn-primary mt-4 inline-flex">Browse Products</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="relative h-44 sm:h-56 md:h-64 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
        {vendor.banner_url ? (
          <img src={vendor.banner_url} alt="" className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=400&fit=crop')] bg-cover bg-center opacity-30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
      </div>

      {/* Store Info Card - overlaps banner */}
      <div className="page-container -mt-20 relative z-10 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            {/* Logo */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl font-bold text-white shadow-lg flex-shrink-0 border-4 border-white -mt-12 sm:-mt-14">
              {vendor.logo_url ? (
                <img src={vendor.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : (
                vendor.store_name[0]
              )}
            </div>

            {/* Store Name & Status */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{vendor.store_name}</h1>
                {vendor.status === 'approved' && (
                  <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    <Shield size={10} /> Verified
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{vendor.description || 'Welcome to our store'}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                <span className="flex items-center gap-1"><Package size={12} /> {pagination.total} Products</span>
                <span className="flex items-center gap-1"><Star size={12} className="fill-amber-400 text-amber-400" /> 4.5 Rating</span>
                {vendor.gst_number && (
                  <span className="flex items-center gap-1"><Award size={12} /> GST Registered</span>
                )}
              </div>
            </div>
          </div>

          {/* Store Details */}
          <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {vendor.contact_phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone size={14} className="text-gray-400 flex-shrink-0" />
                <span>{vendor.contact_phone}</span>
              </div>
            )}
            {vendor.contact_email && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail size={14} className="text-gray-400 flex-shrink-0" />
                <span className="truncate">{vendor.contact_email}</span>
              </div>
            )}
            {vendor.gst_number && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Award size={14} className="text-gray-400 flex-shrink-0" />
                <span>GST: {vendor.gst_number}</span>
              </div>
            )}
            {vendor.fssai_number && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shield size={14} className="text-gray-400 flex-shrink-0" />
                <span>FSSAI: {vendor.fssai_number}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="page-container pb-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Products ({pagination.total})</h2>
        </div>
        {products.length === 0 ? (
          <EmptyState icon={<Package size={48} />} title="No products yet" description="This vendor hasn't listed any products." />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
            <Pagination page={pagination.page} pages={pagination.pages} onChange={loadPage} />
          </>
        )}
      </div>
    </div>
  )
}
