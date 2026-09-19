import { jsx, AspectRatio } from 'theme-ui'
import Image from 'next/image'
import { PRODUCT_IMAGE_BLUR_DATA_URL } from '@lib/image'
import { useIntersectionObserver } from '@lib/hooks/useIntersectionObserver'

export interface ThumbnailProps {
  src: any // for now;
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  onHover?: React.MouseEventHandler<HTMLButtonElement>
  name?: string
  width: number
  height: number
}

const Thumbnail: React.FC<ThumbnailProps> = ({
  src,
  onClick,
  onHover,
  name,
  width,
  height,
}) => {
  const { ref, isIntersecting } = useIntersectionObserver<HTMLButtonElement>({
    rootMargin: '150px 0px',
    triggerOnce: true,
  })

  return (
    <button
      ref={ref}
      name={name}
      sx={{
        cursor: 'pointer',
        border: '1px solid gray',
        padding: 1,
        minWidth: width,
        minHeight: height,
        position: 'relative',
        '&:focus': {
          outline: 'none',
          borderColor: 'black',
        },
      }}
      onMouseOver={onHover}
      onClick={onClick}
    >
      {isIntersecting ? (
        <Image
          src={src}
          alt={name || 'Product thumbnail'}
          width={width}
          height={height}
          placeholder="blur"
          blurDataURL={PRODUCT_IMAGE_BLUR_DATA_URL}
          sizes={`${width}px`}
          loading="lazy"
        />
      ) : (
        <div
          sx={{
            width,
            height,
            backgroundImage: `url("${PRODUCT_IMAGE_BLUR_DATA_URL}")`,
            backgroundSize: 'cover',
          }}
        />
      )}
    </button>
  )
}

export default Thumbnail
