import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { useAuth } from './AuthContext'

interface WishlistContextType {
  wishlistIds: Set<number>
  count: number
  toggle: (productId: number) => Promise<void>
  isWishlisted: (productId: number) => boolean
  loading: boolean
}

const WishlistContext = createContext<WishlistContextType>({
  wishlistIds: new Set(),
  count: 0,
  toggle: async () => {},
  isWishlisted: () => false,
  loading: false,
})

const GUEST_KEY = 'guest_wishlist'

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)

  // Load wishlist IDs
  useEffect(() => {
    if (user) {
      setLoading(true)
      api.get('/wishlist/ids')
        .then(r => setWishlistIds(new Set(r.data.ids || [])))
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      try {
        const saved = JSON.parse(localStorage.getItem(GUEST_KEY) || '[]')
        setWishlistIds(new Set(saved))
      } catch { setWishlistIds(new Set()) }
    }
  }, [user])

  const toggle = useCallback(async (productId: number) => {
    const isIn = wishlistIds.has(productId)

    // Optimistic update
    setWishlistIds(prev => {
      const next = new Set(prev)
      if (isIn) next.delete(productId)
      else next.add(productId)
      return next
    })

    if (user) {
      try {
        if (isIn) await api.delete(`/wishlist/${productId}`)
        else await api.post('/wishlist', { productId })
      } catch {
        // Revert on failure
        setWishlistIds(prev => {
          const next = new Set(prev)
          if (isIn) next.add(productId)
          else next.delete(productId)
          return next
        })
      }
    } else {
      // Guest: save to localStorage
      const updated = isIn
        ? Array.from(wishlistIds).filter(id => id !== productId)
        : [...Array.from(wishlistIds), productId]
      localStorage.setItem(GUEST_KEY, JSON.stringify(updated))
    }
  }, [wishlistIds, user])

  const isWishlisted = useCallback((productId: number) => wishlistIds.has(productId), [wishlistIds])

  return (
    <WishlistContext.Provider value={{ wishlistIds, count: wishlistIds.size, toggle, isWishlisted, loading }}>
      {children}
    </WishlistContext.Provider>
  )
}

export const useWishlist = () => useContext(WishlistContext)
