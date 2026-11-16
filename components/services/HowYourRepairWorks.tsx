import React from 'react'

/**
 * "How Your Repair Works": the customer-facing two-track infographic (on-site in the
 * Spokane area, and mail-in), built as real, accessible text instead of a flat image.
 *
 * Copy rules (Ryan, Nov 15 2026):
 *  - The $40 mail-in charge is deliberately left unnamed ("diagnostic fee" vs
 *    "mail-in kit" is still undecided).
 *  - The kit includes a prepaid label for sending the device to us; returns go by
 *    ground shipping. No turnaround-time promises and no online status tracking.
 *  - There is no walk-in storefront, so no drop-off or pick-up step.
 */

type Step = { title: string; body: string }

type Track = {
  id: string
  title: string
  subtitle: string
  steps: Step[]
  accent: {
    header: string
    badge: string
    border: string
    connector: string
  }
  Icon: (props: { className?: string }) => React.ReactElement
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </svg>
  )
}

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="m3 8 9 5 9-5" />
      <path d="M12 13v8" />
    </svg>
  )
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" />
    </svg>
  )
}

export const ON_SITE_STEPS: Step[] = [
  { title: 'Book online', body: 'Choose your repair at displaycellpros.com and book a visit.' },
  { title: 'We come to you', body: 'A technician comes to you in the Spokane area. On-site visits have a $25 trip fee.' },
  { title: 'We diagnose', body: 'The technician checks your device and confirms the right part.' },
  { title: 'We repair it', body: 'We install a quality part.' },
  { title: 'Test and hand back', body: 'We test your device before we hand it back to you.' },
]

export const MAIL_IN_STEPS: Step[] = [
  { title: 'Request a kit online', body: 'Tell us your device and the problem. Pay $40 and we mail you a kit. The $40 is credited toward an approved repair.' },
  { title: 'We send your kit', body: 'It has protective packing, instructions, and a prepaid label for sending your device to us.' },
  { title: 'Ship your device', body: 'Pack it up and send it to us with the included label.' },
  { title: 'We diagnose and repair', body: 'We confirm the problem with you before we repair it, then install a quality part.' },
  { title: 'We ship it back', body: 'Your repaired device comes back to you by ground shipping.' },
]

const TRACKS: Track[] = [
  {
    id: 'on-site',
    title: 'On-Site Repair',
    subtitle: 'We come to you in the Spokane area',
    steps: ON_SITE_STEPS,
    accent: {
      header: 'bg-blue-700',
      badge: 'bg-blue-700',
      border: 'border-blue-200',
      connector: 'bg-blue-200',
    },
    Icon: HomeIcon,
  },
  {
    id: 'mail-in',
    title: 'Mail-In Repair',
    subtitle: 'Ship your device to us',
    steps: MAIL_IN_STEPS,
    accent: {
      header: 'bg-emerald-700',
      badge: 'bg-emerald-700',
      border: 'border-emerald-200',
      connector: 'bg-emerald-200',
    },
    Icon: BoxIcon,
  },
]

export interface HowYourRepairWorksProps {
  className?: string
  /** Heading level for the section title (default h2). */
  headingLevel?: 'h2' | 'h3'
}

export function HowYourRepairWorks({ className = '', headingLevel = 'h2' }: HowYourRepairWorksProps) {
  const Heading = headingLevel
  const SubHeading = headingLevel === 'h2' ? 'h3' : 'h4'
  return (
    <section
      id="how-your-repair-works"
      aria-labelledby="how-your-repair-works-title"
      className={`scroll-mt-20 rounded-2xl border border-neutral-200 bg-white overflow-hidden ${className}`}
    >
      <div className="bg-slate-900 px-6 py-6 text-center">
        <Heading id="how-your-repair-works-title" className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          How Your Repair Works
        </Heading>
        <p className="mt-1 text-sm text-slate-200">Display &amp; Cell Pros &middot; Spokane, WA</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 sm:p-6">
        {TRACKS.map((track) => (
          <div key={track.id} className="flex flex-col">
            <div className={`${track.accent.header} rounded-xl px-5 py-4 text-white flex items-center gap-3`}>
              <track.Icon className="w-7 h-7 shrink-0" />
              <div>
                <SubHeading id={`how-your-repair-works-${track.id}`} className="text-lg font-bold leading-tight">
                  {track.title}
                </SubHeading>
                <p className="text-sm text-white/90">{track.subtitle}</p>
              </div>
            </div>

            <ol aria-labelledby={`how-your-repair-works-${track.id}`} className="mt-4 flex flex-col">
              {track.steps.map((step, index) => (
                <li key={step.title} className="relative flex gap-4 pb-4 last:pb-0">
                  {index < track.steps.length - 1 && (
                    <span aria-hidden="true" className={`absolute left-5 top-11 bottom-0 w-0.5 -translate-x-1/2 ${track.accent.connector}`} />
                  )}
                  <span
                    aria-hidden="true"
                    className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold text-white ${track.accent.badge}`}
                  >
                    {index + 1}
                  </span>
                  <div className={`flex-1 rounded-xl border ${track.accent.border} bg-white px-4 py-3`}>
                    <p className="text-base font-bold text-slate-900">
                      <span className="sr-only">Step {index + 1}: </span>
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-700 leading-relaxed">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 rounded-xl bg-slate-900 px-5 py-4 text-center text-white">
        <p className="inline-flex items-center justify-center gap-2 text-base font-bold">
          <PhoneIcon className="w-5 h-5" />
          <span>
            Questions? Call{' '}
            <a href="tel:+15092553852" className="underline decoration-2 underline-offset-2 hover:text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded">
              (509) 255-3852
            </a>
          </span>
        </p>
      </div>
    </section>
  )
}

export default HowYourRepairWorks
