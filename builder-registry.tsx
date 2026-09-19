import { Builder } from '@builder.io/react'
import dynamic from 'next/dynamic'
import { Input } from '@builder.io/sdk'
import Image from 'next/image'

// Lazy load components
const LazyProductGrid = dynamic(async () => {
  return (await import('./blocks/ProductGrid/ProductGrid')).ProductGrid
})

const LazyCollectionView = dynamic(() => import('./blocks/CollectionView/CollectionView'))

const LazyProductView = dynamic(
  () => import('./blocks/ProductView/ProductView'),
  { ssr: true }
)

const LazyFAQAccordion = dynamic(
  () => import('./components/common/FAQAccordion'),
  { ssr: true }
)

const LazyScrollToTop = dynamic(
  () => import('./components/common/ScrollToTop'),
  { ssr: false }
)

const LazyBreadcrumbs = dynamic(
  () => import('./components/common/Breadcrumbs'),
  { ssr: true }
)

const LazyPredictiveSearch = dynamic(
  () => import('./components/search/PredictiveSearch').then((mod) => mod.PredictiveSearch),
  { ssr: true }
)

const productCardFields: Input[] = [
  { name: 'imgWidth', type: 'number', defaultValue: 540 },
  { name: 'imgHeight', type: 'number', defaultValue: 540 },
  { name: 'imgPriority', type: 'boolean', advanced: true, defaultValue: true },
  {
    name: 'imgLoading',
    type: 'enum',
    advanced: true,
    defaultValue: 'lazy',
    enum: ['eager', 'lazy'],
  },
  {
    name: 'imgLayout',
    type: 'enum',
    enum: ['fixed', 'intrinsic', 'responsive'],
    advanced: true,
    defaultValue: 'fixed',
  },
  { name: 'fillImage', type: 'boolean', advanced: true, defaultValue: true },
]

const productGridSchema: Input[] = [
  {
    name: 'cardProps',
    defaultValue: {
      imgPriority: true,
      imgLayout: 'responsive',
      imgLoading: 'eager',
      imgWidth: 540,
      imgHeight: 540,
      layout: 'fixed',
    },
    type: 'object',
    subFields: productCardFields,
  },
  { name: 'offset', type: 'number', defaultValue: 0 },
  { name: 'limit', type: 'number', defaultValue: 9 },
]

// 1. ProductGrid
Builder.registerComponent(LazyProductGrid, {
  name: 'ProductGrid',
  image: 'https://unpkg.com/css.gg@2.0.0/icons/svg/play-list-add.svg',
  description: 'Pick products free form',
  inputs: [
    {
      name: 'productsList',
      type: 'list',
      subFields: [
        {
          name: 'product',
          type: 'ShopifyProductHandle',
        },
      ],
    },
  ].concat(productGridSchema as any),
})

// 2. ProductCollectionGrid
Builder.registerComponent(LazyProductGrid, {
  name: 'ProductCollectionGrid',
  image: 'https://unpkg.com/css.gg@2.0.0/icons/svg/display-grid.svg',
  description: 'Choose a collection to show its products in a grid',
  inputs: [
    {
      name: 'collection',
      type: 'ShopifyCollectionHandle',
    },
  ].concat(productGridSchema),
})

const collectionBoxSchema: Input[] = [
  {
    name: 'productGridOptions',
    type: 'object',
    subFields: productGridSchema,
    defaultValue: {
      cardProps: {
        imgPriority: true,
        imgLayout: 'responsive',
        imgLoading: 'eager',
        imgWidth: 540,
        imgHeight: 540,
        layout: 'fixed',
      },
    },
  },
  {
    type: 'boolean',
    name: 'renderSeo',
    advanced: true,
    helperText: 'toggle to render seo info on page, only use for collection pages',
  },
]

// 3. CollectionBox
Builder.registerComponent(LazyCollectionView, {
  models: ['page', 'product-page', 'theme'],
  name: 'CollectionBox',
  description: 'Pick a collection to display its details',
  image: 'https://unpkg.com/css.gg@2.0.0/icons/svg/collage.svg',
  inputs: collectionBoxSchema
    .concat([
      {
        name: 'collection',
        type: 'ShopifyCollectionHandle',
      },
    ])
    .reverse(),
})

// 4. CollectionView
Builder.registerComponent(LazyCollectionView, {
  models: ['collection-page', 'theme'],
  name: 'CollectionView',
  description:
    'Dynamic collection details, autobinds to the collection in context, use only on collection pages',
  inputs: collectionBoxSchema,
  defaults: {
    bindings: {
      'component.options.collection': 'state.collection',
      'component.options.renderSeo': 'true',
    },
  },
})

// 5. ProductView
Builder.registerComponent(LazyProductView, {
  models: ['product-page', 'theme'],
  name: 'ProductView',
  image: 'https://unpkg.com/css.gg@2.0.0/icons/svg/inpicture.svg',
  description:
    'Product details, should only be used in product page template, dynamically bind to product in context.',
  defaults: {
    bindings: {
      'component.options.product': 'state.product',
      'component.options.title': 'state.product.title',
      'component.options.description': 'state.product.descriptionHtml',
      'component.options.renderSeo': 'true',
    },
  },
})

