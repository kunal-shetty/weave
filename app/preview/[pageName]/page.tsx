"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchElementsByIds, patchElement } from "@/store/cmsSlice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ShaderBackground } from "@/components/shader-background"
import {
  Monitor,
  Smartphone,
  Edit3,
  Check,
  X,
  RefreshCw,
  Eye,
  ArrowLeft,
  Loader2,
  Wand2,
  Code2,
  Sparkles,
} from "lucide-react"
import Link from "next/link"

// ─── Helpers ────────────────────────────────────────────────────────
const STORAGE_URL = process.env.NEXT_PUBLIC_VITE_STORAGE_URL || ""

function getImage(src: string): string {
  if (!src) return "/placeholder.jpg"
  if (src.startsWith("http")) return src
  return `${STORAGE_URL}${src}`
}

// ─── Editable Element ───────────────────────────────────────────────
function EditableElement({
  fieldId,
  pageName,
  value,
  className = "",
}: {
  fieldId: string
  pageName: string
  value: string
  className?: string
}) {
  const dispatch = useAppDispatch()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const save = () => {
    dispatch(patchElement({ fieldId, content: draft, pageName }))
    setEditing(false)
  }
  const cancel = () => {
    setDraft(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="input-3d h-8 text-sm bg-white/[0.04] border-white/[0.08] text-white focus-visible:ring-white/20"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") save()
            if (e.key === "Escape") cancel()
          }}
        />
        <button onClick={save} className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors cursor-pointer">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={cancel} className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div
      className="group relative cursor-pointer hover:outline hover:outline-2 hover:outline-white/20 rounded-lg px-1 -mx-1 transition-all"
      onClick={() => {
        setDraft(value)
        setEditing(true)
      }}
    >
      <span className={className}>{value || "DEFAULT"}</span>
      <Edit3 className="w-3 h-3 absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity text-white/40" />
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function PreviewPage() {
  const params = useParams()
  const pageName = (params?.pageName as string) || "Home"
  const dispatch = useAppDispatch()
  const { allSections, allSectionsCss, loading, error } = useAppSelector(
    (state) => state.cms
  )

  const [isMobile, setIsMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const pageElements = allSections[pageName] || {}
  const pageCss = allSectionsCss[pageName] || {}

  useEffect(() => {
    dispatch(fetchElementsByIds({ pageName }))
  }, [dispatch, pageName])

  useEffect(() => {
    Object.entries(pageCss).forEach(([fieldId, cssText]) => {
      if (cssText) {
        const el = document.getElementById(fieldId)
        if (el) el.style.cssText = cssText
      }
    })
  }, [pageCss])

  const refresh = useCallback(() => {
    dispatch(fetchElementsByIds({ pageName }))
  }, [dispatch, pageName])

  const elementEntries = Object.entries(pageElements)

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ShaderBackground />

      {/* ─── Header ─── */}
      <header className="relative z-10 border-b border-white/[0.06] backdrop-blur-sm bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center border border-white/10">
                  <Eye className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold text-white font-[var(--font-heading)] tracking-tight">
                  Preview
                </span>
              </Link>
              <Badge className="bg-white/[0.06] text-white/60 border-white/[0.08] text-xs font-mono">
                {pageName}
              </Badge>
            </div>

            <div className="hidden md:flex items-center gap-3">
              {/* Device Toggle */}
              <div className="flex items-center gap-0.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <button
                  onClick={() => setIsMobile(false)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    !isMobile
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  Desktop
                </button>
                <button
                  onClick={() => setIsMobile(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isMobile
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Mobile
                </button>
              </div>

              <Button
                onClick={refresh}
                className="btn-3d gap-2 bg-white/[0.05] text-white/70 hover:text-white hover:bg-white/[0.1] border border-white/[0.08] font-medium"
                size="sm"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>

            {/* Mobile toggle */}
            <button
              className="md:hidden text-white/50 hover:text-white p-2 cursor-pointer"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.06] bg-black/60 backdrop-blur-xl px-4 py-3 space-y-2">
            <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04]">
              <button
                onClick={() => { setIsMobile(false); setMobileMenuOpen(false) }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${!isMobile ? "bg-white/10 text-white" : "text-white/40"}`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Desktop
              </button>
              <button
                onClick={() => { setIsMobile(true); setMobileMenuOpen(false) }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${isMobile ? "bg-white/10 text-white" : "text-white/40"}`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Mobile
              </button>
            </div>
            <Button onClick={refresh} className="w-full btn-3d gap-2 bg-white/[0.05] text-white/70 border border-white/[0.08]" size="sm">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
          </div>
        )}
      </header>

      {/* ─── Preview Area ─── */}
      <div className="relative z-10 flex justify-center p-6 md:p-10">
        <div
          className={`rounded-2xl overflow-hidden transition-all duration-500 border border-white/[0.08] shadow-2xl ${
            isMobile ? "w-[375px]" : "w-full max-w-[1280px]"
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20 bg-black/40">
              <Loader2 className="w-8 h-8 animate-spin text-white/30" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 bg-black/40">
              <p className="text-sm text-red-400">{error}</p>
              <Button onClick={refresh} className="btn-3d bg-white/[0.05] text-white/70 border border-white/[0.08]" size="sm">
                Retry
              </Button>
            </div>
          ) : elementEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 bg-black/40">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-white/20" />
              </div>
              <p className="text-sm text-white/40">No sections found for this page.</p>
              <Link href="/generate">
                <Button className="btn-3d btn-glow gap-2 bg-gradient-to-br from-white/10 to-white/5 text-white border border-white/10">
                  <Wand2 className="w-4 h-4" />
                  Generate a Section
                </Button>
              </Link>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-gray-900 via-gray-950 to-black p-8 md:p-12">
              {/* Split-hero layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center max-w-7xl mx-auto">
                {/* Image */}
                <div className="relative group">
                  {elementEntries
                    .filter(
                      ([, val]) =>
                        typeof val === "string" &&
                        (val.includes(".jpg") || val.includes(".png") || val.includes(".svg") || val.includes(".webp") || val.includes("placeholder"))
                    )
                    .map(([fieldId, value]) => (
                      <div key={fieldId} id={fieldId} className="relative rounded-2xl overflow-hidden">
                        <img
                          src={getImage(value as string)}
                          alt="Hero section"
                          className="w-full h-auto"
                          onError={(e) => {
                            const t = e.target as HTMLImageElement
                            t.src = "/placeholder.jpg"
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      </div>
                    ))}

                  {!elementEntries.some(
                    ([, val]) =>
                      typeof val === "string" &&
                      (val.includes(".jpg") || val.includes(".png") || val.includes(".svg") || val.includes(".webp") || val.includes("placeholder"))
                  ) && (
                    <img
                      src="/placeholder.jpg"
                      alt="Hero section"
                      className="w-full h-auto rounded-2xl"
                    />
                  )}
                </div>

                {/* Content */}
                <div className="space-y-6">
                  {elementEntries
                    .filter(([fieldId]) => !fieldId.includes("image") && !fieldId.includes("Image"))
                    .slice(0, 6)
                    .map(([fieldId, value]) => (
                      <div key={fieldId} id={fieldId}>
                        {typeof value === "string" ? (
                          <EditableElement
                            fieldId={fieldId}
                            pageName={pageName}
                            value={value}
                            className="text-white text-lg font-medium"
                          />
                        ) : null}
                      </div>
                    ))}
                </div>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-3 gap-4 mt-10">
                {elementEntries
                  .filter(([, value]) => Array.isArray(value) && value.length > 0)
                  .map(([fieldId, cards]) => (
                    <div key={fieldId} id={fieldId} className="contents">
                      {(Array.isArray(cards) ? cards : []).map(
                        (card: { fieldId: string; value: string; label: string }) => (
                          <div
                            key={card.fieldId}
                            id={card.fieldId}
                            className="text-center p-5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
                          >
                            <div className="text-3xl font-bold text-white">
                              {card.value}
                            </div>
                            <div className="text-sm text-white/40 mt-1">
                              {card.label}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  ))}

                {elementEntries.filter(([, v]) => Array.isArray(v) && v.length > 0).length === 0 && (
                  <>
                    <div className="text-center p-5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                      <div className="text-3xl font-bold text-white">1000+</div>
                      <div className="text-sm text-white/40 mt-1">Community Members</div>
                    </div>
                    <div className="text-center p-5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                      <div className="text-3xl font-bold text-white">40+</div>
                      <div className="text-sm text-white/40 mt-1">Fitness Programmes</div>
                    </div>
                    <div className="text-center p-5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                      <div className="text-3xl font-bold text-white">150+</div>
                      <div className="text-sm text-white/40 mt-1">Fitness Channels</div>
                    </div>
                  </>
                )}
              </div>

              {/* CTA */}
              {elementEntries
                .filter(([fieldId]) => fieldId.toLowerCase().includes("cta") || fieldId.toLowerCase().includes("button"))
                .map(([fieldId, value]) => (
                  <div key={fieldId} id={fieldId} className="mt-10 text-center">
                    <button className="btn-3d btn-glow px-10 py-5 text-sm font-bold uppercase tracking-wider bg-white text-black hover:bg-white/90 rounded-xl shadow-2xl shadow-white/10 transition-all">
                      <EditableElement
                        fieldId={fieldId}
                        pageName={pageName}
                        value={value as string}
                      />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Element Inspector ─── */}
      {elementEntries.length > 0 && (
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm overflow-hidden">
            <div className="p-5 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white font-[var(--font-heading)]">
                Element Inspector
              </h3>
            </div>
            <div className="p-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-white/30 uppercase tracking-wider">
                      Field ID
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-white/30 uppercase tracking-wider">
                      Element
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-white/30 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-white/30 uppercase tracking-wider">
                      Content
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {elementEntries.map(([fieldId, value]) => (
                    <tr
                      key={fieldId}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono text-xs text-white/50">
                        {fieldId}
                      </td>
                      <td className="py-2.5 px-3 text-white/70 text-xs">{fieldId}</td>
                      <td className="py-2.5 px-3">
                        <Badge className="bg-white/[0.06] text-white/50 border-white/[0.08] text-[10px] font-mono">
                          {Array.isArray(value) ? "Cards" : "Text"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 max-w-[200px] truncate text-white/50 text-xs">
                        {Array.isArray(value)
                          ? `${value.length} cards`
                          : String(value).substring(0, 50)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
