'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users, UserPlus, Crown, Copy, Check, Sparkles,
  Settings, LogOut, Activity, ChevronRight, ShieldCheck,
  CircleDot, CheckCircle2, Clock, AlertCircle, ThumbsUp, ThumbsDown,
  Circle, ListChecks, User, Trash2,
} from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useSupabasePresence } from '@/hooks/use-supabase-realtime';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Member {
  _id?: string;
  sessionId: string;
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: 'owner' | 'editor' | 'viewer';
  status: string;
  createdAt?: string;
}

interface TaskItem {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'review' | 'approved' | 'rejected';
  assignee: string;
  createdAt: string;
}

export function PanelMembers({ sessionId }: { sessionId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks] = useState<TaskItem[]>([
    { id: 't1', title: 'Generate hero section', status: 'approved', assignee: 'CodeX Agent', createdAt: '2m ago' },
    { id: 't2', title: 'Refine copy for CTA', status: 'in_progress', assignee: 'You', createdAt: 'now' },
    { id: 't3', title: 'Add stat cards', status: 'pending', assignee: 'CodeX Agent', createdAt: 'pending' },
  ]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [activeMember, setActiveMember] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name: string | null; email: string | null; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const { onlineCount } = useSupabasePresence(`workspace:${sessionId}`, { role: 'viewer' });

  // Fetch members from MongoDB
  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/workspace-members/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
        if (data.length > 0 && !activeMember) {
          setActiveMember(data[0].userId);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch members:', err);
    } finally {
      setLoading(false);
    }
  }, [API, sessionId, activeMember]);

  // Fetch user profile from Supabase + MongoDB
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // Fetch from MongoDB
        fetch(`${API}/api/workspace-members/${sessionId}`)
          .then((r) => r.json())
          .then((membersData: Member[]) => {
            const self = membersData.find((m) => m.userId === user.id || m.email === user.email);
            if (self) {
              setUserProfile({ full_name: self.fullName, email: self.email, avatar_url: self.avatarUrl });
            } else {
              // Not yet a member — use Supabase metadata
              const meta = user.user_metadata || {};
              setUserProfile({
                full_name: (meta.full_name as string) || (meta.name as string) || null,
                email: user.email || null,
                avatar_url: (meta.avatar_url as string) || (meta.picture as string) || null,
              });
            }
          })
          .catch(() => {
            const meta = user.user_metadata || {};
            setUserProfile({
              full_name: (meta.full_name as string) || (meta.name as string) || null,
              email: user.email || null,
              avatar_url: (meta.avatar_url as string) || (meta.picture as string) || null,
            });
          });
      }
    });

    fetchMembers();
  }, [supabase, sessionId, API, fetchMembers]);

  // Poll members every 10s for changes
  useEffect(() => {
    const interval = setInterval(fetchMembers, 10000);
    return () => clearInterval(interval);
  }, [fetchMembers]);

  const copyInviteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/workspace/${sessionId}?invite=true`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // Add member via API
  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    try {
      const res = await fetch(`${API}/api/workspace-members/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: 'viewer',
        }),
      });

      if (res.ok) {
        setInviteEmail('');
        setInviteOpen(false);
        fetchMembers(); // Refresh list
      }
    } catch (err) {
      console.warn('Failed to invite:', err);
    }
  };

  // Remove member via API
  const handleRemoveMember = async (userId: string) => {
    try {
      await fetch(`${API}/api/workspace-members/${sessionId}/${userId}`, {
        method: 'DELETE',
      });
      fetchMembers();
    } catch (err) {
      console.warn('Failed to remove member:', err);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  const onlineMemberCount = members.filter((m) => m.status === 'active').length || 1;
  const taskCounts = {
    pending: tasks.filter((t) => t.status === 'pending').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    review: tasks.filter((t) => t.status === 'review').length,
    done: tasks.filter((t) => t.status === 'approved').length,
  };

  const statusIcon = (status: TaskItem['status']) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
      case 'rejected': return <AlertCircle className="w-3 h-3 text-red-400" />;
      case 'in_progress': return <CircleDot className="w-3 h-3 text-blue-400 animate-pulse" />;
      case 'review': return <Clock className="w-3 h-3 text-amber-400" />;
      default: return <Circle className="w-3 h-3 text-muted-foreground/50" />;
    }
  };

  const getMemberInitials = (m: Member) => {
    if (m.fullName) return m.fullName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
    return m.email.slice(0, 2).toUpperCase();
  };

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
              {onlineCount || onlineMemberCount}<span className="text-muted-foreground text-[10px] font-normal ml-1">/ {Math.max(members.length, 1)}</span>
            </div>
          </div>
          <div className="px-2.5 py-2 rounded-lg bg-sidebar-accent border border-sidebar-border">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Tasks</span>
            </div>
            <div className="mt-0.5 text-base font-semibold text-sidebar-foreground tabular-nums">{tasks.length}</div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Members Collapsible */}
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
              <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
                placeholder="teammate@company.com" className="h-9 text-xs bg-input border-border text-foreground placeholder:text-muted-foreground" />
              <div className="flex gap-1.5">
                <Button size="sm" onClick={handleInvite}
                  className="flex-1 h-8 text-[10px] btn-3d bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-foreground border border-sidebar-border font-medium">
                  <UserPlus className="w-3 h-3 mr-1" /> Send invite
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-[10px] text-muted-foreground hover:text-sidebar-foreground px-3" onClick={copyInviteLink}>
                  {linkCopied ? <span className="flex items-center gap-1 text-emerald-400"><Check className="w-3 h-3" /> Copied</span> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Member list from DB */}
          {loading ? (
            <div className="px-3 py-4 text-center">
              <p className="text-[10px] text-muted-foreground animate-pulse">Loading members…</p>
            </div>
          ) : members.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-[10px] text-muted-foreground">No members yet. Invite someone!</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {members.map((member) => (
                <div key={member.userId}
                  className={cn('group/member w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent/50 transition-colors', activeMember === member.userId && 'bg-sidebar-accent')}>
                  <button onClick={() => setActiveMember(member.userId)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div className="relative shrink-0">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt="" className="w-9 h-9 rounded-xl border border-white/10 object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold text-white border border-white/10 bg-gradient-to-br from-primary/30 to-primary/10">
                          {getMemberInitials(member)}
                        </div>
                      )}
                      <span className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-sidebar',
                        member.status === 'active' ? 'bg-emerald-400' : 'bg-white/20')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate text-sidebar-foreground">{member.fullName || member.email}</span>
                        {member.role === 'owner' && <Crown className="w-3 h-3 text-amber-400/80 shrink-0" />}
                      </div>
                      <span className="text-[10px] text-muted-foreground capitalize tracking-wide">
                        {member.role}
                      </span>
                    </div>
                  </button>
                  {member.role !== 'owner' && (
                    <button onClick={() => handleRemoveMember(member.userId)}
                      className="p-1.5 rounded-md text-muted-foreground/30 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover/member:opacity-100 cursor-pointer"
                      title="Remove member">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Work Items / Tasks (Jira-like) */}
        <CollapsibleSection
          title="Current Work"
          subtitle={`${taskCounts.pending + taskCounts.inProgress + taskCounts.review} active · ${taskCounts.done} done`}
          icon={<ListChecks className="w-3.5 h-3.5" />}
          badge={<span className="text-[9px] text-muted-foreground font-mono px-1.5 py-0.5 rounded bg-sidebar-accent border border-sidebar-border">{tasks.length}</span>}
        >
          <div className="space-y-1.5 px-1">
            {tasks.map((task) => (
              <div key={task.id} className="group/task px-3 py-2.5 rounded-lg bg-sidebar-accent/30 border border-sidebar-border/50 hover:border-sidebar-border transition-all">
                <div className="flex items-start gap-2">
                  {statusIcon(task.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-sidebar-foreground truncate">{task.title}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {task.assignee} · {task.createdAt}
                    </p>
                  </div>
                </div>
                {(task.status === 'pending' || task.status === 'review') && (
                  <div className="flex gap-1 mt-2">
                    <Button size="sm" variant="ghost"
                      className="h-6 text-[9px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 px-2 gap-1">
                      <ThumbsUp className="w-2.5 h-2.5" /> Approve
                    </Button>
                    <Button size="sm" variant="ghost"
                      className="h-6 text-[9px] text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 gap-1">
                      <ThumbsDown className="w-2.5 h-2.5" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* My Profile */}
        {userProfile && (
          <CollapsibleSection title="My Profile" subtitle={userProfile.email || ''} icon={<User className="w-3.5 h-3.5" />} defaultOpen={false}>
            <div className="px-3 space-y-3">
              <div className="flex items-center gap-3">
                {userProfile.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="" className="w-12 h-12 rounded-xl border border-sidebar-border object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-sidebar-border flex items-center justify-center text-lg font-bold text-sidebar-foreground">
                    {userProfile.full_name?.[0] || '?'}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-sidebar-foreground">{userProfile.full_name || 'User'}</p>
                  <p className="text-[10px] text-muted-foreground">{userProfile.email}</p>
                </div>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Activity */}
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
        <button onClick={handleSignOut} className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/[0.06] transition-all cursor-pointer">
          <LogOut className="w-4 h-4" /> Leave Workspace
        </button>
      </div>
    </div>
  );
}
