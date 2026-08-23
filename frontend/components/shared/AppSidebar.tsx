'use client';
import { useState, useEffect } from 'react';
import {
  Wand2, Eye, LayoutGrid, Clock, Zap, Crown, LogOut,
  PanelLeftClose, PanelLeftOpen, User, FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CollapsibleSection } from '@/components/workspace/collapsible-section';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { User as SupaUser } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const jobHistory = useSelector((s: RootState) => s.studio.jobHistory);
  const supabase = createClient();

  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<SupaUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => setProfile(data));
      }
    });
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const displayEmail = profile?.email || user?.email || '';
  const avatarUrl = profile?.avatar_url || null;

  return (
    <aside
      className={cn(
        'bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 transition-all duration-300 ease-in-out overflow-hidden',
        collapsed ? 'w-14' : 'w-72'
      )}
    >
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-sidebar-border min-h-[57px]">
        {!collapsed && (
          <>
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-sidebar-foreground font-[var(--font-heading)] tracking-tight whitespace-nowrap">
              CodeX
            </span>
            <span className="ml-auto text-xs text-muted-foreground bg-sidebar-accent px-2 py-0.5 rounded-full whitespace-nowrap">
              T19
            </span>
          </>
        )}
        {collapsed && (
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <div className={cn('border-b border-sidebar-border flex', collapsed ? 'justify-center' : 'justify-end')}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 m-1 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </Button>
      </div>

      {/* Collapsed: icon-only nav */}
      {collapsed ? (
        <div className="flex flex-col items-center gap-1 py-3 px-1">
          <Link href="/" title="Dashboard">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-10 w-10 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent',
                pathname === '/' && 'bg-sidebar-accent text-sidebar-foreground'
              )}
            >
              <User className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/generate" title="Generator Studio">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-10 w-10 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent',
                pathname === '/generate' && 'bg-sidebar-accent text-sidebar-foreground'
              )}
            >
              <Wand2 className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/sections" title="All Sections">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-10 w-10 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent',
                pathname === '/sections' && 'bg-sidebar-accent text-sidebar-foreground'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </Link>

          {jobHistory.length > 0 && (
            <div className="mt-2 flex flex-col items-center gap-1">
              <Clock className="w-3 h-3 text-muted-foreground" />
              {jobHistory.slice(0, 3).map((job) => (
                <Link key={job.id} href={`/preview/${job.pageName}`} title={job.sectionName}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Expanded: full nav with collapsible sections */
        <div className="px-3 py-4 flex-1 overflow-y-auto space-y-2">
          {/* Profile Section */}
          <CollapsibleSection
            title="My Profile"
            icon={<User className="w-3.5 h-3.5" />}
            defaultOpen={true}
          >
            <div className="space-y-1 px-1">
              <Link href="/">
                <Button
                  variant="ghost"
                  className={cn(
                    'btn-3d w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent font-medium',
                    pathname === '/' && 'bg-sidebar-accent'
                  )}
                >
                  <User className="w-4 h-4" /> Dashboard
                </Button>
              </Link>
              <Link href="/generate">
                <Button
                  variant="ghost"
                  className={cn(
                    'btn-3d w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent font-medium',
                    pathname === '/generate' && 'bg-sidebar-accent'
                  )}
                >
                  <Wand2 className="w-4 h-4" /> Generator Studio
                </Button>
              </Link>
              <Link href="/sections">
                <Button
                  variant="ghost"
                  className={cn(
                    'btn-3d w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent font-medium',
                    pathname === '/sections' && 'bg-sidebar-accent'
                  )}
                >
                  <LayoutGrid className="w-4 h-4" /> All Sections
                </Button>
              </Link>
            </div>
          </CollapsibleSection>

          {/* Projects Section */}
          <CollapsibleSection
            title="Projects"
            icon={<FolderOpen className="w-3.5 h-3.5" />}
            defaultOpen={true}
          >
            <div className="space-y-1 px-1">
              {jobHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground px-3 py-2">No projects yet. Start generating!</p>
              ) : (
                jobHistory.map((job) => (
                  <Link key={job.id} href={`/preview/${job.pageName}`}>
                    <Button
                      variant="ghost"
                      className="btn-3d w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent font-medium text-sm"
                    >
                      <Eye className="w-3 h-3 shrink-0" />
                      <span className="truncate">{job.sectionName}</span>
                    </Button>
                  </Link>
                ))
              )}
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* Upgrade card - hidden when collapsed */}
      {!collapsed && (
        <div className="p-3">
          <div className="card-3d bg-sidebar-accent rounded-xl p-4 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-sidebar-accent/50 flex items-center justify-center mx-auto">
              <Crown className="w-5 h-5 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-sm font-semibold text-sidebar-foreground font-[var(--font-heading)]">
                SIH 2026 — Team CodeX
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AI-Assisted UI Generation from Wireframe, Code &amp; Prompt. Problem Statement PS7.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* User Profile */}
      {user && (
        <div className={cn('border-t border-sidebar-border', collapsed ? 'p-2' : 'p-3')}>
          <div className={cn('flex items-center gap-3', collapsed ? 'justify-center' : '')}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="w-8 h-8 rounded-full border border-sidebar-border object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-semibold text-sidebar-foreground shrink-0">
                {displayName[0]?.toUpperCase() || '?'}
              </div>
            )}
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {displayEmail}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={handleSignOut}
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            )}
            {collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={handleSignOut}
                title="Sign out"
              >
                <LogOut className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