// 6. ProductBox
Builder.registerComponent(LazyProductView, {
  name: 'ProductBox',
  models: ['page', 'collection-page', 'theme'],
  inputs: [
    { name: 'product', type: 'ShopifyProductHandle' },
    {
      name: 'description',
      richText: true,
      type: 'html',
      helperText: 'Override product description from shopify',
    },
    {
      name: 'title',
      type: 'text',
      helperText: 'Override product title from shopify',
    },
  ],
  image: 'https://unpkg.com/css.gg@2.0.0/icons/svg/ereader.svg',
  description: 'Choose a product to show its details on page',
})

// 7. CloudinaryImage
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

// 8. FAQAccordion
Builder.registerComponent(LazyFAQAccordion, {
  name: 'FAQAccordion',
  image: 'https://unpkg.com/css.gg@2.0.0/icons/svg/info.svg',
  description: 'Accordion addressing customer repair warranties and process timelines',
  inputs: [
    { name: 'title', type: 'string', defaultValue: 'Frequently Asked Questions' },
    {
      name: 'subtitle',
      type: 'string',
      defaultValue:
        'Everything you need to know about our repair warranties, Spokane on-site service timelines, and quality guarantees.',
    },
    {
      name: 'includeJsonLd',
      type: 'boolean',
      defaultValue: true,
      description: 'Inject Schema.org FAQPage structured data for SEO rich snippets',
    },
  ],
})

// 9. ScrollToTop (Floating Back to Top Button)
Builder.registerComponent(LazyScrollToTop, {
  name: 'ScrollToTop',
  image: 'https://unpkg.com/css.gg@2.0.0/icons/svg/arrow-up.svg',
  description: 'Floating button that appears after scrolling past a threshold to smoothly return to page top',
  inputs: [
    {
      name: 'fallbackThreshold',
      type: 'number',
      defaultValue: 350,
      description: 'Scroll threshold distance in pixels before button appears',
    },
    {
      name: 'heroElementId',
      type: 'string',
      defaultValue: 'hero-banner',
      description: 'DOM element ID of the hero section to track (optional)',
    },
  ],
})

// 10. Breadcrumbs (Structured Navigation Trail)
Builder.registerComponent(LazyBreadcrumbs, {
  name: 'Breadcrumbs',
  image: 'https://unpkg.com/css.gg@2.0.0/icons/svg/chevron-right.svg',
  description: 'Breadcrumb navigation component above product listing and collection pages for SEO and navigation flow',
  inputs: [
    {
      name: 'items',
      type: 'list',
      defaultValue: [
        { label: 'Home', href: '/' },
        { label: 'Products', href: '/products', isCurrent: true },
      ],
      subFields: [
        { name: 'label', type: 'string', required: true },
        { name: 'href', type: 'string' },
        { name: 'isCurrent', type: 'boolean', defaultValue: false },
        { name: 'count', type: 'number' },
      ],
    },
    {
      name: 'variant',
      type: 'enum',
      enum: ['contained', 'minimal', 'card'],
      defaultValue: 'contained',
      description: 'Visual presentation style for the breadcrumb bar',
    },
    {
      name: 'showHomeIcon',
      type: 'boolean',
      defaultValue: true,
      description: 'Display an icon for the first Home link',
    },
    {
      name: 'showBackOnMobile',
      type: 'boolean',
      defaultValue: true,
      description: 'Display a quick back button on narrow mobile screens',
    },
  ],
})

Builder.registerComponent(LazyPredictiveSearch, {
  name: 'PredictiveSearch',
  inputs: [
    {
      name: 'placeholder',
      type: 'string',
      defaultValue: 'Search products, brands, or syntax (e.g. vendor:Samsung, price:>50)...',
    },
    {
      name: 'showSyntaxTips',
      type: 'boolean',
      defaultValue: true,
      description: 'Display quick Shopify search syntax guide chips and helper',
    },
    {
      name: 'compact',
      type: 'boolean',
      defaultValue: false,
    },
  ],
})

// Register insert menus
Builder.register('insertMenu', {
  name: 'Shopify Collections Components',
  items: [
    { name: 'Breadcrumbs' },
    { name: 'PredictiveSearch' },
    { name: 'CollectionBox', label: 'Collection stuff' },
    { name: 'ProductCollectionGrid' },
    { name: 'CollectionView' },
  ],
})

Builder.register('insertMenu', {
  name: 'Shopify Products Components',
  items: [
    { name: 'Breadcrumbs' },
    { name: 'PredictiveSearch' },
    { name: 'ProductGrid' },
    { name: 'ProductBox' },
    { name: 'ProductView' },
  ],
})

Builder.register('insertMenu', {
  name: 'Cloudinary Components',
  items: [{ name: 'CloudinaryImage' }],
})
