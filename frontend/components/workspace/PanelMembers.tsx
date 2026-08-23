'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users, UserPlus, Crown, Copy, Check, Sparkles, LogOut, Activity,
} from 'lucide-react';
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
  role: 'owner' | 'member';
  status: string;
  createdAt?: string;
}

export function PanelMembers({ sessionId }: { sessionId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const { onlineCount } = useSupabasePresence(`workspace:${sessionId}`, { role: 'viewer' });

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/workspace-members/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (err) {
      console.warn('Failed to fetch members:', err);
    } finally {
      setLoading(false);
    }
  }, [API, sessionId]);

  useEffect(() => {
    fetchMembers();
    const interval = setInterval(fetchMembers, 10000);
    return () => clearInterval(interval);
  }, [fetchMembers]);

  const copyInviteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/workspace/${sessionId}?invite=true`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      const res = await fetch(`${API}/api/workspace-members/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: 'member' }),
      });
      if (res.ok) {
        setInviteEmail('');
        setInviteOpen(false);
        fetchMembers();
      }
    } catch (err) {
      console.warn('Failed to invite:', err);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await fetch(`${API}/api/workspace-members/${sessionId}/${userId}`, { method: 'DELETE' });
      fetchMembers();
    } catch (err) {
      console.warn('Failed to remove member:', err);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  const getMemberInitials = (m: Member) => {
    if (m.fullName) return m.fullName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
    return m.email.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white/15 to-white/5 border border-sidebar-border flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-sidebar-foreground" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-sidebar" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-sidebar-foreground font-[var(--font-heading)] truncate">Workspace</h2>
            <p className="text-[10px] text-muted-foreground font-mono truncate tracking-wider">{sessionId.slice(0, 16)}…</p>
          </div>
        </div>
      </div>

      {/* Members section */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-sidebar-foreground">Members</span>
            <span className="text-[10px] text-muted-foreground font-mono">· {members.length}</span>
            <span className="text-[10px] text-emerald-400/80 inline-flex items-center gap-1">
              <Activity className="w-2.5 h-2.5" />
              {onlineCount || members.length || 0}
            </span>
          </div>
          <button
            onClick={() => setInviteOpen((v) => !v)}
            className={cn('p-1.5 rounded-md cursor-pointer text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all', inviteOpen && 'bg-sidebar-accent text-sidebar-foreground')}
            aria-label="Invite member"
          >
            <UserPlus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Invite form */}
        <div className={cn('overflow-hidden transition-all duration-300 ease-out mx-3', inviteOpen ? 'max-h-40 opacity-100 mb-3' : 'max-h-0 opacity-0')}>
          <div className="p-3 rounded-xl bg-sidebar-accent border border-sidebar-border space-y-2">
            <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
              placeholder="teammate@company.com"
              className="h-9 text-xs bg-input border-border text-foreground placeholder:text-muted-foreground" />
            <div className="flex gap-1.5">
              <Button size="sm" onClick={handleInvite}
                className="flex-1 h-8 text-[10px] btn-3d bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 text-sidebar-foreground border border-sidebar-border font-medium">
                <UserPlus className="w-3 h-3 mr-1" /> Send invite
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-[10px] text-muted-foreground hover:text-sidebar-foreground px-3" onClick={copyInviteLink}>
                {linkCopied ? <span className="flex items-center gap-1 text-emerald-400"><Check className="w-3 h-3" /> Copied</span> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Member list */}
        <div className="px-2 pb-3 space-y-0.5">
          {loading ? (
            <div className="px-3 py-4 text-center">
              <p className="text-[10px] text-muted-foreground animate-pulse">Loading members…</p>
            </div>
          ) : members.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-[10px] text-muted-foreground">No members yet. Invite someone!</p>
            </div>
          ) : (
            members.map((member) => (
              <div key={member.userId}
                className="group/member w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent/60 transition-colors">
                <div className="relative shrink-0">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" className="w-8 h-8 rounded-lg border border-white/10 object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-foreground border border-white/10 bg-gradient-to-br from-white/15 to-white/5">
                      {getMemberInitials(member)}
                    </div>
                  )}
                  <span className={cn('absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-sidebar',
                    member.status === 'active' ? 'bg-emerald-400' : 'bg-white/20')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate text-sidebar-foreground">{member.fullName || member.email}</span>
                    {member.role === 'owner' && <Crown className="w-3 h-3 text-amber-400/80 shrink-0" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground capitalize tracking-wide">{member.role}</span>
                </div>
                {member.role !== 'owner' && (
                  <button onClick={() => handleRemoveMember(member.userId)}
                    className="p-1 rounded-md text-muted-foreground/30 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover/member:opacity-100 cursor-pointer"
                    title="Remove member">
                    <UserPlus className="w-3 h-3 rotate-45" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sign out */}
      <div className="p-3 border-t border-sidebar-border">
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/[0.06] transition-all cursor-pointer">
          <LogOut className="w-4 h-4" /> Leave Workspace
        </button>
      </div>
    </div>
  );
}
