import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import api from '../api/client'
import { useAuth } from './AuthContext'

interface CartItem {
  id: number
  product_id: number
  name: string
  unit_price: number
  quantity: number
  stock_quantity: number
  primary_image?: string
  store_name?: string
  offer_price?: number
  is_on_sale?: boolean
  retail_price?: number
  wholesale_price?: number
  wholesale_min_qty?: number
  wholesale_enabled?: boolean
  variant_id?: number | null
  option_combination?: Record<string, string> | null
}

interface GuestCartItem {
  productId: number
  quantity: number
  variantId?: number
}

interface CartContextType {
  items: CartItem[]
  total: number
  itemCount: number
  loading: boolean
  addToCart: (productId: number, quantity?: number, variantId?: number) => Promise<void>
  updateQuantity: (itemId: number, quantity: number) => Promise<void>
  removeItem: (itemId: number) => Promise<void>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>
}

const GUEST_CART_KEY = 'guest_cart'
const CartContext = createContext<CartContextType | null>(null)

function getGuestCart(): GuestCartItem[] {
  try { return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]') }
  catch { return [] }
}

function saveGuestCart(items: GuestCartItem[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items))
}

function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY)
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  // Fetch product details for guest cart items
  const loadGuestCart = useCallback(async () => {
    const guestItems = getGuestCart()
    if (guestItems.length === 0) { setItems([]); setTotal(0); return }

    try {
      const results: CartItem[] = []
      for (const g of guestItems) {
        try {
          const res = await api.get(`/products/${g.productId}`)
          const p = res.data.product
          if (p) {
            // Find the selected variant if variantId is stored
            let selectedVariant: any = null
            if (g.variantId && p.variants?.length > 0) {
              selectedVariant = p.variants.find((v: any) => v.id === g.variantId)
            }

            const variantStock = selectedVariant ? selectedVariant.stock_quantity : p.stock_quantity
            const qty = Math.min(g.quantity, variantStock)
            const basePrice = selectedVariant ? Number(selectedVariant.price) : Number(p.price)

            // Apply wholesale price if eligible
            let unitPrice = p.is_on_sale && p.offer_price && !selectedVariant ? Number(p.offer_price) : basePrice
            if (p.wholesale_enabled && p.wholesale_price && p.wholesale_min_qty && qty >= p.wholesale_min_qty) {
              if (selectedVariant && Number(p.price) > 0) {
                const discountRatio = Number(p.wholesale_price) / Number(p.price)
                unitPrice = Math.round(basePrice * discountRatio * 100) / 100
              } else if (!selectedVariant) {
                unitPrice = Number(p.wholesale_price)
              }
            }

            results.push({
              id: g.variantId ? g.productId * 10000 + g.variantId : g.productId,
              product_id: g.productId,
              name: p.name,
              unit_price: unitPrice,
              quantity: qty,
              stock_quantity: variantStock,
              primary_image: p.images?.[0]?.image_url || p.primary_image,
              store_name: p.store_name,
              offer_price: p.offer_price,
              is_on_sale: p.is_on_sale,
              retail_price: basePrice,
              wholesale_price: p.wholesale_price ? Number(p.wholesale_price) : undefined,
              wholesale_min_qty: p.wholesale_min_qty,
              wholesale_enabled: p.wholesale_enabled,
              variant_id: g.variantId || null,
              option_combination: selectedVariant?.option_combination || null,
            })
          }
        } catch { /* product not found, skip */ }
      }
      setItems(results)
      setTotal(results.reduce((sum, i) => sum + i.unit_price * i.quantity, 0))
    } catch { setItems([]); setTotal(0) }
  }, [])

  // Sync guest cart to server after login
  const syncGuestCartToServer = useCallback(async () => {
    const guestItems = getGuestCart()
    if (guestItems.length === 0) return
    for (const g of guestItems) {
      try { await api.post('/cart/items', { productId: g.productId, quantity: g.quantity, ...(g.variantId ? { variantId: g.variantId } : {}) }) }
      catch { /* ignore errors for individual items */ }
    }
    clearGuestCart()
  }, [])

  const refreshCart = useCallback(async () => {
    if (user && user.role === 'customer') {
      try {
        const res = await api.get('/cart')
        setItems(res.data.items || [])
        setTotal(parseFloat(res.data.total || '0'))
      } catch { setItems([]); setTotal(0) }
    } else if (!user) {
      await loadGuestCart()
    } else {
      setItems([]); setTotal(0)
    }
  }, [user, loadGuestCart])

  // On user change: sync guest cart then refresh
  useEffect(() => {
    if (user && user.role === 'customer') {
      syncGuestCartToServer().then(() => refreshCart())
    } else {
      refreshCart()
    }
  }, [user])

  const addToCart = async (productId: number, quantity = 1, variantId?: number) => {
    setLoading(true)
    try {
      if (user && user.role === 'customer') {
        await api.post('/cart/items', { productId, quantity, ...(variantId != null ? { variantId } : {}) })
        await refreshCart()
      } else {
        // Guest: store in localStorage with variant support
        const guest = getGuestCart()
        const existing = guest.find(g => g.productId === productId && (g.variantId || null) === (variantId || null))
        if (existing) {
          existing.quantity += quantity
        } else {
          guest.push({ productId, quantity, ...(variantId ? { variantId } : {}) })
        }
        saveGuestCart(guest)
        await loadGuestCart()
      }
    } finally { setLoading(false) }
  }

  const updateQuantity = async (itemId: number, quantity: number) => {
    setLoading(true)
    try {
      if (user && user.role === 'customer') {
        await api.put(`/cart/items/${itemId}`, { quantity })
        await refreshCart()
      } else {
        const guest = getGuestCart()
        // Find by composite id: productId * 10000 + variantId, or just productId
        const item = guest.find(g => {
          const gId = g.variantId ? g.productId * 10000 + g.variantId : g.productId
          return gId === itemId
        })
        if (item) {
          if (quantity <= 0) {
            const filtered = guest.filter(g => {
              const gId = g.variantId ? g.productId * 10000 + g.variantId : g.productId
              return gId !== itemId
            })
            saveGuestCart(filtered)
          } else {
            item.quantity = quantity
            saveGuestCart(guest)
          }
        }
        await loadGuestCart()
      }
    } finally { setLoading(false) }
  }

  const removeItem = async (itemId: number) => {
    setLoading(true)
    try {
      if (user && user.role === 'customer') {
        await api.delete(`/cart/items/${itemId}`)
        await refreshCart()
      } else {
        const filtered = getGuestCart().filter(g => {
          const gId = g.variantId ? g.productId * 10000 + g.variantId : g.productId
          return gId !== itemId
        })
        saveGuestCart(filtered)
        await loadGuestCart()
      }
    } finally { setLoading(false) }
  }

  const clearCart = async () => {
    setLoading(true)
    try {
      if (user && user.role === 'customer') {
        await api.delete('/cart')
      }
      clearGuestCart()
      setItems([])
      setTotal(0)
    } finally { setLoading(false) }
  }

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, total, itemCount, loading, addToCart, updateQuantity, removeItem, clearCart, refreshCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
