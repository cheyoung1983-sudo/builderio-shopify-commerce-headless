export interface DeviceModel {
  id: string
  name: string
  brandId: string
  releaseYear?: number
  modelNumbers?: string[]
  searchKeywords: string[]
  popularParts?: string[]
}

export interface DeviceBrand {
  id: string
  name: string
  logo?: string
  models: DeviceModel[]
}

export interface PartCategory {
  id: string
  name: string
  iconName: string
  tags: string[]
}

export const SUPPORTED_PART_CATEGORIES: PartCategory[] = [
  {
    id: 'all',
    name: 'All Compatible Parts',
    iconName: 'Smartphone',
    tags: [],
  },
  {
    id: 'screen',
    name: 'Screens & OLED',
    iconName: 'Monitor',
    tags: ['screen', 'oled', 'display', 'lcd', 'digitizer'],
  },
  {
    id: 'battery',
    name: 'Batteries',
    iconName: 'BatteryCharging',
    tags: ['battery', 'power'],
  },
  {
    id: 'port',
    name: 'Charging Ports',
    iconName: 'Zap',
    tags: ['charging port', 'flex cable', 'connector'],
  },
  {
    id: 'camera',
    name: 'Cameras',
    iconName: 'Camera',
    tags: ['camera', 'lens'],
  },
  {
    id: 'backglass',
    name: 'Back Glass & Housings',
    iconName: 'Shield',
    tags: ['back glass', 'housing', 'cover'],
  },
  {
    id: 'tools',
    name: 'Tools & Adhesives',
    iconName: 'Wrench',
    tags: ['tool', 'toolkit', 'adhesive', 'glue', 'gasket'],
  },
]

