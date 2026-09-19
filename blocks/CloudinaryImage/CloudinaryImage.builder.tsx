import Image from 'next/image'
import { Builder } from '@builder.io/react'
import { PRODUCT_IMAGE_BLUR_DATA_URL } from '../../lib/image'

Builder.registerComponent(
  (props: any) => {
    if (!props.cloudinaryOptions) {
      return 'Choose an Image'
    }
    return (
      <Image
        src={props.cloudinaryOptions.url}
        alt={props.alt || ''}
        width={props.cloudinaryOptions.width}
        height={props.cloudinaryOptions.height}
        placeholder="blur"
        blurDataURL={PRODUCT_IMAGE_BLUR_DATA_URL}
      />
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
