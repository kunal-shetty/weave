"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { PanelMembers } from "./panel-members"
import { PanelAgent } from "./panel-agent"
import { PanelPreview } from "./panel-preview"
import { ShaderBackground } from "@/components/shader-background"
import {
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  Activity,
  CircleDot,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface SessionData {
  sessionId: string
  prompt: string
  files: { name: string; type: string; size: number }[]
  createdAt: string
}

export function WorkspaceContent() {
  const params = useParams()
  const router = useRouter()
  const sessionId = (params?.sessionId as string) || ""

  const [session, setSession] = useState<SessionData | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [leftWidth, setLeftWidth] = useState(280)
  const [rightWidth, setRightWidth] = useState(460)
  const [now, setNow] = useState<string>("")
  const [headerScrolled, setHeaderScrolled] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem(`codex-session-${sessionId}`)
    if (stored) {
      setSession(JSON.parse(stored))
    } else {
      router.push("/")
    }
  }, [sessionId, router])

  // Clock for the header
  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      )
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const handlePreviewReady = useCallback((html: string) => {
    setPreviewHtml(html)
  }, [])

  // Drag-to-resize
  const startResize = (
    side: "left" | "right"
  ) => (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = side === "left" ? leftWidth : rightWidth
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX
      if (side === "left") {
        setLeftWidth(Math.max(220, Math.min(420, startW + delta)))
      } else {
        setRightWidth(Math.max(340, Math.min(640, startW - delta)))
      }
    }
    const onUp = () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  if (!session) {
    return (
      <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
        <ShaderBackground />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/40 to-fuchsia-500/40 rounded-2xl blur-xl animate-pulse" />
            <div className="relative w-full h-full rounded-2xl bg-white/[0.04] border border-white/[0.1] grid place-items-center">
              <Sparkles className="w-5 h-5 text-white/40 animate-pulse" />
            </div>
          </div>
          <div className="text-white/40 text-xs font-mono tracking-wider animate-pulse">
            Loading workspace…
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-screen overflow-hidden flex flex-col">
      <ShaderBackground />

      {/* Top Bar — premium glass */}
      <header
        className={cn(
          "relative z-20 h-14 flex items-center justify-between px-3 shrink-0",
          "border-b border-white/[0.06] backdrop-blur-2xl",
          "bg-gradient-to-b from-black/60 via-black/40 to-black/20",
          "transition-shadow duration-300",
          headerScrolled && "shadow-[0_8px_32px_-12px_rgba(0,0,0,0.8)]"
        )}
        onMouseEnter={() => setHeaderScrolled(true)}
        onMouseLeave={() => setHeaderScrolled(false)}
      >
        {/* Animated bottom accent line */}
        <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50" />

        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/"
            className="group/back relative p-1.5 rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white transition-all duration-200 active:scale-90"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover/back:-translate-x-0.5" />
          </Link>

          <div className="h-5 w-px bg-white/[0.08]" />

          <button
            onClick={() => setLeftOpen(!leftOpen)}
            className={cn(
              "p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-all duration-200 cursor-pointer active:scale-90",
              leftOpen && "bg-white/[0.04] text-white/70"
            )}
            aria-label="Toggle members panel"
          >
            {leftOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="relative w-6 h-6 rounded-md bg-gradient-to-br from-white/15 to-white/5 border border-white/10 grid place-items-center shrink-0">
              <Sparkles className="w-3 h-3 text-white" />
              <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-black pulse-dot" />
            </div>
            <h1 className="text-xs font-medium gradient-text font-[var(--font-heading)] truncate max-w-[280px]">
              {session.prompt}
            </h1>
          </div>
        </div>

        {/* Center status pill */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
            <CircleDot className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
            <span className="text-[10px] text-white/50 font-mono tracking-wider uppercase">Live session</span>
            <span className="text-[10px] text-white/25 font-mono">·</span>
            <span className="text-[10px] text-white/40 font-mono tabular-nums">{now}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.05]">
            <Activity className="w-3 h-3 text-white/30" />
            <span className="text-[10px] text-white/40 font-mono tracking-wider">
              {sessionId.slice(0, 8)}
            </span>
          </div>

          <button
            onClick={() => setRightOpen(!rightOpen)}
            className={cn(
              "p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-all duration-200 cursor-pointer active:scale-90",
              rightOpen && "bg-white/[0.04] text-white/70"
            )}
            aria-label="Toggle preview panel"
          >
            {rightOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 3-Panel Layout */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* Left: Members */}
        <div
          className={cn(
            "relative shrink-0 overflow-hidden",
            "border-r border-white/[0.06]",
            "transition-[width,opacity] duration-500 ease-out",
            leftOpen ? "opacity-100" : "w-0 opacity-0"
          )}
          style={{ width: leftOpen ? leftWidth : 0 }}
        >
          <div
            className="h-full transition-transform duration-500"
            style={{
              transform: leftOpen ? "translateX(0)" : "translateX(-100%)",
            }}
          >
            <PanelMembers sessionId={sessionId} />
          </div>
          {/* Resize handle */}
          {leftOpen && (
            <ResizeHandle onMouseDown={startResize("left")} side="right" />
          )}
        </div>

        {/* Center: Agent */}
        <div className="flex-1 min-w-0 relative overflow-hidden border-r border-white/[0.06]">
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/30 backdrop-blur-sm" />
          <div className="relative h-full animate-fade-up">
            <PanelAgent
              sessionId={sessionId}
              initialPrompt={session.prompt}
              onPreviewReady={handlePreviewReady}
            />
          </div>
        </div>

        {/* Right: Preview */}
        <div
          className={cn(
            "relative shrink-0 overflow-hidden",
            "transition-[width,opacity] duration-500 ease-out",
            rightOpen ? "opacity-100" : "w-0 opacity-0"
          )}
          style={{ width: rightOpen ? rightWidth : 0 }}
        >
          <div
            className="h-full transition-transform duration-500"
            style={{
              transform: rightOpen ? "translateX(0)" : "translateX(100%)",
            }}
          >
            <PanelPreview previewHtml={previewHtml} />
          </div>
          {/* Resize handle */}
          {rightOpen && (
            <ResizeHandle onMouseDown={startResize("right")} side="left" />
          )}
        </div>
      </div>
    </div>
  )
}

function ResizeHandle({
  onMouseDown,
  side,
}: {
  onMouseDown: (e: React.MouseEvent) => void
  side: "left" | "right"
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={cn(
        "absolute top-0 bottom-0 w-1 cursor-col-resize group/handle z-10",
        side === "right" ? "right-0" : "left-0"
      )}
    >
      {/* Visible bar */}
      <div
        className={cn(
          "absolute inset-y-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent",
          "transition-all duration-200 group-hover/handle:via-white/40 group-hover/handle:w-0.5",
          side === "right" ? "right-0" : "left-0"
        )}
      />
      {/* Wide hover area */}
      <div
        className={cn(
          "absolute inset-y-0 -inset-x-1 transition-colors",
          "group-hover/handle:bg-white/[0.03]"
        )}
      />
    </div>
  )
}
