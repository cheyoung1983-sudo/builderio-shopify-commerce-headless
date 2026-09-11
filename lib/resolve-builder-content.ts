import { builder } from '@builder.io/react'
import { getAsyncProps } from '@builder.io/utils'
import builderConfig from '@config/builder'
import shopifyConfig from '@config/shopify'
import {
  getCollection,
  getProduct,
} from './shopify/storefront-data-hooks/src/api/operations'

const BUILDER_FETCH_TIMEOUT_MS = 8000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Builder fetch for "${label}" timed out after ${ms}ms`)),
      ms
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

export async function resolveBuilderContent(
  modelName: string,
  locale = 'en-US',
  targetingAttributes?: Record<string, any>
) {
  let page: any = null
  if (builderConfig.apiKey) {
    try {
      page = await withTimeout(
        builder
          .get(modelName, {
            apiKey: builderConfig.apiKey,
            enrich: true,
            options: {
              locale,
              // only cachebust if you're statically generating the page
              cachebust: true,
            },
            userAttributes: {
              ...targetingAttributes,
              locale,
            },
          })
          .toPromise(),
        BUILDER_FETCH_TIMEOUT_MS,
        modelName
      )
    } catch (e) {
      console.warn(`Builder get error for ${modelName}:`, e)
    }
  }

  if (page && process.env.NODE_ENV === 'production') {
    return await getAsyncProps(page, {
      async ProductGrid(props) {
        let products: any[] = []
        if (props.productsList) {
          const promises = props.productsList
            .map((entry: any) => entry.product)
            .filter((handle: string | undefined) => typeof handle === 'string')
            .map(
              async (handle: string) =>
                await getProduct(shopifyConfig, { handle })
            )
          products = await Promise.all(promises)
        }
        return {
          // resolve the query as `products` for ssr
          // used for example in ProductGrid.tsx as initialProducts
          products,
        }
      },
      async CollectionBox(props) {
        let collection = props.collection
        if (collection && typeof collection === 'string') {
          collection = await getCollection(shopifyConfig, {
            handle: collection,
          })
        }
        return {
          collection,
        }
      },
      async ProductBox(props) {
        let product = props.product
        if (product && typeof product === 'string') {
          product = await getProduct(shopifyConfig, {
            handle: product,
          })
        }
        return {
          product,
        }
      },

      async ProductCollectionGrid({ collection }) {
        if (collection && typeof collection === 'string') {
          const collectionData = await getCollection(shopifyConfig, {
            handle: collection,
          })
          return {
            products: collectionData?.products || [],
          }
        }
      },
    })
  }
  return page || null
}
