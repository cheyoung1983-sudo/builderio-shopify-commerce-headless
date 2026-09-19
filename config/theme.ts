import * as themes from '@theme-ui/presets'

const titaniumEmeraldTheme = {
  ...themes.base,
  colors: {
    ...(themes.base?.colors || {}),
    text: '#0f172a',
    background: '#f8fafc',
    primary: '#059669',
    primaryHover: '#047857',
    secondary: '#0284c7',
    muted: '#f1f5f9',
    highlight: '#ecfdf5',
    accent: '#d97706',
    gray: '#64748b',
    border: '#e2e8f0',
  },
  styles: {
    ...themes.base?.styles,
    root: {
      ...themes.base?.styles?.root,
      bg: 'background',
      color: 'text',
      fontFamily:
        'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
  },
}

export default {
  ...themes,
  base: titaniumEmeraldTheme,
  default: titaniumEmeraldTheme,
} as any
