import React, { FC, useState, useEffect } from 'react'
import { BuilderComponent, builder } from '@builder.io/react'
import builderConfig from '@config/builder'
import { useCart } from '@lib/shopify/storefront-data-hooks'
import { useCart as useModernCart } from '../../context/CartContext'
import { Box, useThemeUI, Heading, Button } from 'theme-ui'
import { useUI } from '@components/common/context'
import Image from 'next/legacy/image'
import Searchbar from './Searchbar'
import Link from '@components/common/Link'
import { Bag } from '@components/icons'

const Navbar: FC = () => {
  const [announcement, setAnnouncement] = useState<any>()
  const { theme } = useThemeUI()
  const { navigationLinks, logo, openSidebar } = useUI()
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
          maxWidth: 1920,
          py: 2,
          px: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            display: ['none', 'none', 'flex'],
            flexBasis: 0,
            minWidth: 240,
            justifyContent: 'space-evenly',
          }}
        >
          {navigationLinks?.map((link, index) => (
            <Link key={index} sx={{ padding: 10 }} href={link.link || '//'}>
              {link.title}
            </Link>
          ))}
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
            {logo && logo.image && (
              <Link
                href="/"
                sx={{
                  letterSpacing: -1,
                  textDecoration: `none`,
                  paddingLeft: '5px',
                }}
              >
                <Image
                  alt="Logo"
                  width={logo.width}
                  height={logo.height}
                  src={logo.image}
                ></Image>
              </Link>
            )}
            {logo && logo.text && !logo.image && (
              <Link
                href="/"
                sx={{
                  letterSpacing: -1,
                  textDecoration: `none`,
                  paddingLeft: '5px',
                }}
              >
                {logo.text}
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
                  bg: '#10b981',
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
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }}
              >
                {cartCount}
              </span>
            )}
          </Button>
        </Box>
      </Box>
    </React.Fragment>
  )
}

export default Navbar
