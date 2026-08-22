"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Send,
  Loader2,
  CheckCircle2,
  Circle,
  Sparkles,
  Paperclip,
  Mic,
  AlertCircle,
  ListChecks,
  MessageSquare,
  Wand2,
  ChevronRight,
  Bot,
} from "lucide-react"
import { CollapsibleSection } from "./collapsible-section"
import { cn } from "@/lib/utils"

// ─── Types ──────────────────────────────────────────────────────────
interface ChatMessage {
  id: string
  role: "user" | "agent"
  content: string
  timestamp: Date
  type?: "question" | "status" | "error" | "normal"
}

interface Task {
  id: string
  label: string
  status: "pending" | "running" | "done" | "error"
}

// ─── Simulated Agent Logic ──────────────────────────────────────────
function getAgentSteps(prompt: string): Task[] {
  const lower = prompt.toLowerCase()
  const tasks: Task[] = [
    { id: "1", label: "Analysing input", status: "done" },
    { id: "2", label: "Determining section type", status: "done" },
  ]

  if (lower.includes("hero") || lower.includes("split")) {
    tasks.push({ id: "3", label: "Generating split-hero layout", status: "running" })
    tasks.push({ id: "4", label: "Creating stat cards", status: "pending" })
    tasks.push({ id: "5", label: "Generating CTA button", status: "pending" })
  } else if (lower.includes("feature") || lower.includes("grid")) {
    tasks.push({ id: "3", label: "Generating feature grid", status: "running" })
    tasks.push({ id: "4", label: "Adding icons", status: "pending" })
  } else {
    tasks.push({ id: "3", label: "Generating section layout", status: "running" })
    tasks.push({ id: "4", label: "Assigning fieldIds", status: "pending" })
  }

  tasks.push({ id: String(tasks.length + 1), label: "Persisting to database", status: "pending" })
  tasks.push({ id: String(tasks.length + 2), label: "Building preview", status: "pending" })

  return tasks
}

function getClarifyingQuestions(prompt: string): string[] {
  const lower = prompt.toLowerCase()
  const questions: string[] = []

  if (!lower.includes("color") && !lower.includes("colour") && !lower.includes("accent")) {
    questions.push("What accent colour would you like? (e.g., red, blue, green)")
  }
  if (!lower.includes("stat") && !lower.includes("card") && !lower.includes("number")) {
    questions.push("Should I include any stat cards or numerical highlights?")
  }
  if (!lower.includes("cta") && !lower.includes("button")) {
    questions.push("What should the call-to-action button say?")
  }

  return questions.slice(0, 2)
}

