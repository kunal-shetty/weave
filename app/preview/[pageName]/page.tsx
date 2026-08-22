"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchElementsByIds, patchElement } from "@/store/cmsSlice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
} from "lucide-react"
import Link from "next/link"

// ─── Helper: Image with fallback ────────────────────────────────────
const STORAGE_URL = process.env.NEXT_PUBLIC_VITE_STORAGE_URL || ""

function getImage(src: string): string {
  if (!src) return "/placeholder.jpg"
  if (src.startsWith("http")) return src
  return `${STORAGE_URL}${src}`
}

// ─── Inline Editable Element ────────────────────────────────────────
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
          className="h-8 text-sm"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") save()
            if (e.key === "Escape") cancel()
          }}
        />
        <Button size="sm" variant="ghost" onClick={save} className="h-8 w-8 p-0">
          <Check className="w-4 h-4 text-green-500" />
        </Button>
        <Button size="sm" variant="ghost" onClick={cancel} className="h-8 w-8 p-0">
          <X className="w-4 h-4 text-red-500" />
        </Button>
      </div>
    )
  }

  return (
    <div
      className="group relative cursor-pointer hover:outline hover:outline-2 hover:outline-primary/30 rounded px-1 -mx-1"
      onClick={() => {
        setDraft(value)
        setEditing(true)
      }}
    >
      <span className={className}>{value || "DEFAULT"}</span>
      <Edit3 className="w-3 h-3 absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
    </div>
  )
}

