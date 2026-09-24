/**
 * Shopify Search Query Syntax Parser, Validator & Evaluator
 *
 * Implements the official Shopify Search Query Grammar and Syntax specification:
 * https://shopify.dev/docs/api/usage/search-syntax
 *
 * Grammar:
 *   Query = Term { [ whitespace Connective ] whitespace Term }
 *   Connective = "AND" | "OR" (default is implied AND; OR has higher operator precedence than AND)
 *   Term = [ Modifier ] ( "(" Query ")" | [ name Comparator ] value )
 *   Modifier = "-" | "NOT" whitespace
 *   Comparator = ":" | ":<" | ":>" | ":<=" | ":>="
 *
 * Query Types:
 *   - Field search: field:value (e.g. title:Apple, vendor:Samsung, price:>50)
 *   - Default search: unfielded case-insensitive search across document
 *   - Range search: orders_count:>16 orders_count:<=30, price:>100
 *   - NOT query: -term, NOT term, -field:value, -(subquery)
 *   - Boolean operators: AND, OR with precedence rules
 *   - Grouping: (clause1 OR clause2)
 *   - Phrase query: "Bob Norman"
 *   - Prefix query: norm*, title:head*
 *   - Exists query: tag:*, -published_at:*
 */

import { ShopifyProductNode } from '../services/shopify'

export type SearchComparator = ':' | ':<' | ':>' | ':<=' | ':>='
export type SearchConnective = 'AND' | 'OR'

export type SearchNodeType =
  | 'boolean'
  | 'group'
  | 'field'
  | 'default'
  | 'phrase'
  | 'exists'
  | 'prefix'

export interface SearchNode {
  type: SearchNodeType
  field?: string
  comparator?: SearchComparator
  value?: string
  isNegated?: boolean
  isPrefix?: boolean
  connective?: SearchConnective
  children?: SearchNode[]
}

export interface SearchWarning {
  field?: string
  message: string
}

export interface SearchSyntaxDebugResult {
  rawQuery: string
  isValid: boolean
  ast: SearchNode
  parsed: {
    and?: Array<Record<string, any>>
    or?: Array<Record<string, any>>
  }
  warnings: SearchWarning[]
  formattedQuery: string
}

/**
 * Valid fields for Shopify Storefront / Admin product searches
 */
export const VALID_PRODUCT_SEARCH_FIELDS = new Set([
  'title',
  'vendor',
  'product_type',
  'tag',
  'tags',
  'price',
  'available_for_sale',
  'inventory_total',
  'orders_count',
  'created_at',
  'updated_at',
  'id',
  'handle',
  'sku',
  'barcode',
  'variants.title',
  'default',
])

// -------------------------------------------------------------------------
// Tokenizer
// -------------------------------------------------------------------------

export type TokenType =
  | 'LPAREN'
  | 'RPAREN'
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'MODIFIER_MINUS'
  | 'TERM'

export interface Token {
  type: TokenType
  value: string
  raw: string
  field?: string
  comparator?: SearchComparator
  isNegated?: boolean
  isPhrase?: boolean
  isWildcard?: boolean
  startPos: number
}

/**
 * Tokenize a raw search query string according to Shopify search grammar
 */
