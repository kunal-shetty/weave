"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Monitor,
  Smartphone,
  Download,
  ExternalLink,
  Copy,
  Check,
  Maximize2,
  RefreshCw,
  Eye,
  Package,
  FileCode,
  FileJson,
  Zap,
  Activity,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { CollapsibleSection } from "./collapsible-section"
import { cn } from "@/lib/utils"

type Device = "desktop" | "tablet" | "mobile"

export function PanelPreview({ previewHtml }: { previewHtml: string | null }) {
  const [device, setDevice] = useState<Device>("desktop")
  const [linkCopied, setLinkCopied] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)
  const [refreshSpin, setRefreshSpin] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Document geometry per device
  const deviceStyles = useMemo(() => {
    switch (device) {
      case "mobile":
        return { width: 375, label: "Mobile · 375", icon: Smartphone }
      case "tablet":
        return { width: 768, label: "Tablet · 768", icon: Smartphone }
      default:
        return { width: null, label: "Desktop · Fluid", icon: Monitor }
    }
  }, [device])

  // Update iframe content
  useEffect(() => {
    if (!iframeRef.current || !previewHtml) return
    const doc = iframeRef.current.contentDocument
    if (!doc) return
    doc.open()
    doc.write(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0a;color:white;font-family:system-ui,-apple-system,sans-serif;padding:2rem}</style></head><body>${previewHtml}</body></html>`)
    doc.close()
  }, [previewHtml, iframeKey])

  const copyBlobUrl = () => {
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const downloadHtml = () => {
    if (!previewHtml) return
    const full = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>CodeX Generated Section</title><script src="https://cdn.tailwindcss.com"><\/script></head><body class="bg-gray-950">${previewHtml}</body></html>`
    const blob = new Blob([full], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "codex-section.html"
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadJson = () => {
    if (!previewHtml) return
    const data = {
      sectionName: "Generated Section",
      pageName: "Home",
      html: previewHtml,
      generatedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "codex-section.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRefresh = () => {
    setRefreshSpin(true)
    setIframeKey((k) => k + 1)
    setTimeout(() => setRefreshSpin(false), 600)
  }

  return (
    <div className="flex flex-col h-full glass-surface">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-white/[0.06] relative overflow-hidden">
        {/* Subtle accent line */}
        <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400/20 to-cyan-400/10 border border-emerald-400/20 grid place-items-center">
              <Eye className="w-3.5 h-3.5 text-emerald-300" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold gradient-text font-[var(--font-heading)] leading-tight">
                Live Preview
              </h3>
              <p className="text-[10px] text-white/30 font-mono truncate">{deviceStyles.label}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Device switcher */}
            <div className="relative flex items-center p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              {/* Sliding indicator */}
              <div
                className={cn(
                  "absolute top-0.5 bottom-0.5 w-[28px] rounded-md bg-gradient-to-b from-white/[0.12] to-white/[0.06] border border-white/[0.1] shadow-inner transition-all duration-300 ease-out"
                )}
                style={{
                  left: `calc(2px + ${(["desktop", "tablet", "mobile"] as Device[]).indexOf(device) * 28}px)`,
                }}
              />
              {(["desktop", "tablet", "mobile"] as Device[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDevice(d)}
                  className={cn(
                    "relative z-10 w-7 h-7 grid place-items-center rounded-md transition-colors duration-200 cursor-pointer",
                    device === d ? "text-white" : "text-white/35 hover:text-white/60"
                  )}
                  aria-label={d}
                >
                  <Monitor
                    className={cn(
                      "w-3.5 h-3.5 transition-all",
                      d === "mobile" && "hidden",
                      d === "tablet" && "hidden",
                      d === "desktop" && "block"
                    )}
                  />
                  {d === "mobile" && <Smartphone className="w-3.5 h-3.5" />}
                  {d === "tablet" && (
                    <Smartphone className="w-4 h-4 -rotate-90 transition-transform" />
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={handleRefresh}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/35 hover:text-white/70 transition-all duration-200 cursor-pointer active:scale-90"
              aria-label="Refresh"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshSpin && "icon-spin-slow")} />
            </button>
          </div>
        </div>
      </div>

      {/* Preview Frame */}
      <div className="flex-1 overflow-hidden p-4 relative">
        {/* Background glow behind the preview */}
        {previewHtml && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-3/4 h-3/4 bg-gradient-to-br from-indigo-500/10 via-transparent to-fuchsia-500/10 rounded-full blur-3xl animate-pulse" />
          </div>
        )}

        {previewHtml ? (
          <div className="relative h-full flex justify-center animate-scale-in">
            <div
              className={cn(
                "relative h-full rounded-2xl overflow-hidden border border-white/[0.08]",
                "bg-gradient-to-br from-gray-950 via-black to-gray-950",
                "transition-all duration-500 ease-out",
                "shadow-[0_24px_64px_-24px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04),inset_0_1px_0_rgba(255,255,255,0.04)]",
                device === "desktop" && "w-full",
                device === "tablet" && "w-[768px] max-w-full",
                device === "mobile" && "w-[375px]"
              )}
            >
              {/* Device chrome bar */}
              <div className="absolute top-0 inset-x-0 h-7 z-10 flex items-center gap-1.5 px-3 bg-gradient-to-b from-white/[0.04] to-transparent border-b border-white/[0.05]">
                <span className="w-2 h-2 rounded-full bg-red-400/60" />
                <span className="w-2 h-2 rounded-full bg-amber-400/60" />
                <span className="w-2 h-2 rounded-full bg-emerald-400/60" />
                <div className="ml-2 flex-1 h-4 rounded bg-white/[0.04] border border-white/[0.05] flex items-center justify-center">
                  <span className="text-[8px] text-white/25 font-mono truncate">
                    codex://preview/{device}
                  </span>
                </div>
              </div>

              <iframe
                key={iframeKey}
                ref={iframeRef}
                className="w-full h-full border-0 pt-7"
                title="Preview"
                sandbox="allow-same-origin"
              />

              {/* Corner glow */}
              <div className="pointer-events-none absolute -bottom-12 -right-12 w-32 h-32 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-full blur-2xl" />
            </div>
          </div>
        ) : (
          <div className="relative h-full flex flex-col items-center justify-center gap-5">
            {/* Animated empty state */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/30 rounded-2xl blur-2xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.015] border border-white/[0.08] grid place-items-center shadow-inner">
                <Eye className="w-8 h-8 text-white/25 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400 border border-black animate-pulse" />
              </div>
            </div>
            <div className="text-center max-w-[260px] space-y-1.5">
              <p className="text-sm font-medium text-white/60">
                Awaiting your prompt
              </p>
              <p className="text-[11px] text-white/30 leading-relaxed">
                Once the agent finishes generating, your live preview will appear here in real time.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse" />
              <span className="text-[10px] text-white/30 font-mono tracking-wider">READY</span>
            </div>
          </div>
        )}
      </div>

      {/* Export Actions — collapsible */}
      {previewHtml && (
        <CollapsibleSection
          title="Export & share"
          subtitle="Download or copy your section"
          icon={<Package className="w-3.5 h-3.5" />}
          defaultOpen={true}
          variant="inset"
        >
          <div className="space-y-2">
            {/* Primary actions */}
            <div className="flex gap-1.5">
              <Button
                className="flex-1 btn-3d btn-glow gap-2 h-9 bg-gradient-to-br from-white/15 to-white/5 text-white border border-white/10 hover:from-white/20 hover:to-white/10 text-xs font-medium tracking-wide"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open
              </Button>
              <Button
                onClick={copyBlobUrl}
                className="btn-3d gap-2 h-9 bg-white/[0.04] hover:bg-white/[0.08] text-white/70 border border-white/[0.08] hover:border-white/[0.14] text-xs font-medium px-3 transition-all"
              >
                {linkCopied ? (
                  <span className="flex items-center gap-1 text-emerald-300">
                    <Check className="w-3.5 h-3.5" />
                    Copied
                  </span>
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
              <button
                className="btn-3d h-9 px-3 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-white/70 border border-white/[0.08] hover:border-white/[0.14] transition-all active:scale-95"
                aria-label="Fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Secondary downloads */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={downloadHtml}
                className="group/dl flex flex-col items-center gap-1 p-2.5 rounded-lg bg-white/[0.025] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200 cursor-pointer active:scale-95"
              >
                <FileCode className="w-3.5 h-3.5 text-white/45 group-hover/dl:text-white/80 transition-colors" />
                <span className="text-[10px] text-white/40 group-hover/dl:text-white/65 transition-colors">.html</span>
              </button>
              <button
                onClick={downloadJson}
                className="group/dl flex flex-col items-center gap-1 p-2.5 rounded-lg bg-white/[0.025] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200 cursor-pointer active:scale-95"
              >
                <FileJson className="w-3.5 h-3.5 text-white/45 group-hover/dl:text-white/80 transition-colors" />
                <span className="text-[10px] text-white/40 group-hover/dl:text-white/65 transition-colors">.json</span>
              </button>
              <button className="group/dl flex flex-col items-center gap-1 p-2.5 rounded-lg bg-white/[0.025] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200 cursor-pointer active:scale-95">
                <Package className="w-3.5 h-3.5 text-white/45 group-hover/dl:text-white/80 transition-colors" />
                <span className="text-[10px] text-white/40 group-hover/dl:text-white/65 transition-colors">.zip</span>
              </button>
            </div>

            {/* Stats footer */}
            <div className="flex items-center justify-between px-1 pt-1">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-400/60" />
                <span className="text-[10px] text-white/35 font-mono tracking-wide">
                  {previewHtml.length.toLocaleString()} chars
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-emerald-400/60" />
                <span className="text-[10px] text-white/35 font-mono tracking-wide">Live</span>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}