export const SUPPORTED_BRANDS: DeviceBrand[] = [
  {
    id: 'samsung',
    name: 'Samsung',
    models: [
      {
        id: 'galaxy-s24-ultra',
        name: 'Galaxy S24 Ultra',
        brandId: 'samsung',
        releaseYear: 2024,
        modelNumbers: ['SM-S928B', 'SM-S928U', 'SM-S928W'],
        searchKeywords: ['s24 ultra', 'galaxy s24 ultra', 's928'],
      },
      {
        id: 'galaxy-s23-ultra',
        name: 'Galaxy S23 Ultra',
        brandId: 'samsung',
        releaseYear: 2023,
        modelNumbers: ['SM-S918B', 'SM-S918U', 'SM-S918W'],
        searchKeywords: ['s23 ultra', 'galaxy s23 ultra', 's918'],
      },
      {
        id: 'galaxy-s23',
        name: 'Galaxy S23',
        brandId: 'samsung',
        releaseYear: 2023,
        modelNumbers: ['SM-S911B', 'SM-S911U'],
        searchKeywords: ['s23', 'galaxy s23', 's911'],
      },
      {
        id: 'galaxy-s22-ultra',
        name: 'Galaxy S22 Ultra',
        brandId: 'samsung',
        releaseYear: 2022,
        modelNumbers: ['SM-S908B', 'SM-S908U'],
        searchKeywords: ['s22 ultra', 'galaxy s22 ultra', 's908'],
      },
      {
        id: 'galaxy-s22',
        name: 'Galaxy S22',
        brandId: 'samsung',
        releaseYear: 2022,
        modelNumbers: ['SM-S901B', 'SM-S901U'],
        searchKeywords: ['s22', 'galaxy s22', 's901'],
      },
      {
        id: 'galaxy-s21-ultra',
        name: 'Galaxy S21 Ultra',
        brandId: 'samsung',
        releaseYear: 2021,
        modelNumbers: ['SM-G998B', 'SM-G998U'],
        searchKeywords: ['s21 ultra', 'galaxy s21 ultra', 'g998'],
      },
      {
        id: 'galaxy-s21',
        name: 'Galaxy S21',
        brandId: 'samsung',
        releaseYear: 2021,
        modelNumbers: ['SM-G991B', 'SM-G991U'],
        searchKeywords: ['s21', 'galaxy s21', 'g991'],
      },
      {
        id: 'galaxy-a54',
        name: 'Galaxy A54 5G',
        brandId: 'samsung',
        releaseYear: 2023,
        modelNumbers: ['SM-A546B', 'SM-A546U'],
        searchKeywords: ['a54', 'galaxy a54', 'a546'],
      },
      {
        id: 'galaxy-z-fold-5',
        name: 'Galaxy Z Fold 5',
        brandId: 'samsung',
        releaseYear: 2023,
        modelNumbers: ['SM-F946B', 'SM-F946U'],
        searchKeywords: ['z fold 5', 'fold 5', 'f946'],
      },
      {
        id: 'galaxy-z-flip-5',
        name: 'Galaxy Z Flip 5',
        brandId: 'samsung',
        releaseYear: 2023,
        modelNumbers: ['SM-F731B', 'SM-F731U'],
        searchKeywords: ['z flip 5', 'flip 5', 'f731'],
      },
    ],
  },
  {
    id: 'apple',
    name: 'Apple',
    models: [
      {
        id: 'iphone-16-pro-max',
        name: 'iPhone 16 Pro Max',
        brandId: 'apple',
        releaseYear: 2024,
        modelNumbers: ['A3084', 'A3297'],
        searchKeywords: ['iphone 16 pro max', '16 pro max'],
      },
      {
        id: 'iphone-16-pro',
        name: 'iPhone 16 Pro',
        brandId: 'apple',
        releaseYear: 2024,
        modelNumbers: ['A3083', 'A3294'],
        searchKeywords: ['iphone 16 pro', '16 pro'],
      },
      {
        id: 'iphone-15-pro-max',
        name: 'iPhone 15 Pro Max',
        brandId: 'apple',
        releaseYear: 2023,
        modelNumbers: ['A2849', 'A3105'],
        searchKeywords: ['iphone 15 pro max', '15 pro max'],
      },
      {
        id: 'iphone-15-pro',
        name: 'iPhone 15 Pro',
        brandId: 'apple',
        releaseYear: 2023,
        modelNumbers: ['A2848', 'A3101'],
        searchKeywords: ['iphone 15 pro', '15 pro'],
      },
      {
        id: 'iphone-15',
        name: 'iPhone 15',
        brandId: 'apple',
        releaseYear: 2023,
        modelNumbers: ['A2846', 'A3089'],
        searchKeywords: ['iphone 15', 'iphone15'],
      },
      {
        id: 'iphone-14-pro-max',
        name: 'iPhone 14 Pro Max',
        brandId: 'apple',
        releaseYear: 2022,
        modelNumbers: ['A2651', 'A2893'],
        searchKeywords: ['iphone 14 pro max', '14 pro max'],
      },
      {
        id: 'iphone-14-pro',
        name: 'iPhone 14 Pro',
        brandId: 'apple',
        releaseYear: 2022,
        modelNumbers: ['A2650', 'A2890'],
        searchKeywords: ['iphone 14 pro', '14 pro'],
      },
      {
        id: 'iphone-14',
        name: 'iPhone 14',
        brandId: 'apple',
        releaseYear: 2022,
        modelNumbers: ['A2649', 'A2882'],
        searchKeywords: ['iphone 14', 'iphone14'],
      },
      {
        id: 'iphone-13-pro-max',
        name: 'iPhone 13 Pro Max',
        brandId: 'apple',
        releaseYear: 2021,
        modelNumbers: ['A2484', 'A2641'],
        searchKeywords: ['iphone 13 pro max', '13 pro max'],
      },
      {
        id: 'iphone-13-pro',
        name: 'iPhone 13 Pro',
        brandId: 'apple',
        releaseYear: 2021,
        modelNumbers: ['A2483', 'A2636'],
        searchKeywords: ['iphone 13 pro', '13 pro'],
      },
      {
        id: 'iphone-13',
        name: 'iPhone 13',
        brandId: 'apple',
        releaseYear: 2021,
        modelNumbers: ['A2482', 'A2631'],
        searchKeywords: ['iphone 13', 'iphone13'],
      },
    ],
  },
  {
    id: 'google',
    name: 'Google Pixel',
    models: [
      {
        id: 'pixel-9-pro',
        name: 'Pixel 9 Pro',
        brandId: 'google',
        releaseYear: 2024,
        modelNumbers: ['GEC77', 'GWVK6'],
        searchKeywords: ['pixel 9 pro', 'google pixel 9 pro'],
      },
      {
        id: 'pixel-9',
        name: 'Pixel 9',
        brandId: 'google',
        releaseYear: 2024,
        modelNumbers: ['GUR25'],
        searchKeywords: ['pixel 9', 'google pixel 9'],
      },
      {
        id: 'pixel-8-pro',
        name: 'Pixel 8 Pro',
        brandId: 'google',
        releaseYear: 2023,
        modelNumbers: ['GC3VE', 'G1MNW'],
        searchKeywords: ['pixel 8 pro', 'google pixel 8 pro'],
      },
      {
        id: 'pixel-8',
        name: 'Pixel 8',
        brandId: 'google',
        releaseYear: 2023,
        modelNumbers: ['GPJ41', 'G9BQD'],
        searchKeywords: ['pixel 8', 'google pixel 8'],
      },
      {
        id: 'pixel-7-pro',
        name: 'Pixel 7 Pro',
        brandId: 'google',
        releaseYear: 2022,
        modelNumbers: ['GP4BC', 'GE2AE'],
        searchKeywords: ['pixel 7 pro', 'google pixel 7 pro'],
      },
      {
        id: 'pixel-7',
        name: 'Pixel 7',
        brandId: 'google',
        releaseYear: 2022,
        modelNumbers: ['GVU6C', 'GQML3'],
        searchKeywords: ['pixel 7', 'google pixel 7'],
      },
    ],
  },
]