export function tokenizeShopifySearchQuery(input: string): {
  tokens: Token[]
  warnings: SearchWarning[]
} {
  const warnings: SearchWarning[] = []
  const tokens: Token[] = []
  const str = input.trim()
  const len = str.length
  let i = 0

  while (i < len) {
    const ch = str[i]

    // Skip whitespace
    if (/\s/.test(ch)) {
      i++
      continue
    }

    // Parentheses
    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(', raw: '(', startPos: i })
      i++
      continue
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')', raw: ')', startPos: i })
      i++
      continue
    }

    // Check for modifier '-' (no following whitespace)
    if (ch === '-' && i + 1 < len && !/\s/.test(str[i + 1])) {
      // If directly followed by '(', it's a negated group: -(subquery)
      if (str[i + 1] === '(') {
        tokens.push({
          type: 'MODIFIER_MINUS',
          value: '-',
          raw: '-',
          startPos: i,
        })
        i++
        continue
      }
      // Otherwise it modifies the immediately following term
      // We will parse it with the term or as modifier
    }

    // Check for NOT followed by whitespace
    if (
      (str.startsWith('NOT ', i) || str.startsWith('NOT\t', i)) &&
      (i === 0 || /\s/.test(str[i - 1]) || str[i - 1] === '(')
    ) {
      tokens.push({ type: 'NOT', value: 'NOT', raw: 'NOT', startPos: i })
      i += 3
      continue
    }

    // Check for AND connective
    if (
      (str.startsWith('AND ', i) || str.startsWith('AND\t', i) || str.slice(i, i + 4) === 'AND)') &&
      (i === 0 || /\s/.test(str[i - 1]) || str[i - 1] === ')')
    ) {
      tokens.push({ type: 'AND', value: 'AND', raw: 'AND', startPos: i })
      i += 3
      continue
    }

    // Check for OR connective
    if (
      (str.startsWith('OR ', i) || str.startsWith('OR\t', i) || str.slice(i, i + 3) === 'OR)') &&
      (i === 0 || /\s/.test(str[i - 1]) || str[i - 1] === ')')
    ) {
      tokens.push({ type: 'OR', value: 'OR', raw: 'OR', startPos: i })
      i += 2
      continue
    }

    // Read a Term:
    // [Modifier] ( [name Comparator] value )
    const startPos = i
    let isNegated = false

    if (str[i] === '-' && i + 1 < len && !/\s/.test(str[i + 1])) {
      isNegated = true
      i++
    }

    // Parse potential name, comparator, and value
    let field: string | undefined
    let comparator: SearchComparator = ':'
    let value = ''
    let isPhrase = false
    let isWildcard = false

    // Read until whitespace or closing paren, taking quotes into account
    let tokenBuffer = ''
    let insideQuote: string | null = null
    let escaped = false

    while (i < len) {
      const c = str[i]

      if (escaped) {
        tokenBuffer += c
        escaped = false
        i++
        continue
      }

      if (c === '\\') {
        escaped = true
        i++
        continue
      }

      if (insideQuote) {
        if (c === insideQuote) {
          insideQuote = null
          isPhrase = true
        } else {
          tokenBuffer += c
        }
        i++
        continue
      }

      if (c === '"' || c === "'") {
        insideQuote = c
        isPhrase = true
        i++
        continue
      }

      if (/\s/.test(c) || c === ')') {
        break
      }

      tokenBuffer += c
      i++
    }

    if (insideQuote) {
      warnings.push({
        message: `Unclosed quotation mark (${insideQuote}) in search term.`,
      })
    }

    // Inspect tokenBuffer for [name Comparator] value
    // Supported comparators: :<=, :>=, :<, :>, :
    const match = tokenBuffer.match(/^([a-zA-Z0-9_\-.]+)(:<=|:>=|:<|:>|:=|:)(.*)$/)

    if (match) {
      const matchedField = match[1]
      const rawComp = match[2]
      const restVal = match[3]

      if (rawComp === ':=') {
        warnings.push({
          field: matchedField,
          message: `${matchedField}:=... searches for "=${restVal}". Equality is specified by ${matchedField}:...`,
        })
        comparator = ':'
        value = '=' + restVal
      } else {
        comparator = rawComp as SearchComparator
        value = restVal
      }

      field = matchedField

      // Validate known fields for product search
      const normalizedField = field.toLowerCase()
      if (!VALID_PRODUCT_SEARCH_FIELDS.has(normalizedField)) {
        warnings.push({
          field,
          message: `Invalid search field "${field}" for product search.`,
        })
      }
    } else {
      value = tokenBuffer
    }

    if (value.endsWith('*')) {
      isWildcard = true
    }

    tokens.push({
      type: 'TERM',
      raw: str.slice(startPos, i),
      value,
      field,
      comparator,
      isNegated,
      isPhrase,
      isWildcard,
      startPos,
    })
  }

  return { tokens, warnings }
}

// -------------------------------------------------------------------------
// Parser
// -------------------------------------------------------------------------

/**
 * Parse a token list into a structured SearchNode AST following operator precedence.
 * In Shopify Search Grammar:
 * - Terms within parentheses form subqueries
 * - OR has higher precedence than AND
 * - Adjacent terms with no operator default to AND
 */
