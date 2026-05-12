import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Store, Star, Package } from 'lucide-react'
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
        <div className="h-48 bg-gray-200 rounded-2xl mb-8 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_,i) => <ProductCardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  if (!vendor) return (
    <div className="page-container py-16 text-center">
      <h2 className="text-xl font-bold text-gray-600">Vendor not found</h2>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Store header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-700 text-white">
        <div className="page-container py-12">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-glow flex-shrink-0">
              {vendor.logo_url ? <img src={vendor.logo_url} alt="" className="w-full h-full object-cover rounded-2xl" /> : vendor.store_name[0]}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{vendor.store_name}</h1>
              <p className="text-gray-300 mt-1 max-w-lg">{vendor.description || 'Welcome to our store'}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                <span className="flex items-center gap-1"><Package size={14} /> {pagination.total} Products</span>
                <span className="flex items-center gap-1"><Star size={14} className="fill-amber-400 text-amber-400" /> 4.5 Rating</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="page-container py-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">All Products</h2>
        {products.length === 0 ? (
          <EmptyState icon={<Package size={48} />} title="No products yet" description="This vendor hasn't listed any products." />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
            <Pagination page={pagination.page} pages={pagination.pages} onChange={loadPage} />
          </>
        )}
      </div>
    </div>
  )
}