/**
 * Checks if a given product node matches a specific device model and optional part category
 */
export function checkProductCompatibility(
  product: {
    title: string
    handle?: string
    tags?: string[]
    vendor?: string
    description?: string
  },
  model: DeviceModel,
  category?: PartCategory | null
): boolean {
  const titleLower = (product.title || '').toLowerCase()
  const handleLower = (product.handle || '').toLowerCase()
  const tagsLower = (product.tags || []).map((t) => t.toLowerCase())
  const descLower = (product.description || '').toLowerCase()
  const vendorLower = (product.vendor || '').toLowerCase()

  // 1. Check brand affinity if product specifies vendor
  if (model.brandId === 'samsung') {
    if (vendorLower.includes('apple') || titleLower.startsWith('apple ') || titleLower.startsWith('iphone ')) {
      return false
    }
  } else if (model.brandId === 'apple') {
    if (vendorLower.includes('samsung') || titleLower.startsWith('samsung ') || titleLower.startsWith('galaxy ')) {
      return false
    }
  } else if (model.brandId === 'google') {
    if (vendorLower.includes('apple') || vendorLower.includes('samsung')) {
      return false
    }
  }

  // 2. Universal tools & adhesives (compatible with all devices if tools category is selected)
  const isGenericTool =
    tagsLower.includes('universal') ||
    tagsLower.includes('toolkit') ||
    tagsLower.includes('tool') ||
    titleLower.includes('screwdriver') ||
    titleLower.includes('opening tool') ||
    titleLower.includes('heat gun') ||
    titleLower.includes('pry tool')

  if (category?.id === 'tools' && isGenericTool) {
    return true
  }

  // 3. Match by Model Keywords
  const matchesKeyword = model.searchKeywords.some((keyword) => {
    const kw = keyword.toLowerCase()
    return (
      titleLower.includes(kw) ||
      handleLower.includes(kw.replace(/\s+/g, '-')) ||
      tagsLower.some((t) => t.includes(kw)) ||
      descLower.includes(kw)
    )
  })

  // 4. Match by Model Numbers if available
  const matchesModelNumber = (model.modelNumbers || []).some((num) => {
    const numLower = num.toLowerCase()
    return (
      titleLower.includes(numLower) ||
      tagsLower.includes(numLower) ||
      descLower.includes(numLower)
    )
  })

  const modelMatches = matchesKeyword || matchesModelNumber

  if (!modelMatches) {
    return false
  }

  // 5. If category is specified and not 'all', check category match
  if (category && category.id !== 'all') {
    const matchesCategory = category.tags.some((tag) => {
      const tLower = tag.toLowerCase()
      return (
        titleLower.includes(tLower) ||
        tagsLower.includes(tLower) ||
        descLower.includes(tLower)
      )
    })
    return matchesCategory
  }

  return true
}
