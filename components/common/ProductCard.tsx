/** @jsxRuntime classic */
/** @jsx jsx */
import { Heading, jsx } from 'theme-ui'
import { Card, Text } from '@theme-ui/components'
import Image from 'next/legacy/image'
import { getPrice } from '@lib/shopify/storefront-data-hooks/src/utils/product'
import Link from '@components/common/Link'

export interface ProductCardProps {
  className?: string
  product: ShopifyBuy.Product
  imgWidth: number
  imgHeight: number
  imgLayout?: 'fixed' | 'intrinsic' | 'responsive' | undefined
  imgPriority?: boolean
  fillImage?: boolean
  imgLoading?: 'eager' | 'lazy'
  imgSizes?: string
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  imgWidth,
  imgHeight,
  imgPriority,
  imgLoading,
  imgSizes,
  imgLayout = 'responsive',
}) => {
  const handle = (product as any).handle
  const productVariant: any = product.variants[0]
  const price =
    productVariant?.priceV2 != null
      ? getPrice(
          productVariant.priceV2.amount,
          productVariant.priceV2.currencyCode
        )
      : 'Unavailable'
  const image = product.images?.[0]

  return (
    <Card
      sx={{
        maxWidth: [700, imgWidth || 540],
        p: 3,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Link
        href={`/product/${handle}/`}
        sx={{
          color: 'inherit',
        }}
      >
        <div
          sx={{
            flexGrow: 1,
            aspectRatio: `${imgWidth} / ${imgHeight}`,
            bg: 'muted',
            overflow: 'hidden',
          }}
        >
          {image ? (
            <Image
              src={image.src}
              alt={product.title}
              width={imgWidth}
              height={imgHeight}
              layout={imgLayout}
              objectFit="cover"
              priority={imgPriority}
              loading={imgPriority ? undefined : imgLoading}
              sizes={imgSizes}
            />
          ) : (
            <div
              sx={{
                alignItems: 'center',
                display: 'flex',
                height: '100%',
                justifyContent: 'center',
              }}
            >
              <Text>Image unavailable</Text>
            </div>
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

export default ProductCard
