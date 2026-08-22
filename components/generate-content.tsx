"use client"

import { useState, useRef, useCallback } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  generateNewSection,
  clearGenerationResult,
  clearError,
} from "@/store/cmsSlice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ShaderBackground } from "@/components/shader-background"
import {
  Upload,
  Code2,
  Sparkles,
  Eye,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileCode2,
  ImageIcon,
  Wand2,
  Copy,
  Download,
  Trash2,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"

interface JobHistory {
  id: string
  sectionName: string
  pageName: string
  timestamp: string
  elementCount: number
  previewUrl: string
}

export function GenerateContent() {
  const dispatch = useAppDispatch()
  const { generating, generationResult, error } = useAppSelector(
    (state) => state.cms
  )

  const [prompt, setPrompt] = useState("")
  const [code, setCode] = useState("")
  const [wireframeFile, setWireframeFile] = useState<File | null>(null)
  const [wireframePreview, setWireframePreview] = useState<string | null>(null)
  const [pageName, setPageName] = useState("Home")
  const [sectionName, setSectionName] = useState("Hero")
  const [activeTab, setActiveTab] = useState<"prompt" | "wireframe" | "code">("prompt")
  const [jobHistory, setJobHistory] = useState<JobHistory[]>([])
  const [showGeneratedJsx, setShowGeneratedJsx] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleWireframeUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        setWireframeFile(file)
        const reader = new FileReader()
        reader.onload = (ev) => setWireframePreview(ev.target?.result as string)
        reader.readAsDataURL(file)
      }
    },
    []
  )

  const removeWireframe = () => {
    setWireframeFile(null)
    setWireframePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleGenerate = async () => {
    dispatch(clearError())
    dispatch(clearGenerationResult())
    const result = await dispatch(
      generateNewSection({
        prompt: prompt || undefined,
        code: code || undefined,
        wireframeFile: wireframeFile || undefined,
        pageName,
        sectionName,
      })
    )
    if (generateNewSection.fulfilled.match(result)) {
      const p = result.payload
      setJobHistory((prev) =>
        [
          {
            id: p.sectionId,
            sectionName: p.sectionName,
            pageName: p.pageName,
            timestamp: new Date().toLocaleTimeString(),
            elementCount: p.elementCount,
            previewUrl: p.previewUrl,
          },
          ...prev,
        ].slice(0, 5)
      )
    }
  }

  const copyJsx = () => {
    if (generationResult?.jsx) navigator.clipboard.writeText(generationResult.jsx)
  }

  const downloadJsx = () => {
    if (generationResult?.jsx) {
      const blob = new Blob([generationResult.jsx], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${sectionName.replace(/\s+/g, "")}.jsx`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const isFormValid = !!(prompt || code || wireframeFile)

  const TABS = [
    { key: "prompt" as const, label: "Prompt", icon: <Sparkles className="w-4 h-4" /> },
    { key: "wireframe" as const, label: "Wireframe", icon: <ImageIcon className="w-4 h-4" /> },
    { key: "code" as const, label: "Code", icon: <Code2 className="w-4 h-4" /> },
  ]

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ShaderBackground />

      <header className="relative z-10 border-b border-white/[0.06] backdrop-blur-sm bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center border border-white/10">
                  <Wand2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold text-white font-[var(--font-heading)] tracking-tight">CodeX</span>
              </Link>
              <div className="h-6 w-px bg-white/10" />
              <span className="text-sm font-medium text-white/40">Generator Studio</span>
            </div>
            <div className="flex items-center gap-2">
              {generationResult?.previewUrl && (
                <Link href={generationResult.previewUrl}>
                  <Button className="btn-3d btn-glow gap-2 bg-gradient-to-br from-white/10 to-white/5 text-white hover:from-white/15 hover:to-white/10 backdrop-blur-sm border border-white/10 font-medium">
                    <Eye className="w-4 h-4" />
                    Preview
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm overflow-hidden">
              <div className="p-6">
                <h3 className="text-sm font-semibold text-white font-[var(--font-heading)] mb-1">Section Configuration</h3>
                <p className="text-xs text-white/40 mb-4">Set the page and section name for your generated component.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/60 text-xs uppercase tracking-wider">Page Name</Label>
                    <Input value={pageName} onChange={(e) => setPageName(e.target.value)} placeholder="Home" className="input-3d bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 focus-visible:ring-white/20" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/60 text-xs uppercase tracking-wider">Section Name</Label>
                    <Input value={sectionName} onChange={(e) => setSectionName(e.target.value)} placeholder="Hero" className="input-3d bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 focus-visible:ring-white/20" />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm overflow-hidden">
              <div className="p-6">
                <h3 className="text-sm font-semibold text-white font-[var(--font-heading)] mb-1">Input Modes</h3>
                <p className="text-xs text-white/40 mb-5">Combine inputs — prompt wins copy, wireframe wins layout, code wins patterns.</p>

                <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-5">
                  {TABS.map((tab) => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60 hover:bg-white/[0.03]"}`}>
                      {tab.icon}{tab.label}
                    </button>
                  ))}
                </div>

                {activeTab === "prompt" && (
                  <div className="space-y-4">
                    <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder='Describe your section. E.g., "A split-hero with athlete image left, headline CHALLENGE YOUR LIMITS, 3 stat cards, and a red CTA button."' className="min-h-[200px] bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 font-mono text-sm focus-visible:ring-white/20 resize-none" />
                    <div className="flex flex-wrap gap-2">
                      {["Split-hero section", "Feature grid with icons", "Testimonial carousel", "Pricing table", "CTA banner"].map((s) => (
                        <button key={s} onClick={() => setPrompt(s)} className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-all cursor-pointer">{s}</button>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "wireframe" && (
                  <div>
                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-white/[0.1] rounded-2xl p-10 text-center cursor-pointer hover:border-white/20 hover:bg-white/[0.02] transition-all">
                      {wireframePreview ? (
                        <div className="space-y-4">
                          <img src={wireframePreview} alt="Wireframe" className="max-h-64 mx-auto rounded-xl border border-white/10" />
                          <button onClick={(e) => { e.stopPropagation(); removeWireframe() }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs text-white/60 hover:text-white/90 hover:bg-white/[0.1] transition-all cursor-pointer">
                            <Trash2 className="w-3 h-3" />Remove
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Upload className="w-10 h-10 mx-auto text-white/30" />
                          <div>
                            <p className="text-sm font-medium text-white/60">Click to upload or drag and drop</p>
                            <p className="text-xs text-white/30 mt-1">PNG, JPG, WebP (max 10MB)</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleWireframeUpload} className="hidden" />
                  </div>
                )}

                {activeTab === "code" && (
                  <Textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste your existing React component code here." className="min-h-[200px] bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 font-mono text-sm focus-visible:ring-white/20 resize-none" />
                )}
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={!isFormValid || generating} className="w-full btn-3d btn-glow h-14 text-base font-semibold gap-2 bg-gradient-to-br from-white via-white/90 to-white/80 text-black hover:from-white hover:to-white/90 shadow-2xl shadow-white/10 rounded-xl" size="lg">
              {generating ? (<><Loader2 className="w-5 h-5 animate-spin" />Generating...</>) : (<><Sparkles className="w-5 h-5" />Generate Section</>)}
            </Button>

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {generationResult && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] backdrop-blur-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span className="text-sm font-semibold text-emerald-300 font-[var(--font-heading)]">Generated Successfully</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={copyJsx} className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.1] transition-all cursor-pointer"><Copy className="w-4 h-4" /></button>
                      <button onClick={downloadJsx} className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.1] transition-all cursor-pointer"><Download className="w-4 h-4" /></button>
                      <button onClick={() => setShowGeneratedJsx(!showGeneratedJsx)} className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.1] transition-all cursor-pointer"><FileCode2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className="bg-white/10 text-white/70 border-white/10 text-[10px] font-mono">{generationResult.sectionId}</Badge>
                    <Badge className="bg-white/10 text-white/70 border-white/10 text-[10px]">
                      <Link href={generationResult.previewUrl || "#"} className="hover:text-white transition-colors">{generationResult.previewUrl}</Link>
                    </Badge>
                  </div>
                  {showGeneratedJsx && generationResult.jsx && (
                    <pre className="bg-black/40 border border-white/[0.06] rounded-xl p-4 overflow-auto max-h-[400px] text-xs font-mono text-white/70"><code>{generationResult.jsx}</code></pre>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm overflow-hidden">
              <div className="p-5">
                <h3 className="text-sm font-semibold text-white font-[var(--font-heading)] mb-4">Recent Jobs</h3>
                {jobHistory.length === 0 ? (
                  <p className="text-xs text-white/30 text-center py-6">No jobs yet. Generate your first section.</p>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {jobHistory.map((job) => (
                        <div key={job.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2 hover:bg-white/[0.06] transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white/80">{job.sectionName}</span>
                            <span className="text-[10px] text-white/30 font-mono">{job.timestamp}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-white/40">
                            <span>{job.pageName}</span>
                            <span>{job.elementCount} elements</span>
                          </div>
                          <Link href={job.previewUrl}>
                            <Button variant="ghost" size="sm" className="w-full gap-2 text-xs text-white/50 hover:text-white hover:bg-white/[0.06] mt-1">
                              <Eye className="w-3 h-3" />Preview
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
