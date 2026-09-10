import React, { useState, useRef, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Layers,
  SlidersHorizontal,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Zap,
  Check,
  RotateCcw,
  Send,
  Terminal,
  Palette,
  Eye,
  ExternalLink,
  Code,
  CheckCircle2,
  HelpCircle,
  BarChart3,
  Bookmark,
  ChevronRight,
  BookOpen,
  Boxes,
  Monitor,
  Lightbulb,
  MousePointerClick,
  Compass,
  Info,
} from 'lucide-react'

export interface TrendItem {
  id: string
  name: string
  badge: string
  badgeColor: string
  accentColor: string
  shortDesc: string
  bestPractice: string
  citations: string[]
  coreWebVitalsImpact: string
  idealFor: string[]
}

export const TRENDS_DATA: TrendItem[] = [
  {
    id: 'barely-there',
    name: 'Barely There UI (Hyper-Minimalism)',
    badge: 'Trend 01 — Clarity & Performance',
    badgeColor: 'bg-neutral-100 text-neutral-800 border-neutral-300',
    accentColor: '#171717',
    shortDesc:
      'Clean, stripped-down layouts inspired by major AI platforms feature skinny sans-serif fonts, dialed-back color palettes, and plenty of negative space.',
    bestPractice:
      'Prioritizing server-first performance and essential core tasks ensures ultra-fast loading times and maximum clarity.',
    citations: ['[1] Figma Resource Library', '[4] Performance Benchmarks'],
    coreWebVitalsImpact: 'LCP < 0.6s • CLS: 0.00 • INP < 30ms (Optimal)',
    idealFor: ['AI Search Interfaces', 'High-Speed B2B Portals', 'Focused Task Tools'],
  },
  {
    id: 'tactile-maximalism',
    name: 'Tactile Maximalism',
    badge: 'Trend 02 — High-Energy Expressive',
    badgeColor: 'bg-primary-50 text-primary-700 border-primary-300',
    accentColor: '#e05332',
    shortDesc:
      'Vibrant, overstimulating layouts combine asymmetrical elements, powerful colors, bold typography, and intense physical-world movement in neatly divided compartments.',
    bestPractice:
      'Utilizing component-driven layouts and functional motion design keeps heavy interactive animations smooth without hurting Core Web Vitals.',
    citations: ['[1] Figma Web Dev Trends', '[2] Wix Design Trends'],
    coreWebVitalsImpact: 'Hardware-accelerated transforms preserve 60 FPS & low INP',
    idealFor: ['Youth & Lifestyle Brands', 'Creative Studios', 'Drop Commerce'],
  },
  {
    id: 'nature-distilled',
    name: 'Nature Distilled',
    badge: 'Trend 03 — Organic & Warmth',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-300',
    accentColor: '#b45309',
    shortDesc:
      'Earthy, muted palettes celebrate warm organic tones like wood, soil, and clay paired with handcrafted or typewriter-style typography to bring warmth to digital screens.',
    bestPractice:
      'Pairing human-centric storytelling imagery with lightweight vector graphics keeps pages authentic while maintaining optimal asset sizes.',
    citations: ['[2] Wix Design Trends', '[5] Figma Human-Centric Research'],
    coreWebVitalsImpact: 'Vector SVG reduces image payload by up to 92% vs raw bitmaps',
    idealFor: ['Sustainable Goods', 'Craftsmanship Brands', 'Editorial Storytelling'],
  },
  {
    id: 'agentic-ai',
    name: 'Agentic and AI-Driven Interfaces',
    badge: 'Trend 04 — Autonomous & Conversational',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    accentColor: '#0d9488',
    shortDesc:
      'Conversational interactions move beyond basic static chatbots to integrate dynamic voice, smart text prompts, and contextual workflow capabilities right inside the browser.',
    bestPractice:
      'Adopting an API-first design and edge computing defaults ensures user queries are processed closer to the network edge for instantaneous feedback.',
    citations: ['[1] Figma Tech Trends', '[7] Edge & Agentic Architecture'],
    coreWebVitalsImpact: 'Edge streaming provides sub-50ms TTFB for contextual prompt queries',
    idealFor: ['Smart Storefronts', 'Technical Diagnostics', 'Workflow Automation'],
  },
  {
    id: '3d-glassmorphism',
    name: 'Immersive 3D and Glassmorphism 2.0',
    badge: 'Trend 05 — Depth & Tactile Realism',
    badgeColor: 'bg-sky-50 text-sky-800 border-sky-300',
    accentColor: '#0284c7',
    shortDesc:
      'Translucent frosted layers and interactive 3D product models create tactile depth, responsive scrolling worlds, and touchable realism.',
    bestPractice:
      'Following baseline-first browser features and leaner code optimization ensures high-impact visual effects degrade gracefully on lower-end mobile devices.',
    citations: ['[1] Figma Resource Library', '[2] Wix Blog', '[8] Progressive 3D Web'],
    coreWebVitalsImpact: 'Graceful CSS fallbacks prevent GPU memory thrashing on mobile',
    idealFor: ['Hardware Engineering', 'Luxury Electronics', 'Interactive Showrooms'],
  },
]

