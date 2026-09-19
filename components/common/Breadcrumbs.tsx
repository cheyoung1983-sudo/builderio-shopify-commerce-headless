import React from 'react'
import Link from 'next/link'
import { ChevronRight, Home, ArrowLeft } from 'lucide-react'
import { getBaseUrl } from '../../lib/seo'

export interface BreadcrumbItem {
  label: string
  href?: string
  isCurrent?: boolean
  count?: number
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  showHomeIcon?: boolean
  showBackOnMobile?: boolean
  variant?: 'minimal' | 'contained' | 'card'
  className?: string
  id?: string
  siteUrl?: string
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  showHomeIcon = true,
  showBackOnMobile = false,
  variant = 'minimal',
  className = '',
  id = 'breadcrumb-nav',
  siteUrl,
}) => {
  if (!items || items.length === 0) {
    return null
  }

  const baseUrl = siteUrl || getBaseUrl()

  // Generate Schema.org compliant JSON-LD schema for SEO BreadcrumbList
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => {
      let targetUrl = baseUrl
      if (item.href) {
        targetUrl = item.href.startsWith('http') ? item.href : `${baseUrl}${item.href}`
      }
      return {
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: targetUrl,
      }
    }),
  }

  // Find parent item for mobile quick-back navigation
  const parentItem = items.length >= 2 ? items[items.length - 2] : null

  // Variant styling
  const variantStyles = {
    minimal: 'py-2 px-1 text-xs text-neutral-500 font-medium',
    contained:
      'py-2.5 px-3.5 sm:px-4 text-xs font-medium bg-white/80 backdrop-blur-xs border border-neutral-200/80 rounded-xl shadow-2xs text-neutral-600',
    card:
      'p-3 sm:p-4 text-xs font-medium bg-white border border-neutral-200 rounded-2xl shadow-xs text-neutral-600',
  }

  return (
    <nav
      id={id}
      aria-label="Breadcrumb"
      className={`transition-colors ${variantStyles[variant] || variantStyles.minimal} ${className}`}
    >
      <script
        type="application/ld+json"
        // Escape "<" to prevent script injection (standard JSON-LD mitigation)
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <div className="flex items-center justify-between gap-3 w-full">
        {/* Mobile Quick-Back Navigation (Visible on narrow viewports if enabled) */}
        {showBackOnMobile && parentItem && parentItem.href && (
          <div className="sm:hidden flex items-center shrink-0">
            <Link
              href={parentItem.href}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-emerald-700 transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-sm py-0.5"
              aria-label={`Back to ${parentItem.label}`}
            >
              <ArrowLeft className="w-3.5 h-3.5 text-neutral-500 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-[140px]">Back to {parentItem.label}</span>
            </Link>
          </div>
        )}

        {/* Structured Breadcrumbs Trail */}
        <ol
          itemScope
          itemType="https://schema.org/BreadcrumbList"
          className={`flex items-center flex-wrap gap-1.5 leading-none overflow-x-auto scrollbar-none py-0.5 ${
            showBackOnMobile && parentItem ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {items.map((item, index) => {
            const isLast = index === items.length - 1 || item.isCurrent
            const isFirst = index === 0

            return (
              <li
                key={`${item.label}-${index}`}
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
                className="inline-flex items-center gap-1.5 shrink-0"
              >
                {index > 0 && (
                  <ChevronRight
                    className="w-3.5 h-3.5 text-neutral-400 shrink-0 select-none"
                    aria-hidden="true"
                  />
                )}

                {isLast ? (
                  <span
                    itemProp="name"
                    aria-current="page"
                    className="text-neutral-900 font-semibold truncate max-w-[200px] sm:max-w-sm md:max-w-lg inline-flex items-center gap-1"
                    title={item.label}
                  >
                    <span>{item.label}</span>
                    {typeof item.count === 'number' && (
                      <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 bg-neutral-100 rounded-full border border-neutral-200/60">
                        {item.count}
                      </span>
                    )}
                  </span>
                ) : item.href ? (
                  <Link
                    href={item.href}
                    itemProp="item"
                    className="group inline-flex items-center gap-1 text-neutral-500 hover:text-emerald-700 hover:underline transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-sm"
                  >
                    {isFirst && showHomeIcon && (
                      <Home className="w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-700 shrink-0 transition-colors" />
                    )}
                    <span itemProp="name">{item.label}</span>
                    {typeof item.count === 'number' && (
                      <span className="ml-0.5 text-[10px] text-neutral-600">({item.count})</span>
                    )}
                  </Link>
                ) : (
                  <span itemProp="name" className="text-neutral-500 inline-flex items-center gap-1">
                    <span>{item.label}</span>
                    {typeof item.count === 'number' && (
                      <span className="ml-0.5 text-[10px] text-neutral-600">({item.count})</span>
                    )}
                  </span>
                )}

                <meta
                  itemProp="item"
                  content={
                    item.href
                      ? item.href.startsWith('http')
                        ? item.href
                        : `${baseUrl}${item.href}`
                      : baseUrl
                  }
                />
                <meta itemProp="position" content={String(index + 1)} />
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}

export default Breadcrumbs