export function parseShopifySearchTokens(
  tokens: Token[],
  initialWarnings: SearchWarning[] = []
): { ast: SearchNode; warnings: SearchWarning[] } {
  const warnings: SearchWarning[] = [...initialWarnings]
  let pos = 0

  function peek(): Token | undefined {
    return tokens[pos]
  }

  function consume(): Token {
    const t = tokens[pos]
    pos++
    return t
  }

  // Parse a primary item: Term or ( Subquery )
  function parsePrimary(): SearchNode | null {
    let isNegated = false

    // Check for leading NOT or MODIFIER_MINUS
    if (peek()?.type === 'NOT' || peek()?.type === 'MODIFIER_MINUS') {
      consume()
      isNegated = true
    }

    const next = peek()
    if (!next) return null

    if (next.type === 'LPAREN') {
      consume() // consume '('
      const subQuery = parseQuery()
      if (peek()?.type === 'RPAREN') {
        consume() // consume ')'
      } else {
        warnings.push({
          message: 'Unbalanced parentheses: missing closing ")".',
        })
      }

      if (isNegated) {
        return {
          type: 'group',
          isNegated: true,
          children: subQuery.children || [subQuery],
        }
      }
      return subQuery
    }

    if (next.type === 'TERM') {
      const termToken = consume()
      const effectiveNegation = isNegated || Boolean(termToken.isNegated)

      if (termToken.field) {
        if (termToken.value === '*') {
          return {
            type: 'exists',
            field: termToken.field,
            comparator: termToken.comparator,
            value: '*',
            isNegated: effectiveNegation,
          }
        }

        if (termToken.comparator && termToken.comparator !== ':') {
          return {
            type: 'field',
            field: termToken.field,
            comparator: termToken.comparator,
            value: termToken.value,
            isNegated: effectiveNegation,
            isPrefix: termToken.isWildcard,
          }
        }

        return {
          type: 'field',
          field: termToken.field,
          comparator: ':',
          value: termToken.value,
          isNegated: effectiveNegation,
          isPrefix: termToken.isWildcard,
        }
      }

      if (termToken.isPhrase) {
        return {
          type: 'phrase',
          value: termToken.value,
          isNegated: effectiveNegation,
        }
      }

      if (termToken.isWildcard) {
        return {
          type: 'prefix',
          value: termToken.value,
          isNegated: effectiveNegation,
        }
      }

      return {
        type: 'default',
        value: termToken.value,
        isNegated: effectiveNegation,
      }
    }

    // Skip unexpected operator
    consume()
    return null
  }

  // Parse OR-expression: Primary { "OR" Primary }
  // OR binds tighter than AND in Shopify syntax
  function parseOrExpr(): SearchNode {
    let left = parsePrimary()
    if (!left) {
      return { type: 'boolean', connective: 'AND', children: [] }
    }

    const orClauses: SearchNode[] = [left]

    while (peek()?.type === 'OR') {
      consume() // consume OR
      const right = parsePrimary()
      if (right) {
        orClauses.push(right)
      }
    }

    if (orClauses.length === 1) {
      return orClauses[0]
    }

    return {
      type: 'boolean',
      connective: 'OR',
      children: orClauses,
    }
  }

  // Parse AND-expression: OrExpr { [ "AND" ] OrExpr }
  function parseQuery(): SearchNode {
    const andClauses: SearchNode[] = []

    while (pos < tokens.length && peek()?.type !== 'RPAREN') {
      if (peek()?.type === 'AND') {
        consume() // optional explicit AND
      }

      const clause = parseOrExpr()
      if (clause) {
        andClauses.push(clause)
      }
    }

    if (andClauses.length === 0) {
      return { type: 'boolean', connective: 'AND', children: [] }
    }
    if (andClauses.length === 1) {
      return andClauses[0]
    }

    return {
      type: 'boolean',
      connective: 'AND',
      children: andClauses,
    }
  }

  const ast = parseQuery()
  return { ast, warnings }
}

/**
 * Top-level parser from query string to AST with diagnostics
 */
export function parseShopifySearchQuery(query: string): SearchSyntaxDebugResult {
  const rawQuery = query || ''
  const { tokens, warnings } = tokenizeShopifySearchQuery(rawQuery)
  const { ast, warnings: parseWarnings } = parseShopifySearchTokens(tokens, warnings)

  const allWarnings = [...warnings, ...parseWarnings]

  // Convert AST to Shopify-style 'parsed' structure for debugging (extensions.search)
  const parsed = convertAstToDebugParsed(ast)
  const formattedQuery = formatForShopifyGraphQL(ast)

  return {
    rawQuery,
    isValid: allWarnings.length === 0,
    ast,
    parsed,
    warnings: allWarnings,
    formattedQuery,
  }
}

