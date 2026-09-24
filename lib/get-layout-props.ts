import { resolveBuilderContent } from './resolve-builder-content'
import builderConfig from '@config/builder'

export async function getLayoutProps(targetingAttributes?: any) {
  try {
    const theme = builderConfig.themeModel
      ? await resolveBuilderContent(builderConfig.themeModel, targetingAttributes)
      : null

    return {
      theme: theme || null,
    }
  } catch (error) {
    console.error('[getLayoutProps] Failed to resolve layout props:', error)
    return {
      theme: null,
    }
  }
}
