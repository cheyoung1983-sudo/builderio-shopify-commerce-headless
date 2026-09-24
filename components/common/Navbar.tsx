import React, { FC, useState, useEffect } from 'react'
import { BuilderComponent, builder } from '@builder.io/react'
import builderConfig from '@config/builder'
import { useCart } from '@lib/shopify/storefront-data-hooks'
import { useCart as useModernCart } from '../../context/CartContext'
import { useThemeUI } from 'theme-ui'
import { useUI } from '@components/common/context'
import Searchbar from './Searchbar'
import Link from '@components/common/Link'
import { Bag } from '@components/icons'
import { Menu, X, Heart } from 'lucide-react'
import { useWishlist } from '../../context'

const Navbar: FC = () => {
  const [announcement, setAnnouncement] = useState<any>()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme } = useThemeUI()
  const { navigationLinks, logo, openSidebar } = useUI()
  const activeLogo =
    logo && (logo.text)
      ? logo
      : {
          text: 'Display Cell Pros',
        }
  const cart = useCart()
  const modernCart = useModernCart()
  const cartCount =
    modernCart?.totalQuantity > 0
      ? modernCart.totalQuantity
      : (cart?.lineItems || []).reduce(
          (total: number, item: any) => total + (item.quantity || 1),
          0
        )
  const { totalItems: wishlistCount, isLoaded } = useWishlist()

  const itemHandles = (cart?.lineItems || [])
    .map((item: any) => item?.variant?.product?.handle)
    .filter(Boolean)
    .join(',')

  useEffect(() => {
    async function fetchContent() {
      if (!builderConfig.apiKey || !builderConfig.announcementModel) return
      try {
        const anouncementContent = await builder
          .get(builderConfig.announcementModel, {
            cacheSeconds: 120,
            userAttributes: {
              itemInCart: itemHandles ? itemHandles.split(',') : [],
            } as any,
          })
          .toPromise()
        if (anouncementContent) {
          setAnnouncement(anouncementContent)
        }
      } catch (e) {
        console.warn('Failed to fetch announcement-bar:', e)
      }
    }
    fetchContent()
  }, [itemHandles])

  return (
    <React.Fragment>
      {announcement && builderConfig.announcementModel && (
        <BuilderComponent
          content={announcement}
          data={{ theme }}
          model={builderConfig.announcementModel}
        />
      )}
      <header
        id="main-site-header"
        className="w-full bg-white/95 backdrop-blur-md border-b border-neutral-200/80 sticky top-0 z-40 transition-colors"
      >
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4 relative">
          {/* Left section: Hamburger (mobile) + Navigation Links (desktop) */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 min-w-0">
            {/* Mobile Hamburger Toggle Button */}
            <button
              id="mobile-menu-toggle-btn"
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 active:bg-neutral-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2" aria-label="Main Navigation">
              {navigationLinks && navigationLinks.length > 0 ? (
                <>
                  {navigationLinks.map((link, index) => (
                    <Link
                      key={index}
                      href={link.link || '//'}
                      className="px-2.5 py-1.5 text-sm font-medium text-neutral-700 hover:text-emerald-700 transition-colors rounded-md"
                    >
                      {link.title}
                    </Link>
                  ))}
                  <Link
                    href="/trends"
                    className="ml-1 inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    Styles &amp; Trends
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/#catalog"
                    className="px-2.5 py-1.5 text-sm font-medium text-neutral-700 hover:text-emerald-700 transition-colors rounded-md"
                  >
                    Catalog
                  </Link>
                  <Link
                    href="/products"
                    className="px-2.5 py-1.5 text-sm font-medium text-neutral-700 hover:text-emerald-700 transition-colors rounded-md"
                  >
                    All Products
                  </Link>
                  <Link
                    href="/trends"
                    className="ml-1 inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    Styles &amp; Trends
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Center section: Brand Logo with dedicated flex allocation (no absolute collision) */}
          <div className="flex-1 min-w-0 flex items-center justify-center text-center px-1 sm:px-2 z-10">
            <Link
              href="/"
              className="inline-flex items-center justify-center max-w-full font-bold tracking-tight text-neutral-900 hover:text-emerald-700 transition-colors no-underline py-1"
            >
              <span className="text-base sm:text-lg md:text-xl font-bold tracking-tight truncate block max-w-full">
                {activeLogo?.text || 'Display Cell Pros'}
              </span>
            </Link>
          </div>

          {/* Right section: Search, Account, Wishlist, Cart in a clean flex sequence */}
          <div className="flex items-center justify-end gap-1 sm:gap-2 flex-shrink-0">
            {/* Search Trigger Button */}
            <Searchbar id="navbar-search-toggle-btn" />

            {/* Account Link - hidden on narrow screens to prevent crowding, fully available in mobile drawer */}
            <Link
              href="/account"
              aria-label="My Account"
              className="hidden sm:inline-flex items-center px-2.5 py-1.5 text-sm font-medium text-neutral-700 hover:text-emerald-700 transition-colors rounded-md whitespace-nowrap"
            >
              Account
            </Link>

            {/* Wishlist Link */}
            <Link
              id="navbar-wishlist-link"
              href="/wishlist"
              aria-label={`Wishlist (${isLoaded ? wishlistCount : 0} items)`}
              className="relative inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full text-neutral-700 hover:text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <Heart className="w-5 h-5 text-rose-500 hover:scale-110 transition-transform" />
              {isLoaded && wishlistCount > 0 && (
                <span
                  id="navbar-wishlist-count-badge"
                  className="absolute -top-0.5 -right-0.5 bg-rose-600 text-white rounded-full text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none border-2 border-white shadow-sm"
                >
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Shopping Bag Button */}
            <button
              id="navbar-bag-button"
              type="button"
              onClick={openSidebar}
              aria-label={`Shopping Bag (${cartCount} items)`}
              className="relative inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full text-neutral-700 hover:text-emerald-700 hover:bg-emerald-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
            >
              <Bag className="w-5 h-5" />
              {cartCount > 0 && (
                <span
                  id="navbar-bag-badge"
                  className="absolute -top-1 -right-1 bg-emerald-600 text-white rounded-full text-[11px] font-bold min-w-[20px] h-[20px] flex items-center justify-center px-1 leading-none border-2 border-white shadow-sm"
                >
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            id="mobile-navigation-drawer"
            className="md:hidden absolute top-full left-0 right-0 z-50 bg-white border-b border-neutral-200 shadow-xl px-4 sm:px-6 py-4"
          >
            <div className="flex flex-col gap-1.5">
              {navigationLinks && navigationLinks.length > 0 ? (
                navigationLinks.map((link, index) => (
                  <Link
                    key={index}
                    href={link.link || '//'}
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 px-3 text-base font-semibold text-neutral-900 hover:bg-neutral-50 rounded-lg border-b border-neutral-100 last:border-b-0 transition-colors"
                  >
                    {link.title}
                  </Link>
                ))
              ) : (
                <>
                  <Link
                    href="/#catalog"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 px-3 text-base font-semibold text-neutral-900 hover:bg-neutral-50 rounded-lg border-b border-neutral-100 transition-colors"
                  >
                    Catalog
                  </Link>
                  <Link
                    href="/products"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 px-3 text-base font-semibold text-neutral-900 hover:bg-neutral-50 rounded-lg border-b border-neutral-100 transition-colors"
                  >
                    All Products
                  </Link>
                </>
              )}
              <Link
                href="/trends"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-1 py-2.5 px-3 text-sm font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-center flex items-center justify-center hover:bg-emerald-100 transition-colors"
              >
                Styles &amp; Trends
              </Link>
              <Link
                id="mobile-drawer-wishlist-link"
                href="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 text-base font-semibold text-neutral-900 hover:bg-neutral-50 rounded-lg border-b border-neutral-100 flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span>My Wishlist</span>
                </span>
                {isLoaded && wishlistCount > 0 && (
                  <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <Link
                id="mobile-drawer-account-link"
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 text-base font-semibold text-neutral-900 hover:bg-neutral-50 rounded-lg border-b border-neutral-100 transition-colors"
              >
                My Account
              </Link>
              <Link
                id="mobile-drawer-track-link"
                href="/order-tracking"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 text-base font-semibold text-neutral-900 hover:bg-neutral-50 rounded-lg transition-colors"
              >
                Track Order
              </Link>
            </div>
          </div>
        )}
      </header>
    </React.Fragment>
  )
}

export default Navbar