function convertAstToDebugParsed(node: SearchNode): {
  and?: Array<Record<string, any>>
  or?: Array<Record<string, any>>
} {
  if (node.type === 'boolean' && node.connective === 'OR') {
    return {
      or: (node.children || []).map((c) => {
        if (c.type === 'field') {
          return { field: c.field, match: c.value, comparator: c.comparator }
        }
        return { field: 'default', match_all: c.value || '' }
      }),
    }
  }

  if (node.type === 'boolean' && node.connective === 'AND') {
    return {
      and: (node.children || []).map((c) => {
        if (c.type === 'field') {
          return { field: c.field, match: c.value, comparator: c.comparator }
        }
        return { field: 'default', match_all: c.value || '' }
      }),
    }
  }

  if (node.type === 'field') {
    return {
      and: [{ field: node.field, match: node.value, comparator: node.comparator }],
    }
  }

  return {
    and: [{ field: 'default', match_all: node.value || '' }],
  }
}

// -------------------------------------------------------------------------
// Formatter for Shopify GraphQL Storefront API
// -------------------------------------------------------------------------

/**
 * Format an AST or query string for safe use in Shopify GraphQL `products(query: "...")`
 * Preserves syntax while safely escaping quotes and unescaped characters.
 */
export function formatForShopifyGraphQL(input: string | SearchNode): string {
  let ast: SearchNode
  if (typeof input === 'string') {
    if (!input.trim()) return ''
    const { ast: parsedAst } = parseShopifySearchTokens(tokenizeShopifySearchQuery(input).tokens)
    ast = parsedAst
  } else {
    ast = input
  }

  function serialize(node: SearchNode): string {
    const negPrefix = node.isNegated ? '-' : ''

    switch (node.type) {
      case 'group': {
        const inner = (node.children || []).map(serialize).join(' ')
        return `${negPrefix}(${inner})`
      }
      case 'boolean': {
        if (!node.children || node.children.length === 0) return ''
        if (node.children.length === 1) return serialize(node.children[0])

        const sep = node.connective === 'OR' ? ' OR ' : ' '
        const inner = node.children.map(serialize).join(sep)
        return node.connective === 'OR' ? `(${inner})` : inner
      }
      case 'field': {
        const val = node.value || ''
        const quotedVal = val.includes(' ') && !val.startsWith('"') ? `"${val}"` : val
        return `${negPrefix}${node.field}${node.comparator || ':'}${quotedVal}`
      }
      case 'exists': {
        return `${negPrefix}${node.field}:*`
      }
      case 'phrase': {
        return `${negPrefix}"${node.value}"`
      }
      case 'prefix': {
        return `${negPrefix}${node.value}`
      }
      case 'default':
      default: {
        const val = node.value || ''
        if (val.includes(' ') && !val.startsWith('"')) {
          return `${negPrefix}"${val}"`
        }
        return `${negPrefix}${val}`
      }
    }
  }

  return serialize(ast).trim()
}

// -------------------------------------------------------------------------
// In-Memory Evaluator
// -------------------------------------------------------------------------

export interface SearchEvaluationOptions {
  /** Partial word match on the last search term ('last' | 'none') */
  prefix?: 'last' | 'none'
  /** Filter out unavailable products */
  onlyAvailable?: boolean
}

/**
 * Evaluates whether a Shopify product satisfies a parsed search query AST
 */
