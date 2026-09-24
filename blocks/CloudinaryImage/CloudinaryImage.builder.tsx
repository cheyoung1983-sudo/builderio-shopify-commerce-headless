import Image from 'next/image'
import { Builder } from '@builder.io/react'
import { PRODUCT_IMAGE_BLUR_DATA_URL } from '../../lib/image'

Builder.registerComponent(
  (props: any) => {
    if (!props.cloudinaryOptions) {
      return 'Choose an Image'
    }
    const width = Number(props.cloudinaryOptions.width) || 800
    const height = Number(props.cloudinaryOptions.height) || 600

    return (
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        <Image
          src={props.cloudinaryOptions.url}
          alt={props.alt || 'Content image'}
          width={width}
          height={height}
          placeholder="blur"
          blurDataURL={PRODUCT_IMAGE_BLUR_DATA_URL}
          style={{ width: '100%', height: 'auto', aspectRatio: `${width} / ${height}` }}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px"
          loading="lazy"
        />
      </div>
    )
  },
  {
    name: 'CloudinaryImage',
    image:
      'https://res.cloudinary.com/cloudinary-marketing/image/upload/v1599098500/creative_source/Logo/Cloud%20Glyph/cloudinary_cloud_glyph_blue_png.png',
    inputs: [
      { name: 'cloudinaryOptions', type: 'cloudinaryImageEditor' },
      { name: 'alt', type: 'string', helperText: 'Alt text for accessibility' },
    ],
  }
)
