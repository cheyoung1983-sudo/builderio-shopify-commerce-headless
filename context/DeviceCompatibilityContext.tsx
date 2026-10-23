'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import {
  DeviceBrand,
  DeviceModel,
  PartCategory,
  SUPPORTED_BRANDS,
  SUPPORTED_PART_CATEGORIES,
  checkProductCompatibility,
} from '../lib/device-taxonomy'

export interface DeviceCompatibilityContextValue {
  selectedBrand: DeviceBrand | null
  selectedModel: DeviceModel | null
  selectedCategory: PartCategory | null
  setSelectedBrand: (brand: DeviceBrand | null) => void
  setSelectedModel: (model: DeviceModel | null) => void
  setSelectedCategory: (category: PartCategory | null) => void
  selectDevice: (brandId: string, modelId: string, categoryId?: string) => void
  clearCompatibilityFilter: () => void
  isCompatible: (product: {
    title: string
    handle?: string
    tags?: string[]
    vendor?: string
    description?: string
  }) => boolean
  hasActiveFilter: boolean
  activeFilterSummary: string | null
}

const STORAGE_KEY = 'storefront_selected_device'

const DeviceCompatibilityContext = createContext<DeviceCompatibilityContextValue | null>(null)

export const DeviceCompatibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedBrand, setSelectedBrand] = useState<DeviceBrand | null>(null)
  const [selectedModel, setSelectedModel] = useState<DeviceModel | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<PartCategory | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Hydrate from localStorage on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.brandId && parsed.modelId) {
          const brand = SUPPORTED_BRANDS.find((b) => b.id === parsed.brandId)
          if (brand) {
            setSelectedBrand(brand)
            const model = brand.models.find((m) => m.id === parsed.modelId)
            if (model) {
              setSelectedModel(model)
            }
          }
        }
        if (parsed.categoryId) {
          const cat = SUPPORTED_PART_CATEGORIES.find((c) => c.id === parsed.categoryId)
          if (cat) {
            setSelectedCategory(cat)
          }
        }
      }
    } catch (e) {
      console.warn('Could not read saved device from localStorage:', e)
    } finally {
      setIsInitialized(true)
    }
  }, [])

  // Sync to localStorage when selection changes
  useEffect(() => {
    if (!isInitialized) return
    try {
      if (selectedModel && selectedBrand) {
        const payload = {
          brandId: selectedBrand.id,
          modelId: selectedModel.id,
          categoryId: selectedCategory?.id || 'all',
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (e) {
      console.warn('Could not write saved device to localStorage:', e)
    }
  }, [selectedBrand, selectedModel, selectedCategory, isInitialized])

  const selectDevice = useCallback((brandId: string, modelId: string, categoryId?: string) => {
    const brand = SUPPORTED_BRANDS.find((b) => b.id === brandId) || null
    setSelectedBrand(brand)
    if (brand) {
      const model = brand.models.find((m) => m.id === modelId) || null
      setSelectedModel(model)
    } else {
      setSelectedModel(null)
    }

    if (categoryId) {
      const category = SUPPORTED_PART_CATEGORIES.find((c) => c.id === categoryId) || null
      setSelectedCategory(category)
    }
  }, [])

  const clearCompatibilityFilter = useCallback(() => {
    setSelectedBrand(null)
    setSelectedModel(null)
    setSelectedCategory(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      // ignore
    }
  }, [])

  const isCompatible = useCallback(
    (product: {
      title: string
      handle?: string
      tags?: string[]
      vendor?: string
      description?: string
    }): boolean => {
      if (!selectedModel) return true
      return checkProductCompatibility(product, selectedModel, selectedCategory)
    },
    [selectedModel, selectedCategory]
  )

  const hasActiveFilter = Boolean(selectedModel)

  const activeFilterSummary = useMemo(() => {
    if (!selectedModel) return null
    const brandName = selectedBrand?.name || ''
    const modelName = selectedModel.name
    const catName = selectedCategory && selectedCategory.id !== 'all' ? ` (${selectedCategory.name})` : ''
    return `${brandName} ${modelName}${catName}`.trim()
  }, [selectedBrand, selectedModel, selectedCategory])

  const contextValue = useMemo(
    () => ({
      selectedBrand,
      selectedModel,
      selectedCategory,
      setSelectedBrand,
      setSelectedModel,
      setSelectedCategory,
      selectDevice,
      clearCompatibilityFilter,
      isCompatible,
      hasActiveFilter,
      activeFilterSummary,
    }),
    [
      selectedBrand,
      selectedModel,
      selectedCategory,
      selectDevice,
      clearCompatibilityFilter,
      isCompatible,
      hasActiveFilter,
      activeFilterSummary,
    ]
  )

  return (
    <DeviceCompatibilityContext.Provider value={contextValue}>
      {children}
    </DeviceCompatibilityContext.Provider>
  )
}

const fallbackValue: DeviceCompatibilityContextValue = {
  selectedBrand: null,
  selectedModel: null,
  selectedCategory: null,
  setSelectedBrand: () => {},
  setSelectedModel: () => {},
  setSelectedCategory: () => {},
  selectDevice: () => {},
  clearCompatibilityFilter: () => {},
  isCompatible: () => true,
  hasActiveFilter: false,
  activeFilterSummary: null,
}

export const useDeviceCompatibility = (): DeviceCompatibilityContextValue => {
  const ctx = useContext(DeviceCompatibilityContext)
  return ctx || fallbackValue
}

export default DeviceCompatibilityProvider
