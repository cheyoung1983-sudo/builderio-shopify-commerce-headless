import { Heading, jsx } from 'theme-ui'
import Image from 'next/image'
import { Card, Text } from '@theme-ui/components'
import { getPrice } from '@lib/shopify/storefront-data-hooks/src/utils/product'
import { useState } from 'react'
import NoSSR from './NoSSR'
import Link from '@components/common/Link'
import { PRODUCT_IMAGE_BLUR_DATA_URL, RESPONSIVE_IMAGE_SIZES } from '@lib/image'
import { useIntersectionObserver } from '@lib/hooks/useIntersectionObserver'

export interface ProductCardProps {
  className?: string
  product: ShopifyBuy.Product
  imgWidth: number
  imgHeight: number
  imgLayout?: 'fixed' | 'intrinsic' | 'responsive' | undefined
  imgPriority?: boolean
  imgLoading?: 'eager' | 'lazy'
  imgSizes?: string
}

const ProductCardDemo: React.FC<ProductCardProps> = ({
  product,
  imgWidth,
  imgHeight,
  imgPriority,
  imgLoading,
  imgSizes,
  imgLayout = 'responsive',
}) => {
  const [showAlternate, setShowAlternate] = useState(false)
  const [canToggle, setCanToggle] = useState(false)
  const isPriority = Boolean(imgPriority)

  const { ref: cardObserverRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    rootMargin: '250px 0px',
    triggerOnce: true,
    initialIsIntersecting: isPriority,
    enabled: !isPriority,
  })

  const shouldRenderImages = isPriority || isIntersecting

  const src = product.images[0].src
  const handle = (product as any).handle
  const productVariant: any = product.variants[0]
  const price = getPrice(
    productVariant.compare_at_price || productVariant.price,
    'USD'
  )
  const alternateImage = product.images[1]?.src

  return (
    <Card
      ref={cardObserverRef}
      sx={{
        maxWidth: [700, 500],
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'transform',
        '&:hover': {
          transform: 'translateY(-4px) scale(1.025)',
          boxShadow: '0 16px 32px -8px rgba(20, 21, 24, 0.12)',
        },
        '&:active': {
          transform: 'translateY(-1px) scale(0.995)',
        },
      }}
      onMouseOut={() => setShowAlternate(false)}
      onMouseOver={() => setShowAlternate(true)}
    >
      <Link href={`/product/${handle}/`}>
        <div sx={{ flexGrow: 1, minHeight: imgHeight || 300, position: 'relative' }}>
          {shouldRenderImages ? (
            <>
              {alternateImage && (
                <div
                  sx={{ display: showAlternate && canToggle ? 'block' : 'none' }}
                >
                  <NoSSR>
                    <Image
                      quality="85"
                      src={alternateImage}
                      alt={product.title}
                      width={Number(imgWidth || 540)}
                      placeholder="blur"
                      blurDataURL={PRODUCT_IMAGE_BLUR_DATA_URL}
                      sizes={imgSizes || RESPONSIVE_IMAGE_SIZES.productGrid}
                      height={Number(imgHeight || 540)}
                      onLoad={() => setCanToggle(true)}
                      loading="lazy"
                    />
                  </NoSSR>
                </div>
              )}
              <div
                sx={{
                  display:
                    canToggle && showAlternate && alternateImage ? 'none' : 'block',
                }}
              >
                <Image
                  quality="85"
                  src={src}
                  alt={product.title}
                  width={imgWidth || 540}
                  placeholder="blur"
                  blurDataURL={PRODUCT_IMAGE_BLUR_DATA_URL}
                  sizes={imgSizes || RESPONSIVE_IMAGE_SIZES.productGrid}
                  height={imgHeight || 540}
                  layout={imgLayout}
                  loading={imgLoading}
                  priority={imgPriority}
                />
              </div>
            </>
          ) : (
            <div
              className="animate-shimmer"
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `url("${PRODUCT_IMAGE_BLUR_DATA_URL}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: 8,
              }}
            />
          )}
        </div>
        <div sx={{ textAlign: 'center' }}>
          <Heading as="h2" sx={{ mt: 4, mb: 0, fontSize: 14 }}>
            {product.title}
          </Heading>
          <Text sx={{ fontSize: 12, mb: 2 }}>{price}</Text>
        </div>
      </Link>
    </Card>
  )
}

export default ProductCardDemo
