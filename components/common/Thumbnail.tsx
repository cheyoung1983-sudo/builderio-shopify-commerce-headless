import { jsx, AspectRatio } from 'theme-ui'
import Image from 'next/image'
import { PRODUCT_IMAGE_BLUR_DATA_URL } from '@lib/image'

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
  return (
    <button
      name={name}
      sx={{
        cursor: 'pointer',
        border: '1px solid gray',
        padding: 1,
        '&:focus': {
          outline: 'none',
          borderColor: 'black',
        },
      }}
      onMouseOver={onHover}
      onClick={onClick}
    >
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
    </button>
  )
}

export default Thumbnail
