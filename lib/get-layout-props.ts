import { resolveBuilderContent } from './resolve-builder-content'
import builderConfig from '@config/builder'

export async function getLayoutProps(targetingAttributes?: any) {
  const theme = builderConfig.themeModel
    ? await resolveBuilderContent(builderConfig.themeModel, targetingAttributes)
    : null

  return {
    theme: theme || null,
  }
}
