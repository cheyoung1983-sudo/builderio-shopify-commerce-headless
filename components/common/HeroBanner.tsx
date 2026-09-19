import React, { useState } from 'react'
import Image from 'next/image'
import { Sparkles, Layers, SlidersHorizontal, ArrowRight, ShieldCheck, Cpu } from 'lucide-react'
import { PRODUCT_IMAGE_BLUR_DATA_URL, RESPONSIVE_IMAGE_SIZES } from '../../lib/image'

export interface HeroSlide {
  id: string
  title: string
  subtitle: string
  tag: string
  badgeColor: string
  image: string
  aspectRatio: string
}

export const HERO_ILLUSTRATIONS: HeroSlide[] = [
  {
    id: 'display-layers',
    title: 'Precision Display Glass & Digitizers',
    subtitle: 'Calibrated OEM multi-layer capacitive assemblies engineered for sub-millimeter chassis fit and instantaneous touch latency.',
    tag: 'FIG. 01 — DISPLAY LAYERS',
    badgeColor: 'bg-primary-50 text-primary-600 border-primary-200',
    image: '/assets/heroes/hero-display-layers.png',
    aspectRatio: '16/9',
  },
  {
    id: 'optical-spectrum',
    title: 'Factory-Calibrated Color Gamut',
    subtitle: '100% DCI-P3 wide color gamut coverage with anti-reflective sapphire optical coatings for sunlight legibility.',
    tag: 'FIG. 02 — OPTICAL DISPERSION',
    badgeColor: 'bg-secondary-50 text-secondary-600 border-secondary-200',
    image: '/assets/heroes/hero-optical-spectrum.png',
    aspectRatio: '16/9',
  },
  {
    id: 'matrix-assembly',
    title: 'Interconnect Ribbons & Touch ICs',
    subtitle: 'High-density gold-plated micro-flex cables and integrated driver ICs delivering pristine signal fidelity and durability.',
    tag: 'FIG. 03 — INTERCONNECT MATRIX',
    badgeColor: 'bg-brass-50 text-brass-700 border-brass-200',
    image: '/assets/heroes/hero-matrix-assembly.png',
    aspectRatio: '16/9',
  },
]

export const HeroBanner: React.FC<{
  className?: string
  initialIndex?: number
  showTabs?: boolean
}> = ({ className = '', initialIndex = 0, showTabs = true }) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const current = HERO_ILLUSTRATIONS[activeIndex]

  return (
    <section
      id="hero-banner"
      className={`relative w-full max-w-7xl mx-auto mb-8 rounded-2xl overflow-hidden bg-surface border border-surface-stone shadow-sm ${className}`}
    >
      {/* Visual Canvas */}
      <div className="relative w-full aspect-[16/9] md:aspect-[21/9] lg:aspect-[24/10] bg-canvas overflow-hidden">
        <Image
          src={current.image}
          alt={current.title}
          fill
          priority
          placeholder="blur"
          blurDataURL={PRODUCT_IMAGE_BLUR_DATA_URL}
          sizes={RESPONSIVE_IMAGE_SIZES.heroBanner}
          quality={85}
          className="object-cover object-center transition-all duration-500 ease-out"
          referrerPolicy="no-referrer"
        />

        {/* Ambient Overlay for Crisp Legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-ink-950/20 to-transparent lg:bg-gradient-to-r lg:from-ink-950/80 lg:via-ink-950/40 lg:to-transparent flex items-end lg:items-center p-6 sm:p-8 lg:p-12">
          <div className="max-w-xl text-white">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 backdrop-blur-md bg-white/10 text-white border border-white/20`}
            >
              <Sparkles className="w-3 h-3 text-primary-400" />
              {current.tag}
            </span>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white mb-2 leading-tight">
              {current.title}
            </h1>

            <p className="text-sm sm:text-base text-ink-200 line-clamp-2 sm:line-clamp-3 mb-4 leading-relaxed font-normal">
              {current.subtitle}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#catalog"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                Shop Display Parts
                <ArrowRight className="w-4 h-4" />
              </a>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-ink-300">
                <ShieldCheck className="w-4 h-4 text-secondary-400" />
                OEM Grade Tested
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Tabs / Switcher */}
      {showTabs && (
        <div className="bg-canvas border-t border-surface-stone px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider mr-2 hidden sm:inline">
              Hero Previews:
            </span>
            {HERO_ILLUSTRATIONS.map((slide, idx) => {
              const isActive = idx === activeIndex
              return (
                <button
                  key={slide.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-surface text-ink-900 shadow-xs border border-surface-stone font-semibold'
                      : 'text-ink-600 hover:text-ink-900 hover:bg-surface-muted'
                  }`}
                  aria-pressed={isActive}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive ? 'bg-primary-500 ring-2 ring-primary-200' : 'bg-ink-400'
                    }`}
                  />
                  <span>{slide.tag.split('—')[1]?.trim() || slide.tag}</span>
                </button>
              )
            })}
          </div>

          <div className="text-xs text-ink-500 hidden md:block">
            Kyoto Precision &amp; Persimmon Series (16:9)
          </div>
        </div>
      )}
    </section>
  )
}

export default HeroBanner