export const CITATIONS = [
  {
    id: '1',
    ref: '[1]',
    title: 'Figma Resource Library: Web Development Trends',
    url: 'https://www.figma.com/resource-library/web-development-trends/',
    description:
      'Detailed analysis on server-first architecture, barely-there interfaces, and component-driven performance benchmarks.',
  },
  {
    id: '2',
    ref: '[2]',
    title: 'Wix Blog: Web Design Trends & Human Connection',
    url: 'https://www.wix.com/blog/web-design-trends',
    description:
      'Exploration of nature-distilled warm organic palettes, tactile maximalism, and tactile depth in modern web layouts.',
  },
  {
    id: '3',
    ref: '[3]',
    title: 'Kinetic Movement & Divided Compartments',
    url: 'https://www.youtube.com/watch?v=waHuVF3XuMA',
    description:
      'Implementation patterns for high-energy layouts that decouple main thread work to maintain Core Web Vitals.',
  },
  {
    id: '4',
    ref: '[4]',
    title: 'Server-First Performance & Ultra-Fast Loading Times',
    url: 'https://www.youtube.com/watch?v=jqTC8sk__CQ',
    description:
      'Prioritizing edge rendering and essential task hydration to eliminate cumulative layout shift and latency.',
  },
  {
    id: '5',
    ref: '[5]',
    title: 'Figma Design Trends: Human-Centric Vector Graphics',
    url: 'https://www.figma.com/resource-library/web-design-trends/',
    description:
      'Best practices for replacing heavyweight raster artwork with scalable vectors and handcrafted typography.',
  },
  {
    id: '6',
    ref: '[6]',
    title: 'Tactile Interfaces & Asymmetrical Grid Compositions',
    url: 'https://www.youtube.com/watch?v=8ahnUt_A5eA',
    description:
      'How physical-world textures, haptic visual feedback, and asymmetrical compartments increase user engagement.',
  },
  {
    id: '7',
    ref: '[7]',
    title: 'GeeksforGeeks: Top Web Dev Trends & Edge Computing',
    url: 'https://www.geeksforgeeks.org/blogs/top-web-development-trends/',
    description:
      'API-first design, edge micro-services, and autonomous in-browser agentic workflow integrations.',
  },
  {
    id: '8',
    ref: '[8]',
    title: 'Modern 3D Web & Progressive Enhancement Baselines',
    url: 'https://www.youtube.com/watch?v=rFyOIWMwRdg',
    description:
      'Glassmorphism 2.0 with backdrop-filter CSS baseline fallbacks ensuring 100% device compatibility.',
  },
]

