import React, { FC, useState, useEffect } from 'react'
import { BuilderComponent, builder } from '@builder.io/react'
import builderConfig from '@config/builder'
import { useCart } from '@lib/shopify/storefront-data-hooks'
import { useCart as useModernCart } from '../../context/CartContext'
import { jsx, Box, useThemeUI, Heading, Button } from 'theme-ui'
import { useUI } from '@components/common/context'
import Image from 'next/image'
import Searchbar from './Searchbar'
import Link from '@components/common/Link'
import { Bag } from '@components/icons'
import { Menu, X } from 'lucide-react'

const Navbar: FC = () => {
  const [announcement, setAnnouncement] = useState<any>()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme } = useThemeUI()
  const { navigationLinks, logo, openSidebar } = useUI()
  const activeLogo =
    logo && (logo.image || logo.text)
      ? logo
      : {
          image: '/assets/logo.svg',
          text: 'Display Cell Pros',
          width: 190,
          height: 40,
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

  const itemHandles = (cart?.lineItems || [])
    .map((item: any) => item?.variant?.product?.handle)
    .filter(Boolean)
    .join(',')

  useEffect(() => {
    async function fetchContent() {
      if (!builderConfig.apiKey) return
      try {
        const anouncementContent = await builder
          .get('announcement-bar', {
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
      {announcement && builderConfig.apiKey && (
        <BuilderComponent
          content={announcement}
          data={{ theme }}
          model="announcement-bar"
        />
      )}
      <Box
        as="header"
        sx={{
          margin: `0 auto`,
          width: '100%',
          maxWidth: '100%',
          py: 3,
          px: { xs: 4, sm: 6, lg: 8 },
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexBasis: 0,
            minWidth: [100, 140, 260],
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {/* Mobile Hamburger Toggle Button */}
          <Button
            id="mobile-menu-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
            sx={{
              display: ['flex', 'flex', 'none'],
              alignItems: 'center',
              justifyContent: 'center',
              p: 2,
              bg: 'transparent',
              color: 'inherit',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>

          {/* Desktop Navigation Links */}
          <Box
            sx={{
              display: ['none', 'none', 'flex'],
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {navigationLinks && navigationLinks.length > 0 ? (
              <>
                {navigationLinks.map((link, index) => (
                  <Link key={index} sx={{ padding: '6px 10px', fontSize: '13px', fontWeight: 500 }} href={link.link || '//'}>
                    {link.title}
                  </Link>
                ))}
                <Link
                  sx={{
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '9999px',
                    bg: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    textDecoration: 'none',
                  }}
                  href="/trends"
                >
                  Styles & Trends
                </Link>
              </>
            ) : (
              <>
                <Link sx={{ padding: '6px 10px', fontSize: '13px', fontWeight: 500, color: 'inherit' }} href="/#catalog">
                  Catalog
                </Link>
                <Link sx={{ padding: '6px 10px', fontSize: '13px', fontWeight: 500, color: 'inherit' }} href="/products">
                  All Products
                </Link>
                <Link
                  sx={{
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '9999px',
                    bg: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    textDecoration: 'none',
                  }}
                  href="/trends"
                >
                  Styles & Trends
                </Link>
              </>
            )}
          </Box>
        </Box>
        <Box
          sx={{
            transform: 'translateX(-50%)',
            left: '50%',
            position: 'absolute',
          }}
        >
          <Heading
            sx={{
              fontSize: 20,
              fontWeight: 'bold',
            }}
          >
            {activeLogo && activeLogo.image && (
              <Link
                href="/"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  textDecoration: `none`,
                  paddingLeft: '5px',
                }}
              >
                <Image
                  alt={activeLogo.text || 'Display Cell Pros'}
                  width={activeLogo.width || 190}
                  height={activeLogo.height || 40}
                  src={activeLogo.image}
                  priority
                  unoptimized
                  style={{ width: 'auto', height: 'auto' }}
                />
              </Link>
            )}
            {activeLogo && activeLogo.text && !activeLogo.image && (
              <Link
                href="/"
                sx={{
                  letterSpacing: -1,
                  textDecoration: `none`,
                  paddingLeft: '5px',
                }}
              >
                {activeLogo.text}
              </Link>
            )}
          </Heading>
        </Box>
        <Box
          sx={{
            display: 'flex',
            minWidth: 140,
            width: '100%',
            justifyContent: ['space-between', 'flex-end'],
          }}
        >
          <Searchbar />
          <Link
            href="/account"
            aria-label="My Account"
            sx={{
              padding: '6px 10px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            Account
          </Link>
          <Button
            id="navbar-bag-button"
            onClick={openSidebar}
            aria-label={`Shopping Bag (${cartCount} items)`}
            sx={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Bag />
            {cartCount > 0 && (
              <span
                id="navbar-bag-badge"
                sx={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  bg: '#059669',
                  color: '#ffffff',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  minWidth: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: '4px',
                  lineHeight: 1,
                  border: '2px solid white',
                  boxShadow: '0 2px 5px rgba(5,150,105,0.4)',
                }}
              >
                {cartCount}
              </span>
            )}
          </Button>
        </Box>
      </Box>
      {mobileMenuOpen && (
        <Box
          id="mobile-navigation-drawer"
          sx={{
            display: ['block', 'block', 'none'],
            bg: 'white',
            borderBottom: '1px solid #e5e5e5',
            px: 6,
            py: 4,
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 50,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {navigationLinks && navigationLinks.length > 0 ? (
              navigationLinks.map((link, index) => (
                <Link
                  key={index}
                  href={link.link || '//'}
                  onClick={() => setMobileMenuOpen(false)}
                  sx={{ py: 2, fontSize: '15px', fontWeight: 600, color: '#171717', borderBottom: '1px solid #f5f5f5', textDecoration: 'none' }}
                >
                  {link.title}
                </Link>
              ))
            ) : (
              <>
                <Link
                  href="/#catalog"
                  onClick={() => setMobileMenuOpen(false)}
                  sx={{ py: 2, fontSize: '15px', fontWeight: 600, color: '#171717', borderBottom: '1px solid #f5f5f5', textDecoration: 'none' }}
                >
                  Catalog
                </Link>
                <Link
                  href="/products"
                  onClick={() => setMobileMenuOpen(false)}
                  sx={{ py: 2, fontSize: '15px', fontWeight: 600, color: '#171717', borderBottom: '1px solid #f5f5f5', textDecoration: 'none' }}
                >
                  All Products
                </Link>
              </>
            )}
            <Link
              href="/trends"
              onClick={() => setMobileMenuOpen(false)}
              sx={{
                py: 2.5,
                px: 3,
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '12px',
                bg: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Styles & Trends
            </Link>
            <Link
              href="/account"
              onClick={() => setMobileMenuOpen(false)}
              sx={{ py: 2, fontSize: '15px', fontWeight: 600, color: '#171717', textDecoration: 'none' }}
            >
              My Account
            </Link>
          </Box>
        </Box>
      )}
    </React.Fragment>
  )
}

export default Navbar
