import { Heading } from 'theme-ui'
import { Card, Text } from '@theme-ui/components'
import Image from 'next/image'
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
        bg: '#ffffff',
        border: '1px solid #e7e5df',
        borderRadius: 12,
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        '&:hover': {
          transform: 'translateY(-3px)',
          borderColor: '#d2cfc7',
          boxShadow: '0 12px 28px -6px rgba(20, 21, 24, 0.08)',
        },
      }}
    >
      <Link
        href={`/product/${handle}/`}
        sx={{
          color: 'inherit',
          textDecoration: 'none',
        }}
      >
        <div
          sx={{
            flexGrow: 1,
            aspectRatio: `${imgWidth} / ${imgHeight}`,
            bg: '#f3f1ea',
            borderRadius: 8,
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
                color: '#747985',
              }}
            >
              <Text>Image unavailable</Text>
            </div>
          )}
        </div>
        <div sx={{ textAlign: 'center', pt: 3 }}>
          <Heading
            as="h2"
            sx={{
              mt: 1,
              mb: 1,
              fontSize: 15,
              fontWeight: 600,
              color: '#141518',
              letterSpacing: '-0.01em',
            }}
          >
            {product.title}
          </Heading>
          <Text
            sx={{
              fontSize: 14,
              fontWeight: 700,
              color: '#e05332',
              mb: 1,
              display: 'inline-block',
            }}
          >
            {price}
          </Text>
        </div>
      </Link>
    </Card>
  )
}

export default ProductCard