export function evaluateShopifyProduct(
  product: ShopifyProductNode,
  queryOrAst: string | SearchNode,
  options: SearchEvaluationOptions = {}
): boolean {
  let ast: SearchNode
  if (typeof queryOrAst === 'string') {
    if (!queryOrAst.trim()) return true
    const { ast: parsedAst } = parseShopifySearchTokens(
      tokenizeShopifySearchQuery(queryOrAst).tokens
    )
    ast = parsedAst
  } else {
    ast = queryOrAst
  }

  // Precompute searchable lowercase strings
  const title = (product.title || '').toLowerCase()
  const description = (product.description || '').toLowerCase()
  const vendor = (product.vendor || '').toLowerCase()
  const productType = (product.productType || '').toLowerCase()
  const handle = (product.handle || '').toLowerCase()
  const tags = (product.tags || []).map((t) => t.toLowerCase())
  const minPrice = parseFloat(product.priceRange?.minVariantPrice?.amount || '0')
  const maxPrice = parseFloat(product.priceRange?.maxVariantPrice?.amount || '0')
  const availableForSale = Boolean(product.availableForSale)

  function evaluateNode(node: SearchNode): boolean {
    let result = false

    switch (node.type) {
      case 'group': {
        if (!node.children || node.children.length === 0) return true
        result = node.children.every(evaluateNode)
        break
      }

      case 'boolean': {
        if (!node.children || node.children.length === 0) return true
        if (node.connective === 'OR') {
          result = node.children.some(evaluateNode)
        } else {
          result = node.children.every(evaluateNode)
        }
        break
      }

      case 'exists': {
        const f = (node.field || '').toLowerCase()
        if (f === 'tag' || f === 'tags') {
          result = tags.length > 0
        } else if (f === 'vendor') {
          result = Boolean(vendor)
        } else if (f === 'product_type') {
          result = Boolean(productType)
        } else if (f === 'price') {
          result = minPrice > 0
        } else {
          result = true
        }
        break
      }

      case 'field': {
        const f = (node.field || '').toLowerCase()
        const rawVal = (node.value || '').toLowerCase()
        const comp = node.comparator || ':'

        // Price comparator: price:>50, price:<=100
        if (f === 'price' || f === 'orders_count' || f === 'inventory_total') {
          const targetNum = parseFloat(rawVal)
          if (!isNaN(targetNum)) {
            if (comp === ':>') result = minPrice > targetNum
            else if (comp === ':>=') result = minPrice >= targetNum
            else if (comp === ':<') result = maxPrice < targetNum
            else if (comp === ':<=') result = maxPrice <= targetNum
            else result = minPrice <= targetNum && targetNum <= maxPrice
          } else {
            result = false
          }
          break
        }

        // Availability comparator: available_for_sale:true / false
        if (f === 'available_for_sale') {
          const targetBool = rawVal === 'true' || rawVal === '1'
          result = availableForSale === targetBool
          break
        }

        // Tag search: tag:oled, tag:samsung
        if (f === 'tag' || f === 'tags') {
          const cleanTag = rawVal.replace(/\*/g, '')
          result = tags.some((t) => (node.isPrefix ? t.startsWith(cleanTag) : t.includes(cleanTag)))
          break
        }

        // Vendor search: vendor:Samsung
        if (f === 'vendor') {
          const cleanVal = rawVal.replace(/\*/g, '')
          result = node.isPrefix ? vendor.startsWith(cleanVal) : vendor.includes(cleanVal)
          break
        }

        // Title search: title:Apple, title:head*
        if (f === 'title') {
          const cleanVal = rawVal.replace(/\*/g, '')
          result = node.isPrefix ? title.startsWith(cleanVal) || title.includes(` ${cleanVal}`) : title.includes(cleanVal)
          break
        }

        // Product type search: product_type:Screen
        if (f === 'product_type') {
          const cleanVal = rawVal.replace(/\*/g, '')
          result = node.isPrefix ? productType.startsWith(cleanVal) : productType.includes(cleanVal)
          break
        }

        // Handle or ID
        if (f === 'handle') {
          result = handle.includes(rawVal)
          break
        }

        // Default field fallback: check everywhere
        result =
          title.includes(rawVal) ||
          description.includes(rawVal) ||
          vendor.includes(rawVal) ||
          productType.includes(rawVal) ||
          tags.some((t) => t.includes(rawVal))
        break
      }

      case 'phrase': {
        const p = (node.value || '').toLowerCase()
        result =
          title.includes(p) ||
          description.includes(p) ||
          vendor.includes(p) ||
          productType.includes(p)
        break
      }

      case 'prefix': {
        const prefix = (node.value || '').replace(/\*$/, '').toLowerCase()
        result =
          wordsStartWith(title, prefix) ||
          wordsStartWith(vendor, prefix) ||
          wordsStartWith(productType, prefix) ||
          tags.some((t) => wordsStartWith(t, prefix))
        break
      }

      case 'default':
      default: {
        const val = (node.value || '').toLowerCase()
        if (!val) return true
        result =
          title.includes(val) ||
          description.includes(val) ||
          vendor.includes(val) ||
          productType.includes(val) ||
          tags.some((t) => t.includes(val))
        break
      }
    }

    return node.isNegated ? !result : result
  }

  return evaluateNode(ast)
}

function wordsStartWith(text: string, prefix: string): boolean {
  if (!text || !prefix) return false
  const words = text.split(/[\s\-_/,]+/)
  return words.some((w) => w.startsWith(prefix))
}