export const TrendsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'trends' | 'advisor' | 'citations'>('trends')
  const [selectedTrendId, setSelectedTrendId] = useState<string>('barely-there')

  // Interactive Playground states
  // 1. Barely there state
  const [barelyThereCleanMode, setBarelyThereCleanMode] = useState<boolean>(true)

  // 2. Tactile Maximalism state
  const [tactileColorIndex, setTactileColorIndex] = useState<number>(0)
  const [tactileCounter, setTactileCounter] = useState<number>(42)
  const [tactileBouncing, setTactileBouncing] = useState<boolean>(false)

  // 3. Nature Distilled state
  const [natureTheme, setNatureTheme] = useState<'terracotta' | 'clay' | 'timber' | 'moss'>('terracotta')

  // 4. Agentic AI state
  const [agentQuery, setAgentQuery] = useState<string>('')
  const [agentResponse, setAgentResponse] = useState<{
    text: string
    workflowAction?: string
    latencyMs: number
  } | null>({
    text: 'Agent ready. Click any smart prompt below or type your inquiry to test edge-computed contextual workflows.',
    latencyMs: 14,
  })
  const [agentStreaming, setAgentStreaming] = useState<boolean>(false)

  // 5. 3D Glassmorphism state
  const [glassBlur, setGlassBlur] = useState<number>(16)
  const [tiltOffset, setTiltOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [fallbackMode, setFallbackMode] = useState<boolean>(false)
  const glassCardRef = useRef<HTMLDivElement>(null)

  // Advisor State
  const [advisorProject, setAdvisorProject] = useState<string>('ecommerce')
  const [advisorStack, setAdvisorStack] = useState<string>('nextjs-shopify')

  // Handle 3D Tilt
  const handleMouseMove3D = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!glassCardRef.current || fallbackMode) return
    const rect = glassCardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setTiltOffset({ x: x * 22, y: -y * 22 })
  }

  const handleMouseLeave3D = () => {
    setTiltOffset({ x: 0, y: 0 })
  }

  // Handle Agentic Prompt click
  const runAgentPrompt = (prompt: string) => {
    setAgentQuery(prompt)
    setAgentStreaming(true)
    setAgentResponse(null)

    setTimeout(() => {
      let reply = ''
      let action = ''
      if (prompt.includes('120Hz') || prompt.includes('refresh rate')) {
        reply =
          'Found 3 OLED panel assemblies featuring native 120Hz LTPO variable refresh rate with sub-millimeter chassis tolerance.'
        action = 'Filter Catalog to 120Hz Assemblies'
      } else if (prompt.includes('OEM') || prompt.includes('digitizer')) {
        reply =
          'Factory OEM digitizers maintain calibrated 240Hz touch sampling rate and 100% DCI-P3 color gamut, unlike generic aftermarket layers.'
        action = 'View OEM Spec Sheet'
      } else if (prompt.includes('edge') || prompt.includes('latency')) {
        reply =
          'Edge workers deployed across global PoPs deliver sub-20ms TTFB directly from cloud caches with zero layout shift.'
        action = 'Run Live Edge Benchmark'
      } else {
        reply =
          `Contextual workflow initialized for "${prompt}". Analyzed hardware specifications, verified inventory in stock, and formulated edge response.`
        action = 'Explore Matching Parts'
      }

      setAgentResponse({
        text: reply,
        workflowAction: action,
        latencyMs: Math.floor(Math.random() * 12) + 11,
      })
      setAgentStreaming(false)
    }, 450)
  }

  // Advisor calculation
  const advisorRecommendation = useMemo(() => {
    if (advisorProject === 'ecommerce') {
      return {
        headline: 'Hybrid: Barely There Core with Tactile & Agentic Accents',
        primaryTrend: 'Barely There UI + Agentic Interfaces',
        rationale:
          'E-Commerce requires blistering server-first speeds (LCP < 1.2s) to maintain conversion rates, paired with dynamic in-browser agentic search prompts for high-intent shoppers.',
        bestPractices: [
          'Use Barely There UI for catalog grids and checkout to eliminate distraction and maximize Core Web Vitals.',
          'Deploy in-browser smart text prompts for instant part compatibility checks at the edge.',
          'Incorporate Glassmorphism 2.0 with strict baseline CSS fallbacks for interactive 3D product previews.',
        ],
        cwvTarget: '100% Green CWV: LCP < 0.8s, CLS: 0.00, INP < 50ms',
      }
    } else if (advisorProject === 'saas') {
      return {
        headline: 'Pure Barely There UI with Deep Agentic Workflows',
        primaryTrend: 'Barely There UI (Hyper-Minimalism)',
        rationale:
          'SaaS dashboards demand maximum clarity and cognitive focus. Skinny typography, generous whitespace, and edge-powered workflow prompts keep power users in flow state.',
        bestPractices: [
          'Strip away decorative gradients; focus on high-contrast data display and responsive negative space.',
          'Implement natural-language workflow command palettes (Cmd+K) right inside the browser.',
          'Prioritize server components and edge micro-caches to ensure zero dashboard render lag.',
        ],
        cwvTarget: 'Sub-30ms INP for high-frequency user interactions',
      }
    } else if (advisorProject === 'craftsmanship') {
      return {
        headline: 'Nature Distilled with Tactile Maximalist Micro-interactions',
        primaryTrend: 'Nature Distilled',
        rationale:
          'For artisanal, luxury, or sustainability-oriented projects, warm clay and timber palettes paired with serif/typewriter typography establish authentic emotional connection.',
        bestPractices: [
          'Pair human-centric photography with lightweight vector SVG contour lines.',
          'Adopt rich earthy tones: terracotta, sandstone, raw walnut, and forest sage.',
          'Use component-driven tactile animations on buttons and cart drawers.',
        ],
        cwvTarget: 'Under 500KB total page weight via SVG vector optimization',
      }
    } else {
      return {
        headline: 'Tactile Maximalism & Immersive 3D Showroom',
        primaryTrend: 'Tactile Maximalism + 3D Glassmorphism',
        rationale:
          'Creative portfolios and high-impact hardware showcases thrive on asymmetrical compartments, bold type, and responsive 3D tilt depth.',
        bestPractices: [
          'Divide viewports into bold, independent scrolling compartments.',
          'Use GPU-accelerated CSS transforms for silky 60 FPS motion without blocking the main thread.',
          'Provide seamless fallback styles for mobile devices without WebGL/backdrop-filter support.',
        ],
        cwvTarget: 'Smooth 60 FPS scrolling and guaranteed baseline degradation',
      }
    }
  }, [advisorProject])

  const currentTrend = TRENDS_DATA.find((t) => t.id === selectedTrendId) || TRENDS_DATA[0]

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header & Context Banner */}
      <div className="mb-8 bg-white border border-surface-stone rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-neutral-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Research Synthesis: Figma & Wix Insights [1, 2]</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-neutral-900 tracking-tight mb-2">
              Modern Web Development Styles & Trends
            </h1>
            <p className="text-sm sm:text-base text-neutral-600 max-w-3xl leading-relaxed">
              Blending high-performance engineering with expressive, human-centric design.
              Explore the five defining paradigms shaping modern digital experiences, complete
              with interactive architectural implementations and best practices.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-neutral-100 hover:bg-neutral-900 hover:text-white text-neutral-800 transition-colors shadow-xs"
            >
              <Compass className="w-4 h-4" />
              <span>Back to Storefront</span>
            </Link>
          </div>
        </div>

        {/* Global Navigation Tabs */}
        <div className="flex items-center gap-2 pt-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('trends')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'trends'
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Interactive Trend Explorer (5 Styles)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('advisor')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'advisor'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Project & Tech Stack Advisor</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('citations')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'citations'
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Citations & References [1–8]</span>
          </button>
        </div>
      </div>

      {/* TAB 1: INTERACTIVE TREND EXPLORER */}
      {activeTab === 'trends' && (
        <div className="space-y-8">
          {/* Trend Selector Cards Carousel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {TRENDS_DATA.map((trend, idx) => {
              const isSelected = trend.id === selectedTrendId
              return (
                <button
                  key={trend.id}
                  type="button"
                  onClick={() => setSelectedTrendId(trend.id)}
                  className={`p-4 rounded-xl text-left border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'bg-white border-neutral-900 shadow-md ring-2 ring-neutral-900/10'
                      : 'bg-white/80 hover:bg-white border-surface-stone hover:border-neutral-300 shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        {`0${idx + 1}`}
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-neutral-900 leading-snug mb-1">
                      {trend.name}
                    </h3>
                  </div>

                  <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] font-medium text-neutral-500">
                    <span>{isSelected ? 'Active Demo' : 'Inspect'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              )
            })}
          </div>

          {/* Detailed Trend Spotlight & Live Playground */}
          <div className="bg-white border border-surface-stone rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Conceptual Breakdown & Best Practices */}
              <div className="lg:col-span-6 space-y-6">
                <div>
                  <span
                    className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border mb-3 ${currentTrend.badgeColor}`}
                  >
                    {currentTrend.badge}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                    {currentTrend.name}
                  </h2>
                </div>

                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-neutral-700" />
                    Design Core & Visual Essence
                  </h4>
                  <p className="text-sm text-neutral-800 leading-relaxed font-normal">
                    {currentTrend.shortDesc}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-primary-50/60 border border-primary-200 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary-800 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-primary-600" />
                    Best Practice Implementation
                  </h4>
                  <p className="text-sm text-neutral-800 leading-relaxed font-medium">
                    {currentTrend.bestPractice}
                  </p>
                </div>

                {/* Technical Specs & Citations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-3.5 rounded-xl border border-neutral-200 bg-white">
                    <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                      Core Web Vitals Strategy
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 block">
                      {currentTrend.coreWebVitalsImpact}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-neutral-200 bg-white">
                    <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                      Research Citations
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentTrend.citations.map((c, i) => (
                        <span
                          key={i}
                          className="text-[11px] font-semibold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Ideal Use Cases */}
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block mb-2">
                    Recommended Applications
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {currentTrend.idealFor.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-neutral-100 text-neutral-800"
                      >
                        <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Live Sandbox */}
              <div className="lg:col-span-6 bg-neutral-900 text-white rounded-2xl p-6 shadow-xl border border-neutral-800 flex flex-col justify-between min-h-[480px]">
                <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
                    <span className="text-xs font-mono text-neutral-400 ml-2">
                      live-sandbox::{currentTrend.id}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded">
                    Interactive
                  </span>
                </div>

                {/* PLAYGROUND 1: BARELY THERE UI */}
                {selectedTrendId === 'barely-there' && (
                  <div className="flex-1 flex flex-col justify-between space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-neutral-400">
                        Layout State: {barelyThereCleanMode ? 'HYPER_MINIMAL' : 'STANDARD'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setBarelyThereCleanMode(!barelyThereCleanMode)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer"
                      >
                        Toggle Mode
                      </button>
                    </div>

                    <div
                      className={`transition-all duration-300 p-6 rounded-xl border ${
                        barelyThereCleanMode
                          ? 'bg-neutral-950 border-neutral-800'
                          : 'bg-neutral-800/80 border-neutral-700 shadow-md'
                      }`}
                    >
                      <span className="text-[11px] font-mono tracking-widest text-neutral-400 uppercase">
                        FIG. 01 — DISPLAY SPECIFICATION
                      </span>
                      <h3 className="text-2xl font-light tracking-wide text-neutral-100 my-2">
                        OLED Precision Digitizer
                      </h3>
                      <p className="text-xs text-neutral-400 font-normal leading-relaxed max-w-sm">
                        Zero unnecessary chrome. Skinny sans-serif type pairing with edge-delivered
                        low-latency component rendering.
                      </p>

                      <div className="mt-6 pt-4 border-t border-neutral-800/60 flex items-center justify-between text-xs font-mono">
                        <span className="text-neutral-400">$189.00 USD</span>
                        <button
                          type="button"
                          className="text-neutral-100 hover:text-white underline underline-offset-4 cursor-pointer"
                        >
                          Request Spec
                        </button>
                      </div>
                    </div>

                    {/* Performance telemetry widget */}
                    <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 text-center font-mono">
                      <div>
                        <span className="text-[10px] text-neutral-500 block">EDGE TTFB</span>
                        <span className="text-xs font-bold text-emerald-400">12ms</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 block">LCP</span>
                        <span className="text-xs font-bold text-emerald-400">0.42s</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 block">CLS</span>
                        <span className="text-xs font-bold text-emerald-400">0.000</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* PLAYGROUND 2: TACTILE MAXIMALISM */}
                {selectedTrendId === 'tactile-maximalism' && (
                  <div className="flex-1 flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-neutral-400">Asymmetrical Compartments</span>
                      <button
                        type="button"
                        onClick={() => setTactileColorIndex((prev) => (prev + 1) % 3)}
                        className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer font-mono"
                      >
                        Cycle Palette
                      </button>
                    </div>

                    {/* Compartment Bento */}
                    <div className="grid grid-cols-3 gap-2.5">
                      <div
                        className={`col-span-2 p-4 rounded-xl transition-all duration-300 ${
                          tactileColorIndex === 0
                            ? 'bg-primary-500 text-white'
                            : tactileColorIndex === 1
                            ? 'bg-sky-500 text-white'
                            : 'bg-emerald-500 text-white'
                        }`}
                      >
                        <span className="text-[10px] font-black uppercase tracking-wider block">
                          COMPARTMENT A
                        </span>
                        <h4 className="text-xl font-black uppercase tracking-tight mt-1">
                          Vibrant Kinetic Energy
                        </h4>
                      </div>

                      <div className="col-span-1 bg-yellow-400 text-neutral-950 p-3 rounded-xl flex flex-col justify-between font-black">
                        <span className="text-[10px] uppercase">FPS</span>
                        <span className="text-2xl leading-none">60</span>
                      </div>

                      <div className="col-span-1 bg-neutral-800 p-3 rounded-xl border border-neutral-700">
                        <span className="text-[10px] font-mono text-neutral-400 block">CLICKS</span>
                        <span className="text-xl font-bold text-white">{tactileCounter}</span>
                      </div>

                      <div className="col-span-2 bg-neutral-800 p-3 rounded-xl border border-neutral-700 flex items-center justify-between">
                        <span className="text-xs text-neutral-300 font-medium">Haptic Feedback:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setTactileCounter((c) => c + 1)
                            setTactileBouncing(true)
                            setTimeout(() => setTactileBouncing(false), 200)
                          }}
                          className={`px-4 py-2 rounded-lg font-bold text-xs uppercase bg-white text-neutral-950 shadow-lg cursor-pointer transition-transform ${
                            tactileBouncing ? 'scale-90 bg-primary-400 text-white' : 'hover:scale-105 active:scale-95'
                          }`}
                        >
                          Trigger Pulse
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-neutral-400 text-center">
                      Functional motion runs on compositor thread to protect Core Web Vitals (INP).
                    </div>
                  </div>
                )}

                {/* PLAYGROUND 3: NATURE DISTILLED */}
                {selectedTrendId === 'nature-distilled' && (
                  <div className="flex-1 flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-neutral-400">Organic Palette</span>
                      <div className="flex gap-1.5">
                        {(['terracotta', 'clay', 'timber', 'moss'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setNatureTheme(t)}
                            className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                              natureTheme === t ? 'border-white scale-110' : 'border-transparent opacity-70'
                            } ${
                              t === 'terracotta'
                                ? 'bg-[#c86b51]'
                                : t === 'clay'
                                ? 'bg-[#b8860b]'
                                : t === 'timber'
                                ? 'bg-[#8c5c3e]'
                                : 'bg-[#4a6b5d]'
                            }`}
                            title={t}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Earthy Card with Typewriter Typography */}
                    <div
                      className="p-6 rounded-xl transition-all duration-500 border border-white/10 relative overflow-hidden"
                      style={{
                        backgroundColor:
                          natureTheme === 'terracotta'
                            ? '#2b1b17'
                            : natureTheme === 'clay'
                            ? '#282315'
                            : natureTheme === 'timber'
                            ? '#241b16'
                            : '#16231c',
                      }}
                    >
                      {/* Organic SVG contour background */}
                      <svg
                        className="absolute -right-8 -bottom-8 w-44 h-44 text-white/5 pointer-events-none"
                        viewBox="0 0 200 200"
                        fill="currentColor"
                      >
                        <path d="M42.7,-62.9C53.8,-53.4,60.2,-39.7,64.4,-25.7C68.6,-11.7,70.5,2.6,67.1,16.2C63.7,29.8,55,42.8,43.4,52.3C31.8,61.9,17.3,68,-0.1,68.1C-17.5,68.2,-34.1,62.3,-46.8,52.2C-59.5,42.1,-68.3,27.8,-71.4,12.1C-74.5,-3.6,-71.9,-20.7,-63.4,-33.9C-54.9,-47.1,-40.5,-56.4,-26,-64.1C-11.5,-71.8,3.2,-77.9,17.4,-75.8C31.6,-73.7,45.3,-63.4,42.7,-62.9Z" />
                      </svg>

                      <span className="font-mono text-[11px] text-amber-200/70 uppercase tracking-widest block mb-2">
                        CRAFTSMANSHIP & STORYTELLING
                      </span>
                      <h4 className="font-serif text-xl text-amber-100 font-semibold mb-2">
                        Organic Calibrated Optical Glass
                      </h4>
                      <p className="font-mono text-xs text-amber-200/80 leading-relaxed max-w-sm">
                        Earthy, handcrafted tones celebrate tactile warmth on high-res digital screens.
                        Engineered with lightweight vector assets.
                      </p>

                      <div className="mt-5 flex items-center gap-3">
                        <span className="text-[11px] font-mono px-2 py-1 rounded bg-white/10 text-amber-100">
                          SVG Weight: 2.1 KB
                        </span>
                        <span className="text-[11px] font-mono text-emerald-400">
                          -94% vs Bitmap
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-neutral-400 text-center">
                      Human-centric warmth reduces screen fatigue while maintaining featherlight payloads.
                    </div>
                  </div>
                )}

                {/* PLAYGROUND 4: AGENTIC AI INTERFACES */}
                {selectedTrendId === 'agentic-ai' && (
                  <div className="flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-neutral-400">
                          Contextual Edge Agent
                        </span>
                        <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Sub-20ms PoP Ready
                        </span>
                      </div>

                      {/* Prompt Response Box */}
                      <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 min-h-[140px] flex flex-col justify-between">
                        {agentStreaming ? (
                          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 py-4">
                            <div className="w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            <span>Processing agentic workflow at network edge...</span>
                          </div>
                        ) : agentResponse ? (
                          <div className="space-y-3">
                            <p className="text-xs font-mono text-neutral-200 leading-relaxed">
                              {agentResponse.text}
                            </p>
                            {agentResponse.workflowAction && (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white transition-colors cursor-pointer"
                              >
                                <span>{agentResponse.workflowAction}</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : null}

                        <div className="pt-2 mt-2 border-t border-neutral-900 flex items-center justify-between text-[10px] font-mono text-neutral-500">
                          <span>Model: Edge-Inference-3.5</span>
                          <span>Latency: {agentResponse?.latencyMs || 14}ms</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Smart Text Prompt Chips */}
                    <div>
                      <span className="text-[10px] font-mono uppercase text-neutral-500 block mb-1.5">
                        Test Suggested Contextual Prompts:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          'Find screens with 120Hz refresh rate',
                          'Compare OEM digitizer vs aftermarket glass',
                          'Check edge latency for North America',
                        ].map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => runAgentPrompt(p)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer text-left"
                          >
                            &gt; {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* PLAYGROUND 5: 3D & GLASSMORPHISM 2.0 */}
                {selectedTrendId === '3d-glassmorphism' && (
                  <div className="flex-1 flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-neutral-400">Interactive 3D Tilt</span>
                      <div className="flex items-center gap-3">
                        <label className="text-[11px] font-mono text-neutral-400 flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fallbackMode}
                            onChange={(e) => setFallbackMode(e.target.checked)}
                            className="rounded accent-primary-500"
                          />
                          <span>Baseline Fallback</span>
                        </label>
                      </div>
                    </div>

                    {/* Tilt Canvas Area */}
                    <div
                      ref={glassCardRef}
                      onMouseMove={handleMouseMove3D}
                      onMouseLeave={handleMouseLeave3D}
                      className="relative h-44 rounded-xl overflow-hidden flex items-center justify-center p-4 cursor-crosshair select-none bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 border border-neutral-800"
                      style={{ perspective: 1000 }}
                    >
                      {/* Background decorative geometry */}
                      <div className="absolute top-2 left-4 w-16 h-16 rounded-full bg-primary-500/30 blur-md pointer-events-none" />
                      <div className="absolute bottom-2 right-4 w-20 h-20 rounded-full bg-sky-500/25 blur-lg pointer-events-none" />

                      {/* 3D Glass Layer */}
                      <div
                        className={`w-full max-w-xs p-4 rounded-xl transition-transform duration-75 relative z-10 ${
                          fallbackMode
                            ? 'bg-neutral-900 border-2 border-white/80 shadow-none'
                            : 'bg-white/10 border border-white/25 shadow-2xl'
                        }`}
                        style={{
                          backdropFilter: fallbackMode ? 'none' : `blur(${glassBlur}px)`,
                          WebkitBackdropFilter: fallbackMode ? 'none' : `blur(${glassBlur}px)`,
                          transform: fallbackMode
                            ? 'none'
                            : `rotateX(${tiltOffset.y}deg) rotateY(${tiltOffset.x}deg)`,
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono text-white/70 uppercase">
                            GLASSMORPHISM 2.0
                          </span>
                          <span className="text-[10px] font-mono bg-white/20 text-white px-2 py-0.5 rounded">
                            {fallbackMode ? 'CSS Baseline' : `${glassBlur}px Blur`}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">Tactile Optical Depth</h4>
                        <p className="text-[11px] text-white/80 mt-1 leading-snug">
                          Specular refraction reacts to mouse position with progressive browser
                          enhancement.
                        </p>
                      </div>
                    </div>

                    {/* Blur Slider Control */}
                    {!fallbackMode && (
                      <div className="flex items-center gap-3 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                        <span className="text-[10px] font-mono text-neutral-400">BLUR:</span>
                        <input
                          type="range"
                          min="4"
                          max="28"
                          value={glassBlur}
                          onChange={(e) => setGlassBlur(Number(e.target.value))}
                          className="w-full accent-primary-500 cursor-pointer h-1.5"
                        />
                        <span className="text-xs font-mono text-neutral-300 w-8 text-right">
                          {glassBlur}px
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Playground footer instruction */}
                <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-[11px] font-mono text-neutral-500">
                  <span>Interactive Live Sandbox</span>
                  <span className="text-primary-400 hover:underline cursor-pointer" onClick={() => setSelectedTrendId(selectedTrendId)}>
                    Reset Demo
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROJECT & TECH STACK ADVISOR */}
      {activeTab === 'advisor' && (
        <div className="space-y-8">
          <div className="bg-white border border-surface-stone rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="max-w-2xl mb-8">
              <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-primary-50 text-primary-700 border border-primary-200 mb-2">
                Interactive Architecture Consultation
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight mb-2">
                Find the Right Trend for Your Project
              </h2>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Select your application type and technology stack to generate a customized
                implementation strategy backed by Figma and Wix performance research.
              </p>
            </div>

            {/* Selection Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8 border-b border-neutral-100">
              {/* Project Type */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-primary-600" />
                  1. Select Application Type:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'ecommerce', label: 'E-Commerce Storefront' },
                    { id: 'saas', label: 'SaaS & AI Platform' },
                    { id: 'craftsmanship', label: 'Artisanal & Craftsmanship' },
                    { id: 'portfolio', label: 'High-Impact Portfolio' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setAdvisorProject(p.id)}
                      className={`p-3 rounded-xl text-left border text-xs font-semibold transition-all cursor-pointer ${
                        advisorProject === p.id
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                          : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tech Stack */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-primary-600" />
                  2. Select Primary Tech Stack:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'nextjs-shopify', label: 'Next.js 15+ & Headless Shopify' },
                    { id: 'tailwind-edge', label: 'Tailwind v4 & Edge Workers' },
                    { id: 'builder-cms', label: 'Builder.io CMS & Islands' },
                    { id: 'react-vanilla', label: 'React SPA & Client State' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setAdvisorStack(s.id)}
                      className={`p-3 rounded-xl text-left border text-xs font-semibold transition-all cursor-pointer ${
                        advisorStack === s.id
                          ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                          : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Generated Advisor Synthesis Result */}
            <div className="mt-8 pt-2">
              <div className="bg-neutral-900 text-white rounded-2xl p-6 sm:p-8 shadow-lg border border-neutral-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-widest text-primary-400 block mb-1">
                      RECOMMENDED ARCHITECTURAL SYNTHESIS
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      {advisorRecommendation.headline}
                    </h3>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs font-mono text-emerald-400 shrink-0">
                    {advisorRecommendation.cwvTarget}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                  <div className="lg:col-span-5 space-y-4">
                    <div>
                      <span className="text-xs font-mono text-neutral-400 block mb-1">
                        Strategic Rationale:
                      </span>
                      <p className="text-sm text-neutral-300 leading-relaxed">
                        {advisorRecommendation.rationale}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                      <span className="text-[11px] font-mono text-neutral-400 block mb-1">
                        Active Stack Profile:
                      </span>
                      <span className="text-xs font-bold text-white uppercase">
                        {advisorProject} • {advisorStack}
                      </span>
                    </div>
                  </div>

                  <div className="lg:col-span-7 space-y-3">
                    <span className="text-xs font-mono text-neutral-400 block">
                      Prescribed Best-Practice Implementation Steps:
                    </span>
                    <div className="space-y-2.5">
                      {advisorRecommendation.bestPractices.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-950/80 border border-neutral-800"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-xs text-neutral-200 leading-relaxed font-medium">
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CITATIONS & REFERENCES */}
      {activeTab === 'citations' && (
        <div className="bg-white border border-surface-stone rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="max-w-2xl mb-8">
            <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-neutral-100 text-neutral-800 border border-neutral-300 mb-2">
              Academic & Industry References
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight mb-2">
              Sources, Benchmarks & Insights
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              These design systems and implementation practices are derived directly from the
              latest research published by Figma, Wix, and the web engineering community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CITATIONS.map((cit) => (
              <a
                key={cit.id}
                href={cit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-5 rounded-xl border border-surface-stone hover:border-neutral-400 hover:shadow-md transition-all bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                      {cit.ref}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-900 transition-colors" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 group-hover:text-primary-600 transition-colors leading-snug mb-1.5">
                    {cit.title}
                  </h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {cit.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-100 text-[11px] font-mono text-neutral-400 group-hover:text-neutral-700 truncate">
                  {cit.url}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TrendsHub
