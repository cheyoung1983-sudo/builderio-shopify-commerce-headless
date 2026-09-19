import sanitizeHtml from 'sanitize-html'

/**
 * Sanitizes Shopify-supplied rich text (product/collection descriptionHtml)
 * before it's rendered via dangerouslySetInnerHTML. These descriptions are
 * editable by any Shopify staff account (or a compromised one, or an app
 * with product-write scope) — never render them raw. `allowedSchemes`
 * excludes `javascript:` so a malicious `<a href="javascript:...">` can't
 * survive, and no script/style/iframe/object/embed tag is in the allowlist.
 */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'span', 'div',
      'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  })
}
