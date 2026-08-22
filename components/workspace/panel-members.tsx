"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Users,
  UserPlus,
  Crown,
  Circle,
  Copy,
  Check,
  Sparkles,
  Settings,
  LogOut,
  Activity,
  ChevronRight,
  ShieldCheck,
} from "lucide-react"
import { CollapsibleSection } from "./collapsible-section"
import { cn } from "@/lib/utils"

interface Member {
  id: string
  name: string
  role: "owner" | "editor" | "viewer"
  status: "online" | "away" | "offline"
  avatar: string
  hue: number
}

const MOCK_MEMBERS: Member[] = [
  { id: "1", name: "You", role: "owner", status: "online", avatar: "YO", hue: 220 },
  { id: "2", name: "CodeX Agent", role: "editor", status: "online", avatar: "CX", hue: 280 },
  { id: "3", name: "Aarav Sharma", role: "viewer", status: "away", avatar: "AS", hue: 180 },
  { id: "4", name: "Priya Iyer", role: "viewer", status: "offline", avatar: "PI", hue: 340 },
]

export function PanelMembers({ sessionId }: { sessionId: string }) {
  const [members] = useState<Member[]>(MOCK_MEMBERS)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [linkCopied, setLinkCopied] = useState(false)
  const [activeMember, setActiveMember] = useState<string | null>("1")

  const copyInviteLink = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/workspace/${sessionId}?invite=true`
    )
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const onlineCount = members.filter((m) => m.status === "online").length
  const ownerCount = members.filter((m) => m.role === "owner").length

  return (
    <div className="flex flex-col h-full glass-surface">
      {/* Session Header — animated gradient logo */}
      <div className="relative p-4 border-b border-white/[0.06] overflow-hidden">
        {/* Subtle animated accent */}
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/10 to-transparent rounded-full blur-2xl animate-float" />

        <div className="relative flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/15 via-white/5 to-transparent flex items-center justify-center border border-white/10 shadow-inner">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black pulse-dot" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold gradient-text font-[var(--font-heading)] truncate">
              Workspace
            </h2>
            <p className="text-[10px] text-white/30 font-mono truncate tracking-wider">
              {sessionId.slice(0, 16)}…
            </p>
          </div>
        </div>

        {/* Stat row */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="px-2.5 py-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/[0.1] hover:bg-emerald-500/[0.09] transition-colors">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400/80 font-medium uppercase tracking-wider">Online</span>
            </div>
            <div className="mt-0.5 text-base font-semibold text-white/90 tabular-nums">
              {onlineCount}
              <span className="text-white/30 text-[10px] font-normal ml-1">/ {members.length}</span>
            </div>
          </div>
          <div className="px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-white/40" />
              <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Owners</span>
            </div>
            <div className="mt-0.5 text-base font-semibold text-white/70 tabular-nums">
              {ownerCount}
            </div>
          </div>
        </div>
      </div>

      {/* Members Collapsible */}
      <div className="flex-1 overflow-y-auto">
        <CollapsibleSection
          title="Members"
          subtitle={`${members.length} collaborators`}
          icon={<Users className="w-3.5 h-3.5" />}
          badge={
            <span className="text-[9px] text-white/30 font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
              {members.length}
            </span>
          }
          accessory={
            <button
              onClick={(e) => {
                e.stopPropagation()
                setInviteOpen((v) => !v)
              }}
              className={cn(
                "p-1.5 rounded-md cursor-pointer",
                "text-white/40 hover:text-white hover:bg-white/[0.06]",
                "transition-all duration-200 active:scale-90",
                inviteOpen && "bg-white/[0.08] text-white"
              )}
              aria-label="Invite member"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          }
        >
          {/* Invite form — collapsible inline */}
          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-out",
              inviteOpen ? "max-h-40 opacity-100 mb-3" : "max-h-0 opacity-0"
            )}
          >
            <div className="p-3 rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.015] border border-white/[0.08] space-y-2 animate-fade-up">
              <div className="relative">
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  className="h-9 text-xs bg-black/40 border-white/[0.08] text-white placeholder:text-white/20 pl-3 input-3d focus-visible:ring-0"
                />
              </div>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  className="flex-1 h-8 text-[10px] btn-3d btn-glow bg-gradient-to-br from-white/15 to-white/5 text-white border border-white/10 font-medium tracking-wide"
                >
                  <UserPlus className="w-3 h-3 mr-1" />
                  Send invite
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-[10px] text-white/50 hover:text-white px-3 input-3d"
                  onClick={copyInviteLink}
                >
                  {linkCopied ? (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Check className="w-3 h-3" />
                      Copied
                    </span>
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Member list */}
          <div className="space-y-0.5">
            {members.map((member, idx) => (
              <button
                key={member.id}
                onClick={() => setActiveMember(member.id)}
                style={{ animationDelay: `${idx * 60}ms` }}
                className={cn(
                  "row-hover group/member w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer",
                  "animate-fade-up",
                  activeMember === member.id && "bg-white/[0.05]"
                )}
              >
                <div className="relative shrink-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold text-white border border-white/10 shadow-inner transition-transform duration-300 group-hover/member:scale-105"
                    style={{
                      background: `linear-gradient(135deg, hsl(${member.hue} 60% 35% / 0.6), hsl(${(member.hue + 40) % 360} 50% 18% / 0.6))`,
                    }}
                  >
                    {member.avatar}
                  </div>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black",
                      member.status === "online"
                        ? "bg-emerald-400 pulse-dot"
                        : member.status === "away"
                        ? "bg-amber-400"
                        : "bg-white/20"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "text-xs font-medium truncate transition-colors",
                        activeMember === member.id ? "text-white" : "text-white/80"
                      )}
                    >
                      {member.name}
                    </span>
                    {member.role === "owner" && (
                      <Crown className="w-3 h-3 text-amber-400/80 shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-white/35 capitalize tracking-wide">
                    {member.role} · <span className={
                      member.status === "online" ? "text-emerald-400/70" :
                      member.status === "away" ? "text-amber-400/70" : "text-white/30"
                    }>{member.status}</span>
                  </span>
                </div>
                <ChevronRight
                  className={cn(
                    "w-3.5 h-3.5 text-white/15 transition-all duration-300",
                    "group-hover/member:text-white/40 group-hover/member:translate-x-0.5",
                    activeMember === member.id && "text-white/50 translate-x-0.5"
                  )}
                />
              </button>
            ))}
          </div>
        </CollapsibleSection>

        {/* Activity Collapsible */}
        <CollapsibleSection
          title="Activity"
          subtitle="Live session events"
          icon={<Activity className="w-3.5 h-3.5" />}
          defaultOpen={false}
        >
          <div className="px-3 space-y-2">
            {[
              { who: "CodeX Agent", what: "generated hero section", when: "now", tone: "emerald" },
              { who: "You", what: "updated copy on CTA", when: "2m", tone: "white" },
              { who: "CodeX Agent", what: "proposed 3 variants", when: "5m", tone: "indigo" },
            ].map((event, idx) => (
              <div
                key={idx}
                style={{ animationDelay: `${idx * 70}ms` }}
                className="relative pl-3 py-1.5 animate-fade-up"
              >
                <span
                  className={cn(
                    "absolute left-0 top-0 bottom-0 w-px",
                    event.tone === "emerald" && "bg-gradient-to-b from-emerald-400/40 to-transparent",
                    event.tone === "white" && "bg-gradient-to-b from-white/20 to-transparent",
                    event.tone === "indigo" && "bg-gradient-to-b from-indigo-400/40 to-transparent"
                  )}
                />
                <p className="text-[11px] text-white/70 leading-snug">
                  <span className="font-medium text-white/90">{event.who}</span> {event.what}
                </p>
                <p className="text-[9px] text-white/30 font-mono mt-0.5">{event.when}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-white/[0.06] space-y-1">
        <button className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/[0.04] transition-all duration-200 cursor-pointer group/settings">
          <Settings className="w-4 h-4 transition-transform duration-500 group-hover/settings:rotate-45" />
          Settings
        </button>
        <button className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs text-white/50 hover:text-red-300 hover:bg-red-500/[0.06] transition-all duration-200 cursor-pointer">
          <LogOut className="w-4 h-4" />
          Leave Workspace
        </button>
      </div>
    </div>
  )
}