// ─── Component ──────────────────────────────────────────────────────
export function PanelAgent({
  sessionId,
  initialPrompt,
  onPreviewReady,
}: {
  sessionId: string
  initialPrompt: string
  onPreviewReady: (html: string) => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, tasks])

  // Simulate agent working on mount
  useEffect(() => {
    if (!initialPrompt) return

    const steps = getAgentSteps(initialPrompt)
    setTasks(steps)

    const userMsg: ChatMessage = {
      id: "user-1",
      role: "user",
      content: initialPrompt,
      timestamp: new Date(),
    }

    setMessages([userMsg])

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: "agent-1",
          role: "agent",
          content: `I'll help you build that. Let me analyse your request and generate the section.`,
          timestamp: new Date(),
          type: "status",
        },
      ])
    }, 800)

    let taskIdx = 0
    const taskInterval = setInterval(() => {
      taskIdx++
      if (taskIdx >= steps.length) {
        clearInterval(taskInterval)

        const questions = getClarifyingQuestions(initialPrompt)
        if (questions.length > 0) {
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              {
                id: `agent-q-${Date.now()}`,
                role: "agent",
                content: `Before I finalize, a couple of quick questions:\n\n${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`,
                timestamp: new Date(),
                type: "question",
              },
            ])
          }, 600)
        }

        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `agent-done-${Date.now()}`,
              role: "agent",
              content: `Section generated! You can see the live preview on the right. Click any element to edit it, or use the export options to download.`,
              timestamp: new Date(),
              type: "status",
            },
          ])

          onPreviewReady(
            `<div style="font-family:system-ui;padding:2rem;max-width:1200px;margin:0 auto">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:center">
                <img src="/placeholder.jpg" alt="Hero" style="width:100%;border-radius:1rem" />
                <div>
                  <span style="display:inline-block;padding:0.4rem 1rem;background:rgba(255,0,0,0.1);color:#ef4444;border-radius:999px;font-size:0.75rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase">PULSE FIT</span>
                  <h1 style="font-size:3rem;font-weight:700;color:white;margin:1rem 0">CHALLENGE YOUR LIMITS</h1>
                  <p style="color:rgba(255,255,255,0.6);font-size:1.125rem;margin-bottom:1.5rem">Be a part of the tribe that's limitless.</p>
                  <p style="color:rgba(255,255,255,0.4);line-height:1.7;margin-bottom:2rem">Join trainer-led workout sessions designed to kickstart your fitness journey.</p>
                  <button style="padding:1rem 2rem;background:white;color:black;border:none;border-radius:0.75rem;font-weight:700;font-size:0.875rem;letter-spacing:0.05em;cursor:pointer">FIND A WORKOUT</button>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:3rem">
                <div style="text-align:center;padding:1.5rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:1rem"><div style="font-size:1.875rem;font-weight:700;color:white">1000+</div><div style="color:rgba(255,255,255,0.4);margin-top:0.25rem">Community Members</div></div>
                <div style="text-align:center;padding:1.5rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:1rem"><div style="font-size:1.875rem;font-weight:700;color:white">40+</div><div style="color:rgba(255,255,255,0.4);margin-top:0.25rem">Fitness Programmes</div></div>
                <div style="text-align:center;padding:1.5rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:1rem"><div style="font-size:1.875rem;font-weight:700;color:white">150+</div><div style="color:rgba(255,255,255,0.4);margin-top:0.25rem">Fitness Channels</div></div>
              </div>
            </div>`
          )
        }, 1500)

        return
      }

      setTasks((prev) =>
        prev.map((t, i) => {
          if (i === taskIdx) return { ...t, status: "running" as const }
          if (i < taskIdx) return { ...t, status: "done" as const }
          return t
        })
      )

      setMessages((prev) => [
        ...prev,
        {
          id: `agent-status-${taskIdx}`,
          role: "agent",
          content: `✓ ${steps[taskIdx].label}`,
          timestamp: new Date(),
          type: "status",
        },
      ])
    }, 1200)

    return () => clearInterval(taskInterval)
  }, [initialPrompt, onPreviewReady])

  const sendMessage = () => {
    if (!input.trim()) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsTyping(true)

    setTimeout(() => {
      setIsTyping(false)
      setMessages((prev) => [
        ...prev,
        {
          id: `agent-${Date.now()}`,
          role: "agent",
          content: `Got it! I'll update the section with your feedback. The preview on the right will refresh shortly.`,
          timestamp: new Date(),
          type: "normal",
        },
      ])
    }, 1500)
  }

  const doneCount = tasks.filter((t) => t.status === "done").length
  const runningCount = tasks.filter((t) => t.status === "running").length
  const progress = tasks.length > 0 ? (doneCount / tasks.length) * 100 : 0

  return (
    <div className="flex flex-col h-full">
      {/* Tasks — collapsible */}
      {tasks.length > 0 && (
        <CollapsibleSection
          title="Task pipeline"
          subtitle={
            runningCount > 0
              ? `${runningCount} running · ${tasks.length - doneCount} pending`
              : `${doneCount} of ${tasks.length} complete`
          }
          icon={<ListChecks className="w-3.5 h-3.5" />}
          badge={
            <span className="text-[9px] text-white/40 font-mono tabular-nums">
              {Math.round(progress)}%
            </span>
          }
          variant="inset"
        >
          <div className="space-y-2.5">
            {/* Progress bar */}
            <div className="relative h-1.5 rounded-full bg-white/[0.04] overflow-hidden border border-white/[0.04]">
              <div
                className="absolute inset-y-0 left-0 progress-fill rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
              {runningCount > 0 && (
                <div className="absolute inset-y-0 w-1/3 progress-fill rounded-full opacity-70 animate-pulse" />
              )}
            </div>

            {/* Task chips */}
            <div className="flex flex-wrap gap-1.5">
              {tasks.map((task, idx) => (
                <div
                  key={task.id}
                  style={{ animationDelay: `${idx * 40}ms` }}
                  className={cn(
                    "group/task relative flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] cursor-default",
                    "border transition-all duration-300 animate-fade-up",
                    task.status === "done" &&
                      "bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-300/80 hover:bg-emerald-500/[0.12]",
                    task.status === "running" &&
                      "bg-white/[0.08] border-white/[0.18] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_18px_-4px_rgba(255,255,255,0.25)]",
                    task.status === "error" &&
                      "bg-red-500/[0.08] border-red-500/20 text-red-300/80",
                    task.status === "pending" &&
                      "bg-white/[0.02] border-white/[0.05] text-white/35 hover:text-white/55 hover:border-white/[0.1]"
                  )}
                >
                  {task.status === "done" ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : task.status === "running" ? (
                    <Loader2 className="w-3 h-3 text-white animate-spin" />
                  ) : task.status === "error" ? (
                    <AlertCircle className="w-3 h-3 text-red-400" />
                  ) : (
                    <Circle className="w-3 h-3 text-white/20" />
                  )}
                  <span>{task.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={msg.id}
            style={{ animationDelay: `${Math.min(idx * 60, 240)}ms` }}
            className={cn(
              "flex chat-bubble",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                "transition-all duration-300",
                msg.role === "user"
                  ? "bg-gradient-to-br from-white/[0.08] to-white/[0.03] text-white border border-white/[0.1] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]"
                  : msg.type === "question"
                  ? "bg-gradient-to-br from-amber-500/[0.08] to-amber-500/[0.02] text-amber-200/90 border border-amber-500/[0.15]"
                  : msg.type === "error"
                  ? "bg-gradient-to-br from-red-500/[0.08] to-red-500/[0.02] text-red-300/90 border border-red-500/[0.15]"
                  : msg.type === "status"
                  ? "bg-white/[0.025] text-white/60 border border-white/[0.05]"
                  : "bg-gradient-to-br from-white/[0.05] to-white/[0.015] text-white/75 border border-white/[0.07]"
              )}
            >
              {msg.role === "agent" && (
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="relative w-5 h-5 rounded-md bg-gradient-to-br from-indigo-400/30 to-fuchsia-400/20 border border-white/10 flex items-center justify-center">
                    <Bot className="w-3 h-3 text-white/80" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-black" />
                  </div>
                  <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                    CodeX Agent
                  </span>
                  <span className="text-[10px] text-white/15">·</span>
                  <span className="text-[10px] text-white/30 font-mono">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.role === "user" && (
                <div className="mt-1.5 text-[10px] text-white/30 text-right font-mono">
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start chat-bubble">
            <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.015] border border-white/[0.07] rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="relative w-5 h-5 rounded-md bg-gradient-to-br from-indigo-400/30 to-fuchsia-400/20 border border-white/10 flex items-center justify-center">
                  <Bot className="w-3 h-3 text-white/80" />
                </div>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 typing-dot" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 typing-dot" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 typing-dot" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-[10px] text-white/30 ml-1">thinking</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/[0.06] bg-gradient-to-b from-transparent to-black/40">
        <div className="relative group/input">
          {/* Glow ring on focus */}
          <div
            className={cn(
              "absolute -inset-px rounded-xl pointer-events-none transition-opacity duration-300 opacity-0",
              "bg-gradient-to-br from-indigo-400/40 via-white/10 to-fuchsia-400/30 blur-sm",
              "group-focus-within/input:opacity-100"
            )}
          />
          <div className="relative flex items-center gap-2 p-1.5 rounded-xl bg-black/60 border border-white/[0.08] backdrop-blur-md input-3d">
            <button className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-all duration-200 cursor-pointer active:scale-90">
              <Paperclip className="w-4 h-4" />
            </button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Reply to agent…"
              className="flex-1 h-9 bg-transparent border-0 text-white text-sm placeholder:text-white/25 focus-visible:ring-0 px-2"
            />
            <button className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-all duration-200 cursor-pointer active:scale-90 hidden sm:block">
              <Mic className="w-4 h-4" />
            </button>
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!input.trim()}
              className={cn(
                "h-9 w-9 rounded-lg btn-3d btn-glow transition-all duration-300",
                input.trim()
                  ? "bg-gradient-to-br from-white to-white/80 text-black border border-white hover:shadow-[0_0_24px_-4px_rgba(255,255,255,0.5)]"
                  : "bg-white/[0.06] text-white/40 border border-white/[0.08] hover:bg-white/[0.1]"
              )}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {/* Quick actions row */}
          <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { label: "Refine copy", icon: Wand2 },
              { label: "Add stat cards", icon: Sparkles },
              { label: "Generate variants", icon: ChevronRight },
            ].map((action) => (
              <button
                key={action.label}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px]",
                  "bg-white/[0.03] border border-white/[0.06] text-white/45",
                  "hover:bg-white/[0.06] hover:text-white/80 hover:border-white/[0.12]",
                  "transition-all duration-200 cursor-pointer active:scale-95"
                )}
              >
                <action.icon className="w-3 h-3" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