// ─── Main Preview Page ──────────────────────────────────────────────
export default function PreviewPage() {
  const params = useParams()
  const pageName = (params?.pageName as string) || "Home"
  const dispatch = useAppDispatch()
  const { allSections, allSectionsCss, loading, error } = useAppSelector(
    (state) => state.cms
  )

  const [isMobile, setIsMobile] = useState(false)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)

  const pageElements = allSections[pageName] || {}
  const pageCss = allSectionsCss[pageName] || {}

  // Fetch elements on mount
  useEffect(() => {
    dispatch(fetchElementsByIds({ pageName }))
  }, [dispatch, pageName])

  // Apply CSS overlays to DOM
  useEffect(() => {
    Object.entries(pageCss).forEach(([fieldId, cssText]) => {
      if (cssText) {
        const el = document.getElementById(fieldId)
        if (el) {
          el.style.cssText = cssText
        }
      }
    })
  }, [pageCss])

  const refresh = useCallback(() => {
    dispatch(fetchElementsByIds({ pageName }))
  }, [dispatch, pageName])

  const elementEntries = Object.entries(pageElements)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back</span>
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Preview</span>
                <Badge variant="secondary" className="text-xs">
                  {pageName}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Device Toggle */}
              <div className="flex items-center gap-2 border border-border/50 rounded-lg p-1">
                <Button
                  variant={!isMobile ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setIsMobile(false)}
                  className="h-7 gap-1 text-xs"
                >
                  <Monitor className="w-3 h-3" />
                  Desktop
                </Button>
                <Button
                  variant={isMobile ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setIsMobile(true)}
                  className="h-7 gap-1 text-xs"
                >
                  <Smartphone className="w-3 h-3" />
                  Mobile
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Preview Area */}
      <div className="flex justify-center p-8">
        <div
          className={`bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ${
            isMobile ? "w-[375px]" : "w-full max-w-[1280px]"
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <p className="text-sm text-red-500">{error}</p>
              <Button onClick={refresh} variant="outline" size="sm">
                Retry
              </Button>
            </div>
          ) : elementEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <p className="text-sm text-gray-400">
                No sections found for this page.
              </p>
              <Link href="/generate">
                <Button size="sm" className="gap-2">
                  Generate a Section
                </Button>
              </Link>
            </div>
          ) : (
            <div className="p-6 md:p-10">
              {/* Render elements as a split-hero layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-7xl mx-auto">
                {/* Left column: Image */}
                <div className="relative">
                  {elementEntries
                    .filter(([_, val]) => typeof val === "string" && (val.includes(".jpg") || val.includes(".png") || val.includes(".svg") || val.includes(".webp") || val.includes("placeholder")))
                    .map(([fieldId, value]) => (
                      <div key={fieldId} id={fieldId} className="relative">
                        <img
                          src={getImage(value as string)}
                          alt="Hero section"
                          className="w-full h-auto rounded-xl shadow-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = "/placeholder.jpg"
                          }}
                        />
                        <div className="absolute inset-0 bg-black/5 rounded-xl" />
                      </div>
                    ))}

                  {/* If no image found, show placeholder */}
                  {!elementEntries.some(
                    ([_, val]) =>
                      typeof val === "string" &&
                      (val.includes(".jpg") ||
                        val.includes(".png") ||
                        val.includes(".svg") ||
                        val.includes(".webp") ||
                        val.includes("placeholder"))
                  ) && (
                    <img
                      src="/placeholder.jpg"
                      alt="Hero section"
                      className="w-full h-auto rounded-xl shadow-lg"
                    />
                  )}
                </div>

                {/* Right column: Content */}
                <div className="space-y-6">
                  {/* Badge */}
                  {elementEntries
                    .filter(
                      ([fieldId]) =>
                        !fieldId.includes("image") &&
                        !fieldId.includes("Image")
                    )
                    .slice(0, 6)
                    .map(([fieldId, value]) => (
                      <div key={fieldId} id={fieldId}>
                        {typeof value === "string" ? (
                          <EditableElement
                            fieldId={fieldId}
                            pageName={pageName}
                            value={value}
                            className="text-gray-900"
                          />
                        ) : null}
                      </div>
                    ))}
                </div>
              </div>

              {/* Stat Cards Row */}
              <div className="grid grid-cols-3 gap-4 mt-8">
                {elementEntries
                  .filter(
                    ([fieldId, value]) =>
                      Array.isArray(value) &&
                      value.length > 0
                  )
                  .map(([fieldId, cards]) => (
                    <div key={fieldId} id={fieldId} className="contents">
                      {(Array.isArray(cards) ? cards : []).map(
                        (card: { fieldId: string; value: string; label: string }) => (
                          <div
                            key={card.fieldId}
                            id={card.fieldId}
                            className="text-center p-4 rounded-xl bg-gray-50 border border-gray-100"
                          >
                            <div className="text-2xl font-bold text-gray-900">
                              {card.value}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {card.label}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  ))}

                {/* Fallback stat cards if none from DB */}
                {elementEntries.filter(
                  ([, value]) => Array.isArray(value) && value.length > 0
                ).length === 0 && (
                  <>
                    <div className="text-center p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="text-2xl font-bold text-gray-900">1000+</div>
                      <div className="text-sm text-gray-500 mt-1">
                        Community Members
                      </div>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="text-2xl font-bold text-gray-900">40+</div>
                      <div className="text-sm text-gray-500 mt-1">
                        Fitness Programmes
                      </div>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="text-2xl font-bold text-gray-900">150+</div>
                      <div className="text-sm text-gray-500 mt-1">
                        Fitness Channels
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* CTA Button */}
              {elementEntries
                .filter(
                  ([fieldId]) =>
                    fieldId.toLowerCase().includes("cta") ||
                    fieldId.toLowerCase().includes("button")
                )
                .map(([fieldId, value]) => (
                  <div key={fieldId} id={fieldId} className="mt-8 text-center">
                    <Button className="px-8 py-6 text-base font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl">
                      <EditableElement
                        fieldId={fieldId}
                        pageName={pageName}
                        value={value as string}
                      />
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Element Inspector (bottom panel) */}
      {elementEntries.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-sm font-[var(--font-heading)]">
                Element Inspector
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                        Field ID
                      </th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                        Element
                      </th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                        Type
                      </th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                        Content
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {elementEntries.map(([fieldId, value]) => (
                      <tr
                        key={fieldId}
                        className="border-b border-border/20 hover:bg-muted/30"
                      >
                        <td className="py-2 px-3 font-mono text-xs">{fieldId}</td>
                        <td className="py-2 px-3">{fieldId}</td>
                        <td className="py-2 px-3">
                          <Badge variant="outline" className="text-[10px]">
                            {Array.isArray(value) ? "Cards" : "Text"}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 max-w-[200px] truncate">
                          {Array.isArray(value)
                            ? `${value.length} cards`
                            : String(value).substring(0, 50)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
