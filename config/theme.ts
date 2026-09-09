import * as themes from '@theme-ui/presets'

const kyotoPersimmonTheme = {
  ...themes.base,
  colors: {
    ...(themes.base?.colors || {}),
    text: '#141518',
    background: '#faf9f5',
    primary: '#e05332',
    primaryHover: '#c84223',
    secondary: '#0d9488',
    muted: '#f3f1ea',
    highlight: '#fff5f2',
    accent: '#d97706',
    gray: '#747985',
    border: '#e7e5df',
  },
  styles: {
    ...themes.base?.styles,
    root: {
      ...themes.base?.styles?.root,
      bg: 'background',
      color: 'text',
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
  },
}

export default {
  ...themes,
  base: kyotoPersimmonTheme,
  default: kyotoPersimmonTheme,
} as any
