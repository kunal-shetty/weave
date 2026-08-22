"use client"

import { useEffect } from "react"
import { useAppSelector } from "@/store/hooks"

// ─── Stable fieldId mapping (Rule R1) ───────────────────────────────
const ids = {
  brandBadge: "8472910365",
  headlineMain: "6204981735",
  headlineSub: "9153720486",
  description: "3847102956",
  heroImage: "2059384716",
  ctaButton: "4738291056",
  statCards: "5920481736",
  stat1Value: "1029384756",
  stat2Value: "6382910475",
  stat3Value: "7591028364",
}

// ─── Default fallback content (Rule R5, R7, R9) ─────────────────────
const DEFAULTS: Record<string, string> = {
  [ids.brandBadge]: "PULSE FIT",
  [ids.headlineMain]: "CHALLENGE YOUR LIMITS",
  [ids.headlineSub]: "Be a part of the tribe that's limitless.",
  [ids.description]:
    "Join trainer-led workout sessions designed to kickstart your fitness journey.",
  [ids.heroImage]: "/placeholder.jpg",
  [ids.ctaButton]: "FIND A WORKOUT",
  [ids.stat1Value]: "1000+",
  [ids.stat2Value]: "40+",
  [ids.stat3Value]: "150+",
}

const DEFAULT_LOOP = [
  { fieldId: ids.stat1Value, value: "1000+", label: "Community Members" },
  { fieldId: ids.stat2Value, value: "40+", label: "Fitness Programmes" },
  { fieldId: ids.stat3Value, value: "150+", label: "Fitness Channels" },
]

// ─── Storage URL prefix (Rule R7) ───────────────────────────────────
const VITE_STORAGE_URL = process.env.NEXT_PUBLIC_VITE_STORAGE_URL || ""

function getImage(src: string): string {
  if (!src || src === "/placeholder.jpg") return "/placeholder.jpg"
  if (src.startsWith("http")) return src
  return `${VITE_STORAGE_URL}${src}`
}

// ─── Sanitise HTML (allow-list: b, i, br, span, strong, em) ─────────
function safeHtml(text: string): string {
  return text.replace(/<[^>]*>/g, (match) => {
    if (/<\/?(b|i|br|span|strong|em)\b/i.test(match)) return match
    return ""
  })
}

// ─── Component (Rule R14: export default) ────────────────────────────
export default function HeroSection({ pageName = "Home" }: { pageName?: string }) {
  // Rule R4: Read live values from state.cms.allSections[pageName]
  const data = useAppSelector(
    (state) => state.cms.allSections[pageName] || {}
  )
  const cssData = useAppSelector(
    (state) => state.cms.allSectionsCss[pageName] || {}
  )

  // Rule R10: Apply allSectionsCss to matching DOM ids
  useEffect(() => {
    Object.entries(cssData).forEach(([fieldId, cssText]) => {
      if (cssText) {
        const el = document.getElementById(fieldId)
        if (el) el.style.cssText = cssText
      }
    })
  }, [cssData])

  // Helper to get value with default fallback (Rule R6)
  const getValue = (id: string): string => {
    return (data[id] as string) || DEFAULTS[id] || "DEFAULT"
  }

  // Loop data for stat cards (Rule R9)
  const loopData = (data[ids.statCards] as { fieldId: string; value: string; label: string }[]) || DEFAULT_LOOP

  return (
    <section className="w-full bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Rule R11: Tailwind layout — 2 columns desktop / stacked mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-16 md:py-24">
          {/* Left: Hero Image (Rule R7: getImage + onError placeholder) */}
          <div className="relative">
            <img
              id={ids.heroImage}
              src={getImage(getValue(ids.heroImage))}
              alt={getValue(ids.heroImage)}
              className="w-full h-auto rounded-xl shadow-lg dynamicStyle2"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "/placeholder.jpg"
                target.alt = "Athlete performing a dumbbell exercise"
              }}
            />
          </div>

          {/* Right: Content */}
          <div className="space-y-6">
            {/* Brand Badge */}
            <div id={ids.brandBadge} className="dynamicStyle">
              <span
                className="inline-block px-4 py-1.5 rounded-full bg-red-100 text-red-600 text-sm font-bold uppercase tracking-wider"
                dangerouslySetInnerHTML={{
                  __html: safeHtml(getValue(ids.brandBadge)),
                }}
              />
            </div>

            {/* Headline Main */}
            <h1
              id={ids.headlineMain}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight dynamicStyle"
              dangerouslySetInnerHTML={{
                __html: safeHtml(getValue(ids.headlineMain)),
              }}
            />

            {/* Headline Sub */}
            <p
              id={ids.headlineSub}
              className="text-xl text-gray-600 dynamicStyle"
              dangerouslySetInnerHTML={{
                __html: safeHtml(getValue(ids.headlineSub)),
              }}
            />

            {/* Description */}
            <p
              id={ids.description}
              className="text-gray-500 leading-relaxed dynamicStyle"
              dangerouslySetInnerHTML={{
                __html: safeHtml(getValue(ids.description)),
              }}
            />

            {/* CTA Button (Rule R8: semantic button with CMS label) */}
            <div id={ids.ctaButton} className="dynamicStyle">
              <button
                className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-sm uppercase tracking-wider rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                dangerouslySetInnerHTML={{
                  __html: safeHtml(getValue(ids.ctaButton)),
                }}
              />
            </div>
          </div>
        </div>

        {/* Stat Cards Row (Rule R9: Cards loop with unique nested IDs) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-16">
          {loopData.map((card: { fieldId: string; value: string; label: string }) => (
            <div
              key={card.fieldId}
              id={card.fieldId}
              className="text-center p-6 rounded-xl bg-gray-50 border border-gray-100 dynamicStyle"
            >
              <div
                className="text-3xl font-bold text-gray-900"
                dangerouslySetInnerHTML={{
                  __html: safeHtml(card.value || DEFAULTS[card.fieldId] || "DEFAULT"),
                }}
              />
              <div
                className="text-sm text-gray-500 mt-2"
                dangerouslySetInnerHTML={{
                  __html: safeHtml(card.label || "DEFAULT"),
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
