import React, { useState, useContext } from 'react'
import { DynamicSEO } from '../components/common/DynamicSEO'
import Link from 'next/link'
import { useWishlist, useToast } from '../context'
import { ProductCard } from '../components/products/ProductCard'
import { ProductCardSkeleton } from '../components/products/ProductCardSkeleton'
import { ProductDetail } from '../components/products/ProductDetail'
import { CartContext } from '../context/CartContext'
import { Heart, ShoppingBag, Trash2, ArrowLeft, PlusCircle } from 'lucide-react'
import { Breadcrumbs } from '../components/common/Breadcrumbs'
import { ShopifyProductNode } from '../services/shopify'

export default function WishlistPage() {
  const { wishlist, clearWishlist, totalItems, isLoaded } = useWishlist()
  const { showSuccess } = useToast()
  const cart = useContext(CartContext)
  const [selectedProductHandle, setSelectedProductHandle] = useState<string | null>(null)
  const [quickAddingId, setQuickAddingId] = useState<string | null>(null)
  const [addedItemHandle, setAddedItemHandle] = useState<string | null>(null)
  const [isAddingAll, setIsAddingAll] = useState<boolean>(false)

  const handleQuickAddToCart = async (product: ShopifyProductNode, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!cart || !product) return

    setQuickAddingId(product.id)
    try {
      const firstVariant = product.variants?.edges?.[0]?.node
      const variantId = firstVariant?.id || product.id
      const price = firstVariant?.price?.amount || product.priceRange.minVariantPrice.amount
      const currency = firstVariant?.price?.currencyCode || product.priceRange.minVariantPrice.currencyCode
      const comparePrice =
        firstVariant?.compareAtPrice?.amount || product.compareAtPriceRange?.minVariantPrice?.amount
      const imageUrl = product.featuredImage?.url || product.images?.edges?.[0]?.node?.url

      await cart.addItem({
        variantId,
        quantity: 1,
        title: product.title,
        handle: product.handle,
        variantTitle: firstVariant?.title,
        price: { amount: price, currencyCode: currency },
        compareAtPrice: comparePrice ? { amount: comparePrice, currencyCode: currency } : null,
        image: imageUrl || null,
        vendor: product.vendor,
      })

      setAddedItemHandle(product.handle)
      setTimeout(() => {
        setAddedItemHandle(null)
      }, 1500)
    } catch (err) {
      console.warn('Quick add to cart error:', err)
    } finally {
      setQuickAddingId(null)
    }
  }

  const handleAddAllToCart = async () => {
    if (!cart || wishlist.length === 0) return
    setIsAddingAll(true)
    try {
      for (const product of wishlist) {
        const firstVariant = product.variants?.edges?.[0]?.node
        const variantId = firstVariant?.id || product.id
        const price = firstVariant?.price?.amount || product.priceRange.minVariantPrice.amount
        const currency = firstVariant?.price?.currencyCode || product.priceRange.minVariantPrice.currencyCode
        const comparePrice =
          firstVariant?.compareAtPrice?.amount || product.compareAtPriceRange?.minVariantPrice?.amount
        const imageUrl = product.featuredImage?.url || product.images?.edges?.[0]?.node?.url

        await cart.addItem({
          variantId,
          quantity: 1,
          title: product.title,
          handle: product.handle,
          variantTitle: firstVariant?.title,
          price: { amount: price, currencyCode: currency },
          compareAtPrice: comparePrice ? { amount: comparePrice, currencyCode: currency } : null,
          image: imageUrl || null,
          vendor: product.vendor,
        })
      }

      showSuccess('All items added to shopping bag', `${wishlist.length} products moved to your shopping bag.`, {
        action: {
          label: 'View Bag',
          onClick: () => cart.openCart(),
        },
      })
    } catch (err) {
      console.warn('Add all to cart notice:', err)
    } finally {
      setIsAddingAll(false)
    }
  }

  return (
    <div id="wishlist-page-container" className="min-h-screen bg-neutral-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <DynamicSEO
        title="My Wishlist | DisplayCellPros"
        description="View and manage your saved smartphone screens, repair parts, and components."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Wishlist', href: '/wishlist' },
        ]}
      />

      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Breadcrumbs
            id="wishlist-breadcrumbs"
            items={[
              { label: 'Home', href: '/' },
              { label: 'Wishlist', href: '/wishlist' },
            ]}
          />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                <Heart className="w-7 h-7 fill-current" />
              </span>
              My Saved Wishlist
            </h1>
            <p className="text-neutral-600 text-sm mt-1">
              {!isLoaded
                ? 'Loading your saved items...'
                : `${totalItems} ${totalItems === 1 ? 'item' : 'items'} saved in local storage`}
            </p>
          </div>

          {isLoaded && totalItems > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                id="wishlist-add-all-btn"
                onClick={handleAddAllToCart}
                disabled={isAddingAll}
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isAddingAll ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <ShoppingBag className="w-4 h-4" />
                )}
                <span>Add All to Bag</span>
              </button>

              <button
                id="wishlist-clear-btn"
                onClick={clearWishlist}
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Clear Wishlist
              </button>
            </div>
          )}
        </div>

        {!isLoaded ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[0, 1, 2, 3].map((idx) => (
              <ProductCardSkeleton key={idx} index={idx} />
            ))}
          </div>
        ) : totalItems === 0 ? (
          <div
            id="wishlist-empty-state"
            className="bg-white rounded-2xl border border-neutral-200/80 p-12 text-center max-w-lg mx-auto shadow-xs"
          >
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Your wishlist is empty</h2>
            <p className="text-neutral-500 text-sm mb-6">
              Browse our catalog and tap the heart icon on any product card to save items to your wishlist.
            </p>
            <Link
              id="wishlist-explore-catalog-btn"
              href="/products"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-xl transition-all shadow-md hover:shadow-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              Explore Catalog
            </Link>
          </div>
        ) : (
          <div
            id="wishlist-products-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {wishlist.map((product, index) => (
              <div key={product.id} className="relative group">
                <ProductCard
                  product={product}
                  index={index}
                  isAddingToCart={quickAddingId === product.id}
                  isAdded={addedItemHandle === product.handle}
                  onQuickAddToCart={(p, e) => handleQuickAddToCart(p, e)}
                  onProductClick={(p, e) => {
                    if (e && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
                      e.preventDefault()
                    }
                    setSelectedProductHandle(p.handle)
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Quick View Modal for saved products */}
        {selectedProductHandle && (
          <ProductDetail
            handle={selectedProductHandle}
            asModal={true}
            isOpen={Boolean(selectedProductHandle)}
            onClose={() => setSelectedProductHandle(null)}
          />
        )}
      </div>
    </div>
  )
}
