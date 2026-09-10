import { jsx, Box, AspectRatio } from 'theme-ui'
import React from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import UntilInteraction from '@components/common/UntilInteraction'

type props = import('./LazyImageCarousel').ImageCarouselProps

const LazyCarousel = dynamic(() => import('./LazyImageCarousel'), {
  loading: () => <Box sx={{ height: '100%', bg: 'muted' }} />,
  ssr: false,
})
const ImageCarousel: React.FC<props> = ({
  images,
  onThumbnailClick,
  showZoom,
  currentSlide,
  alt,
  ...imageProps
}) => {
  return (
    <AspectRatio ratio={Number(imageProps.height) / Number(imageProps.width)}>
      <UntilInteraction
        skeleton={
          <Image
            src={images[0].src}
            alt={alt || (images[0] as any).altText || 'Product image'}
            {...imageProps}
          />
        }
      >
        <LazyCarousel
          images={images}
          showZoom={showZoom}
          currentSlide={currentSlide}
          onThumbnailClick={onThumbnailClick}
          alt={alt}
          {...imageProps}
        />
      </UntilInteraction>
    </AspectRatio>
  )
}
export default ImageCarousel
