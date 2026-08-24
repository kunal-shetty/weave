'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ChatArea } from '@/components/chat/ChatArea';
import { ShaderBackground } from '@/components/shared/ShaderBackground';
import { useIsMobile } from '@/components/ui/use-mobile';
import {
  Sparkles, ArrowUpRight, LogOut, ChevronRight, Layers, Clock, Plus, Menu, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Project {
  _id?: string;
  sessionId: string;
  prompt: string;
  htmlContent?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

export function HomeShell() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setProfile(null);
        return;
      }
      const meta = (user.user_metadata || {}) as Record<string, unknown>;
      setProfile({
        id: user.id,
        email: user.email ?? '',
        fullName: ((meta.full_name as string) || (meta.name as string) || null),
        avatarUrl: ((meta.avatar_url as string) || (meta.picture as string) || null),
      });

      // Fetch this user's previous projects
      setLoadingProjects(true);
      fetch(`${API}/api/sessions/user/${user.id}`)
        .then((r) => r.json())
        .then((data: Project[]) => {
          if (Array.isArray(data)) setProjects(data);
        })
        .catch(() => { /* surface error UI later */ })
        .finally(() => setLoadingProjects(false));
    });
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <ShaderBackground />

      {/* Mobile sidebar toggle */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-sidebar/90 border border-border/50 backdrop-blur-xl text-sidebar-foreground hover:bg-sidebar-accent transition-all"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      )}

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left rail */}
      <aside className={cn(
        'relative z-40 h-full border-r border-border/50 bg-sidebar/80 backdrop-blur-xl flex flex-col shrink-0 transition-all duration-300',
        isMobile
          ? cn('fixed inset-y-0 left-0 w-[320px]', sidebarOpen ? 'translate-x-0' : '-translate-x-full')
          : 'w-[320px]'
      )}>
        {/* Profile header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white/20 to-white/5 border border-sidebar-border grid place-items-center">
              <Sparkles className="w-4 h-4 text-sidebar-foreground" />
            </div>
            <span className="text-sm font-semibold text-sidebar-foreground font-[var(--font-heading)]">Promptify</span>
          </div>

          {profile ? (
            <div className="flex items-center gap-3">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="w-10 h-10 rounded-xl border border-sidebar-border object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/20 to-white/5 border border-sidebar-border flex items-center justify-center text-sm font-bold text-sidebar-foreground">
                  {(profile.fullName?.[0] || profile.email[0] || '?').toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">
                  {profile.fullName || 'You'}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{profile.email}</p>
              </div>
            </div>
          ) : (
            <button onClick={() => router.push('/auth')}
              className="w-full text-left px-3 py-2.5 rounded-lg bg-sidebar-accent border border-sidebar-border hover:border-sidebar-border/80 transition-colors">
              <p className="text-xs font-medium text-sidebar-foreground">Sign in to save projects</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Track every section you generate</p>
            </button>
          )}
        </div>

        {/* Projects list */}
        <div className="flex-1 overflow-y-auto scrollbar-none p-3">
          <div className="flex items-center justify-between px-1.5 mb-2">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Your projects</span>
              <span className="text-[10px] text-muted-foreground/60">{projects.length}</span>
            </div>
          </div>

          {loadingProjects ? (
            <div className="space-y-2 px-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-sidebar-accent/40 animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="px-3 py-8 text-center rounded-lg border border-dashed border-sidebar-border bg-sidebar-accent/30">
              <Plus className="w-5 h-5 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-[11px] text-muted-foreground">No projects yet</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Generate your first section on the right →</p>
            </div>
          ) : (
            <div className="space-y-1">
              {projects.map((p) => (
                <button
                  key={p.sessionId}
                  onClick={() => router.push(`/workspace/${p.sessionId}`)}
                  className={cn(
                    'group/proj w-full text-left px-3 py-2.5 rounded-lg bg-sidebar-accent/40 hover:bg-sidebar-accent border border-sidebar-border/60 hover:border-sidebar-border transition-all',
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-sidebar-foreground line-clamp-2 leading-snug">
                        {p.prompt || 'Untitled section'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Clock className="w-2.5 h-2.5 text-muted-foreground/60" />
                        <span className="text-[9px] text-muted-foreground/70 font-mono">
                          {timeAgo(p.updatedAt || p.createdAt)}
                        </span>
                        {p.status && (
                          <span className={cn(
                            'text-[9px] font-mono px-1 py-0.5 rounded',
                            p.status === 'edited' && 'bg-blue-500/10 text-blue-300/80',
                            p.status === 'generated' && 'bg-emerald-500/10 text-emerald-300/80',
                            p.status === 'created' && 'bg-white/5 text-muted-foreground',
                          )}>
                            {p.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowUpRight className="w-3 h-3 text-muted-foreground/40 group-hover/proj:text-sidebar-foreground transition-colors shrink-0 mt-0.5" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sign out */}
        {profile && (
          <div className="p-3 border-t border-sidebar-border">
            <button onClick={handleSignOut}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/[0.06] transition-all cursor-pointer">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        )}
      </aside>

      {/* Right pane — existing prompt area */}
      <main className="relative flex-1 flex flex-col overflow-hidden">
        <ChatArea onMenuToggle={isMobile ? () => setSidebarOpen(!sidebarOpen) : undefined} />
      </main>
    </div>
  );
}
