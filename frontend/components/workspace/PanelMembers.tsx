'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users, UserPlus, Crown, Copy, Check, Sparkles,
  Settings, LogOut, Activity, ChevronRight, ShieldCheck,
} from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';
import { cn } from '@/lib/utils';

interface Member {
  id: string;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'online' | 'away' | 'offline';
  avatar: string;
  hue: number;
}

const MOCK_MEMBERS: Member[] = [
  { id: '1', name: 'You', role: 'owner', status: 'online', avatar: 'YO', hue: 220 },
  { id: '2', name: 'CodeX Agent', role: 'editor', status: 'online', avatar: 'CX', hue: 280 },
  { id: '3', name: 'Aarav Sharma', role: 'viewer', status: 'away', avatar: 'AS', hue: 180 },
  { id: '4', name: 'Priya Iyer', role: 'viewer', status: 'offline', avatar: 'PI', hue: 340 },
];

export function PanelMembers({ sessionId }: { sessionId: string }) {
  const [members] = useState<Member[]>(MOCK_MEMBERS);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [activeMember, setActiveMember] = useState<string | null>('1');

  const copyInviteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/workspace/${sessionId}?invite=true`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const onlineCount = members.filter((m) => m.status === 'online').length;

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Session Header */}
      <div className="relative p-4 border-b border-sidebar-border overflow-hidden">
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-full blur-2xl animate-float" />
        <div className="relative flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sidebar-accent to-sidebar flex items-center justify-center border border-sidebar-border">
              <Sparkles className="w-4 h-4 text-sidebar-foreground" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-sidebar" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-sidebar-foreground font-[var(--font-heading)] truncate">Workspace</h2>
            <p className="text-[10px] text-muted-foreground font-mono truncate tracking-wider">{sessionId.slice(0, 16)}…</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="px-2.5 py-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/[0.1]">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400/80 font-medium uppercase tracking-wider">Online</span>
            </div>
            <div className="mt-0.5 text-base font-semibold text-sidebar-foreground tabular-nums">
              {onlineCount}<span className="text-muted-foreground text-[10px] font-normal ml-1">/ {members.length}</span>
            </div>
          </div>
          <div className="px-2.5 py-2 rounded-lg bg-sidebar-accent border border-sidebar-border">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Owners</span>
            </div>
            <div className="mt-0.5 text-base font-semibold text-sidebar-foreground tabular-nums">1</div>
          </div>
        </div>
      </div>

      {/* Members Collapsible */}
      <div className="flex-1 overflow-y-auto">
        <CollapsibleSection
          title="Members"
          subtitle={`${members.length} collaborators`}
          icon={<Users className="w-3.5 h-3.5" />}
          badge={<span className="text-[9px] text-muted-foreground font-mono px-1.5 py-0.5 rounded bg-sidebar-accent border border-sidebar-border">{members.length}</span>}
          accessory={
            <button onClick={(e) => { e.stopPropagation(); setInviteOpen((v) => !v); }}
              className={cn('p-1.5 rounded-md cursor-pointer text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200', inviteOpen && 'bg-sidebar-accent text-sidebar-foreground')}>
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          }
        >
          {/* Invite form */}
          <div className={cn('overflow-hidden transition-all duration-300 ease-out', inviteOpen ? 'max-h-40 opacity-100 mb-3' : 'max-h-0 opacity-0')}>
            <div className="p-3 rounded-xl bg-sidebar-accent border border-sidebar-border space-y-2">
              <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@company.com" className="h-9 text-xs bg-input border-border text-foreground placeholder:text-muted-foreground" />
              <div className="flex gap-1.5">
                <Button size="sm" className="flex-1 h-8 text-[10px] btn-3d bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-foreground border border-sidebar-border font-medium">
                  <UserPlus className="w-3 h-3 mr-1" /> Send invite
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-[10px] text-muted-foreground hover:text-sidebar-foreground px-3" onClick={copyInviteLink}>
                  {linkCopied ? <span className="flex items-center gap-1 text-emerald-400"><Check className="w-3 h-3" /> Copied</span> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Member list */}
          <div className="space-y-0.5">
            {members.map((member) => (
              <button key={member.id} onClick={() => setActiveMember(member.id)}
                className={cn('group/member w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-sidebar-accent/50 transition-colors', activeMember === member.id && 'bg-sidebar-accent')}>
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold text-white border border-white/10"
                    style={{ background: `linear-gradient(135deg, hsl(${member.hue} 60% 35% / 0.6), hsl(${(member.hue + 40) % 360} 50% 18% / 0.6))` }}>
                    {member.avatar}
                  </div>
                  <span className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-sidebar',
                    member.status === 'online' ? 'bg-emerald-400' : member.status === 'away' ? 'bg-amber-400' : 'bg-white/20')} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate text-sidebar-foreground">{member.name}</span>
                    {member.role === 'owner' && <Crown className="w-3 h-3 text-amber-400/80 shrink-0" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground capitalize tracking-wide">
                    {member.role} · <span className={member.status === 'online' ? 'text-emerald-400/70' : member.status === 'away' ? 'text-amber-400/70' : 'text-muted-foreground'}>{member.status}</span>
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover/member:text-muted-foreground transition-all" />
              </button>
            ))}
          </div>
        </CollapsibleSection>

        {/* Activity Collapsible */}
        <CollapsibleSection title="Activity" subtitle="Live session events" icon={<Activity className="w-3.5 h-3.5" />} defaultOpen={false}>
          <div className="px-3 space-y-2">
            {[
              { who: 'CodeX Agent', what: 'generated hero section', when: 'now', tone: 'emerald' },
              { who: 'You', what: 'updated copy on CTA', when: '2m', tone: 'foreground' },
              { who: 'CodeX Agent', what: 'proposed 3 variants', when: '5m', tone: 'primary' },
            ].map((event, idx) => (
              <div key={idx} className="relative pl-3 py-1.5">
                <span className={cn('absolute left-0 top-0 bottom-0 w-px',
                  event.tone === 'emerald' && 'bg-gradient-to-b from-emerald-400/40 to-transparent',
                  event.tone === 'foreground' && 'bg-gradient-to-b from-foreground/20 to-transparent',
                  event.tone === 'primary' && 'bg-gradient-to-b from-primary/40 to-transparent')} />
                <p className="text-[11px] text-foreground/70 leading-snug">
                  <span className="font-medium text-foreground/90">{event.who}</span> {event.what}
                </p>
                <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{event.when}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <button className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all cursor-pointer group/settings">
          <Settings className="w-4 h-4 transition-transform duration-500 group-hover/settings:rotate-45" /> Settings
        </button>
        <button className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/[0.06] transition-all cursor-pointer">
          <LogOut className="w-4 h-4" /> Leave Workspace
        </button>
      </div>
    </div>
  );
}
