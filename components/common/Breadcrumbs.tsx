import React from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
  isCurrent?: boolean
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  showHomeIcon?: boolean
  className?: string
  id?: string
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  showHomeIcon = true,
  className = '',
  id = 'breadcrumb-nav',
}) => {
  if (!items || items.length === 0) {
    return null
  }

  // Generate JSON-LD schema for SEO BreadcrumbList
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: item.href } : {}),
    })),
  }

  return (
    <nav
      id={id}
      aria-label="Breadcrumb"
      className={`py-2 px-1 text-xs text-neutral-500 font-medium ${className}`}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ol
        itemScope
        itemType="https://schema.org/BreadcrumbList"
        className="flex items-center flex-wrap gap-1.5 leading-none"
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
              className="inline-flex items-center gap-1.5"
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
                  className="text-neutral-900 font-semibold truncate max-w-[180px] sm:max-w-xs md:max-w-md"
                  title={item.label}
                >
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  itemProp="item"
                  className="inline-flex items-center gap-1 text-neutral-500 hover:text-primary-600 hover:underline transition-colors focus:outline-hidden focus:ring-1 focus:ring-primary-500 rounded-xs"
                >
                  {isFirst && showHomeIcon && (
                    <Home className="w-3.5 h-3.5 text-neutral-400 group-hover:text-primary-600 shrink-0" />
                  )}
                  <span itemProp="name">{item.label}</span>
                </Link>
              ) : (
                <span itemProp="name" className="text-neutral-500">
                  {item.label}
                </span>
              )}

              <meta itemProp="position" content={String(index + 1)} />
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumbs
