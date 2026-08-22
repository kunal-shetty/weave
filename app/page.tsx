"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShaderBackground } from "@/components/shader-background"
import { ParticleOrb } from "@/components/particle-orb"
import {
  Wand2,
  Eye,
  Zap,
  Database,
  Shield,
  Smartphone,
  ArrowRight,
  Sparkles,
  Code2,
  ImageIcon,
} from "lucide-react"
import Link from "next/link"

export default function Home() {
  const [healthStatus, setHealthStatus] = useState<
    "ok" | "error" | "loading"
  >("loading")

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) =>
        setHealthStatus(d.status === "ok" ? "ok" : "error")
      )
      .catch(() => setHealthStatus("error"))
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ShaderBackground />

      {/* ─── Hero ─── */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <div className="relative mb-8">
          <ParticleOrb />
        </div>

        <Badge
          variant="secondary"
          className="mb-6 bg-white/5 text-white/60 border border-white/10 backdrop-blur-sm text-xs font-medium tracking-wide"
        >
          <span
            className={`w-2 h-2 rounded-full mr-2 ${
              healthStatus === "ok"
                ? "bg-emerald-400"
                : healthStatus === "loading"
                ? "bg-yellow-400 animate-pulse"
                : "bg-red-400"
            }`}
          />
          Smart India Hackathon 2026 · PS7 · Team CodeX
        </Badge>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white font-[var(--font-heading)] tracking-tight text-center mb-6">
          AI-Assisted{" "}
          <span className="bg-gradient-to-r from-white via-gray-400 to-white/60 bg-clip-text text-transparent">
            UI Generation
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl text-center mb-10 leading-relaxed">
          Generate CMS-bound React sections from wireframes, code, and
          prompts. Diff-aware regeneration preserves live content edits.
        </p>

        <div className="flex items-center gap-4">
          <Link href="/generate">
            <Button className="btn-3d btn-glow gap-2 text-base px-8 py-6 bg-gradient-to-br from-white via-white/90 to-white/80 text-black hover:from-white hover:to-white/90 shadow-2xl shadow-white/10 font-semibold rounded-xl">
              <Wand2 className="w-5 h-5" />
              Generator Studio
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/preview/Home">
            <Button className="btn-3d gap-2 text-base px-8 py-6 bg-gradient-to-br from-white/10 to-white/5 text-white hover:from-white/15 hover:to-white/10 backdrop-blur-sm border border-white/10 shadow-xl font-medium rounded-xl">
              <Eye className="w-5 h-5" />
              Live Preview
            </Button>
          </Link>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center font-[var(--font-heading)] mb-4 tracking-tight">
            How It Works
          </h2>
          <p className="text-gray-500 text-center mb-16 max-w-lg mx-auto">
            Three input modes, one intelligent engine. Combine them freely.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Sparkles className="w-6 h-6" />,
                title: "Prompt",
                desc: "Describe what you want in natural language. The AI generates a complete, CMS-bound React section.",
                gradient: "from-white/10 to-white/[0.02]",
              },
              {
                icon: <ImageIcon className="w-6 h-6" />,
                title: "Wireframe",
                desc: "Upload a wireframe image. The AI detects layout regions and generates matching components.",
                gradient: "from-white/10 to-white/[0.02]",
              },
              {
                icon: <Code2 className="w-6 h-6" />,
                title: "Code",
                desc: "Paste existing JSX. The AI uses its patterns (Redux, classes) as a template for new sections.",
                gradient: "from-white/10 to-white/[0.02]",
              },
            ].map((f, i) => (
              <div
                key={f.title}
                className="card-3d group relative rounded-2xl border border-white/[0.08] bg-gradient-to-b overflow-hidden backdrop-blur-sm"
                style={{
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                {/* Subtle top highlight */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                <div className={`p-8 bg-gradient-to-b ${f.gradient}`}>
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white mb-6 group-hover:bg-white/10 transition-colors">
                    {f.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white font-[var(--font-heading)] mb-3">
                    {f.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Architecture ─── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center font-[var(--font-heading)] mb-16 tracking-tight">
            Architecture
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: <Zap className="w-5 h-5" />, label: "Diff-Aware Merge" },
              { icon: <Database className="w-5 h-5" />, label: "MongoDB + Supabase" },
              { icon: <Shield className="w-5 h-5" />, label: "HTML Sanitiser" },
              { icon: <Smartphone className="w-5 h-5" />, label: "Responsive Preview" },
              { icon: <Code2 className="w-5 h-5" />, label: "Redux CMS State" },
              { icon: <Wand2 className="w-5 h-5" />, label: "10-Digit fieldIds" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
              >
                <div className="text-white/60">{item.icon}</div>
                <span className="text-sm font-medium text-white/80">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 py-10 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-600">
          CodeX · Team CodeX (T19) · Smart India Hackathon 2026 · PS7
        </div>
      </footer>
    </div>
  )
}
