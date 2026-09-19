import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { ShopifyProductNode } from '../services/shopify'
import { useAnnouncer } from '../components/common/Announcer'
import { useToast } from './ToastContext'

interface WishlistContextType {
  wishlist: ShopifyProductNode[]
  addToWishlist: (product: ShopifyProductNode) => void
  removeFromWishlist: (productId: string) => void
  toggleWishlist: (product: ShopifyProductNode) => void
  isInWishlist: (productId: string) => boolean
  clearWishlist: () => void
  totalItems: number
  isLoaded: boolean
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

const WISHLIST_STORAGE_KEY = 'displaycell_wishlist'

export const WishlistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [wishlist, setWishlist] = useState<ShopifyProductNode[]>([])
  const [isLoaded, setIsLoaded] = useState<boolean>(false)
  const { announce } = useAnnouncer()
  const { showWishlistToast, showInfo } = useToast()

  // Hydrate from localStorage once mounted on client
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setWishlist(parsed)
        }
      }
    } catch (e) {
      console.warn('Failed to load wishlist from localStorage:', e)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Synchronize across browser tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === WISHLIST_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (Array.isArray(parsed)) {
            setWishlist(parsed)
          }
        } catch (e) {
          console.warn('Failed to sync wishlist from storage event:', e)
        }
      } else if (e.key === WISHLIST_STORAGE_KEY && !e.newValue) {
        setWishlist([])
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Persist to localStorage when wishlist changes (only after initial hydration)
  useEffect(() => {
    if (!isLoaded) return
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist))
    } catch (e) {
      console.warn('Failed to save wishlist to localStorage:', e)
    }
  }, [wishlist, isLoaded])

  const isInWishlist = useCallback(
    (productId: string) => {
      return wishlist.some((item) => item.id === productId)
    },
    [wishlist]
  )

  const addToWishlist = useCallback(
    (product: ShopifyProductNode) => {
      if (!isInWishlist(product.id)) {
        setWishlist((prev) => [product, ...prev])
        announce(`Added ${product.title} to wishlist`, 'polite')
        showWishlistToast({
          product,
          actionType: 'added',
        })
      }
    },
    [isInWishlist, announce, showWishlistToast]
  )

  const removeFromWishlist = useCallback(
    (productId: string) => {
      const itemToRemove = wishlist.find((item) => item.id === productId)
      if (itemToRemove) {
        setWishlist((prev) => prev.filter((item) => item.id !== productId))
        announce(`Removed ${itemToRemove.title} from wishlist`, 'polite')
        showWishlistToast({
          product: itemToRemove,
          actionType: 'removed',
          onUndo: () => addToWishlist(itemToRemove),
        })
      }
    },
    [wishlist, announce, showWishlistToast, addToWishlist]
  )

  const toggleWishlist = useCallback(
    (product: ShopifyProductNode) => {
      if (isInWishlist(product.id)) {
        removeFromWishlist(product.id)
      } else {
        addToWishlist(product)
      }
    },
    [isInWishlist, removeFromWishlist, addToWishlist]
  )

  const clearWishlist = useCallback(() => {
    setWishlist([])
    announce('Wishlist cleared', 'polite')
    showInfo('Wishlist cleared', 'All saved products have been removed.')
  }, [announce, showInfo])

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isInWishlist,
        clearWishlist,
        totalItems: wishlist.length,
        isLoaded,
      }}
    >
      {children}
    </WishlistContext.Provider>
  )
}

export const useWishlist = () => {
  const context = useContext(WishlistContext)
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider')
  }
  return context
}

export default WishlistProvider
