'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PanelMembers } from './PanelMembers';
import { PanelAgent, PanelAgentHandle } from './PanelAgent';
import { PanelPreview } from './PanelPreview';
import { ReviewQueue } from './ReviewQueue';
import { ShaderBackground } from '@/components/shared/ShaderBackground';
import {
  ArrowLeft, PanelLeftClose, PanelLeftOpen,
  PanelRightClose, PanelRightOpen, Sparkles, CircleDot,
  ExternalLink, Pencil, ClipboardCheck, Users,
  MessageSquare, Eye, Menu, X,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useWorkspaceSocket, WorkspaceChatMessage } from '@/hooks/useSocket';
import { createClient } from '@/lib/supabase/client';
import { useIsMobile } from '@/components/ui/use-mobile';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface FileData {
  name: string;
  type: string;
  size: number;
  base64?: string;
}

interface SessionData {
  sessionId: string;
  prompt: string;
  files: FileData[];
  createdAt: string;
}

type MobileTab = 'members' | 'reviews' | 'chat' | 'preview';

export function WorkspaceContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = (params?.sessionId as string) || '';
  const supabase = createClient();
  const isMobile = useIsMobile();

  const [session, setSession] = useState<SessionData | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // True once the initial DB/sessionStorage check has resolved — gates the PanelAgent mount
  const [initialLoadResolved, setInitialLoadResolved] = useState(false);

  const [activeSide, setActiveSide] = useState<'preview' | 'members' | 'reviews'>('preview');
  const [leftTab, setLeftTab] = useState<'members' | 'reviews'>('members');
  const [leftWidth, setLeftWidth] = useState(280);
  const [chatWidth, setChatWidth] = useState(340);
  const [now, setNow] = useState('');

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [progressiveHtml, setProgressiveHtml] = useState<string | null>(null);
  const [remoteGenerating, setRemoteGenerating] = useState(false);
  const [remoteGeneratingUser, setRemoteGeneratingUser] = useState<{ fullName?: string | null; email: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; fullName?: string | null; avatarUrl?: string | null } | null>(null);
  const panelAgentRef = useRef<PanelAgentHandle>(null);

  // Fetch the current Supabase user so PanelAgent can include it in chat broadcasts
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser({
          id: user.id,
          email: user.email || '',
          fullName: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        });
      }
    });
  }, [supabase]);

  // Track which HTML we already have so we can skip redundant socket updates
  const lastHtmlRef = useRef<string | null>(null);
  if (lastHtmlRef.current === null && previewHtml) lastHtmlRef.current = previewHtml;

  // Subscribe to realtime workspace events for this session
  const { broadcastChat } = useWorkspaceSocket(sessionId || null, {
    onHtmlUpdate: useCallback((payload: { htmlContent: string; status?: string; prompt?: string; user?: { fullName?: string | null; email: string } }) => {
      if (!payload?.htmlContent) return;
      if (lastHtmlRef.current === payload.htmlContent) return;
      lastHtmlRef.current = payload.htmlContent;
      setPreviewHtml(payload.htmlContent);
      setProgressiveHtml(null);
      // Another user finished generating — clear remote state
      if (payload.status === 'generated' || payload.status === 'edited') {
        setRemoteGenerating(false);
        setRemoteGeneratingUser(null);
      }
    }, []),

    onChatMessage: useCallback((payload: WorkspaceChatMessage) => {
      // Push remote chat messages into PanelAgent's message list
      panelAgentRef.current?.appendRemoteMessage({
        role: payload.role,
        content: payload.content,
        type: payload.type as 'status' | 'error' | 'thinking' | undefined,
        fromUser: payload.user ? (payload.user.fullName || payload.user.email) : undefined,
      });
      // Track remote generating state
      if (payload.role === 'user' && payload.user) {
        setRemoteGenerating(true);
        setRemoteGeneratingUser({ fullName: payload.user.fullName, email: payload.user.email });
      }
    }, []),

    onMemberChange: useCallback(() => {
      console.info('[Promptify] member list changed');
    }, []),
  });

  // Load session — try sessionStorage first, then MongoDB with retry
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    const loadSession = async () => {
      // 1. Try sessionStorage (instant, same device)
      const stored = sessionStorage.getItem(`codex-session-${sessionId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (!cancelled) setSession(parsed);
          // Also try to load HTML from DB; mark load resolved only after this finishes
          await fetchHtmlFromDb();
          if (!cancelled) setInitialLoadResolved(true);
          return;
        } catch {
          // corrupted sessionStorage, clear and fetch from DB
          sessionStorage.removeItem(`codex-session-${sessionId}`);
        }
      }

      // 2. Try MongoDB with retry
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[Workspace] Fetching session from DB (attempt ${attempt})...`);
          const res = await fetch(`${API}/api/sessions/${sessionId}`);

          if (res.ok) {
            const data = await res.json();
            console.log('[Workspace] Session data from DB:', { prompt: data.prompt, hasHtml: !!data.htmlContent, fileCount: data.files?.length });

            if (data && data.prompt) {
              const dbSession: SessionData = {
                sessionId: data.sessionId,
                prompt: data.prompt,
                files: data.files || [],
                createdAt: data.createdAt || new Date().toISOString(),
              };
              if (!cancelled) {
                setSession(dbSession);
                sessionStorage.setItem(`codex-session-${sessionId}`, JSON.stringify(dbSession));
                if (data.htmlContent) {
                  setPreviewHtml(data.htmlContent);
                }
                setInitialLoadResolved(true);
              }
              return;
            }
          }

          if (res.status === 404) {
            console.warn('[Workspace] Session not found in DB');
            break; // Don't retry 404
          }
        } catch (err) {
          console.warn(`[Workspace] Fetch attempt ${attempt} failed:`, err);
          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, 1000 * attempt)); // backoff
          }
        }
      }

      // 3. Not found anywhere
      if (!cancelled) {
        console.warn('[Workspace] Session not found, showing error');
        setLoadError('Session not found. It may not have been saved yet.');
        setInitialLoadResolved(true);
      }
    };

    loadSession();
    return () => { cancelled = true; };
  }, [sessionId, API]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch existing generated HTML from MongoDB (when loaded from sessionStorage)
  const fetchHtmlFromDb = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.htmlContent) {
          setPreviewHtml(data.htmlContent);
        }
      }
    } catch (err) {
      console.warn('[Workspace] Could not fetch HTML:', err);
    }
  }, [API, sessionId]);

  // Clock
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const saveToDb = useCallback(async (html: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await fetch(`${API}/api/sessions/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          fullName: user.user_metadata?.full_name || user.user_metadata?.name,
          avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture,
          prompt: session?.prompt || '',
          htmlContent: html,
          fileCount: session?.files?.length || 0,
        }),
      });
    } catch (err) {
      console.warn('[Workspace] Failed to save to DB:', err);
    }
  }, [API, sessionId, session, supabase]);

  const handlePreviewReady = useCallback((html: string) => {
    setPreviewHtml(html);
    setProgressiveHtml(null);
    saveToDb(html);
  }, [saveToDb]);

  const handleProgressiveHtml = useCallback((html: string) => {
    setProgressiveHtml(html);
  }, []);

  const toggleLeft = () => setActiveSide((prev) => (prev === 'members' ? 'preview' : 'members'));
  const toggleRight = () => setActiveSide((prev) => (prev === 'preview' ? 'members' : 'preview'));

  const startResizeChat = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = chatWidth;
    const onMove = (ev: MouseEvent) => setChatWidth(Math.max(280, Math.min(520, startW + (ev.clientX - startX))));
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startResizeLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = leftWidth;
    const onMove = (ev: MouseEvent) => setLeftWidth(Math.max(220, Math.min(420, startW + (ev.clientX - startX))));
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const leftOpen = activeSide === 'members' || activeSide === 'reviews';
  const rightOpen = activeSide === 'preview';
  const displayHtml = previewHtml || progressiveHtml;

  // Error state
  if (loadError) {
    return (
      <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
        <ShaderBackground />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center max-w-sm px-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 grid place-items-center">
            <span className="text-2xl">⚠</span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground/80">{loadError}</p>
            <p className="text-xs text-muted-foreground mt-1.5">Session ID: {sessionId}</p>
          </div>
          <Link href="/"
            className="px-4 py-2 rounded-xl bg-secondary/50 border border-border/30 text-xs font-medium text-foreground/70 hover:text-foreground hover:bg-secondary transition-all cursor-pointer">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  // Loading state
  if (!session) {
    return (
      <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
        <ShaderBackground />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-primary/20 rounded-2xl blur-xl animate-pulse" />
            <div className="relative w-full h-full rounded-2xl bg-secondary/40 border border-border/30 grid place-items-center">
              <Sparkles className="w-5 h-5 text-muted-foreground animate-pulse" />
            </div>
          </div>
          <div className="text-muted-foreground text-xs font-mono tracking-wider animate-pulse">Loading workspace…</div>
        </div>
      </div>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="relative h-screen overflow-hidden flex flex-col">
        <ShaderBackground />

        {/* Mobile Top Bar */}
        <header className="relative z-20 h-12 flex items-center justify-between px-3 shrink-0 border-b border-border/30 backdrop-blur-2xl bg-gradient-to-b from-background/60 via-background/40 to-background/20">
          <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-border/50 to-transparent opacity-50" />

          <div className="flex items-center gap-2 min-w-0">
            <Link href="/" className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-all active:scale-90" aria-label="Back to home">
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
            <div className="h-4 w-px bg-border/50" />
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative w-5 h-5 rounded-md bg-gradient-to-br from-primary/15 to-primary/5 border border-border/30 grid place-items-center shrink-0">
                <Sparkles className="w-2.5 h-2.5 text-foreground" />
                <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-background" />
              </div>
              <h1 className="text-[11px] font-medium text-foreground font-[var(--font-heading)] truncate max-w-[180px]">{session.prompt}</h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {previewHtml && (
              <>
                <a href={`data:text/html,${encodeURIComponent(previewHtml)}`} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all cursor-pointer"
                  title="Open preview in new tab">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <Link href={`/edit/${sessionId}`}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all cursor-pointer"
                  title="Edit content">
                  <Pencil className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </header>

        {/* Mobile tab content */}
        <div className="relative z-10 flex-1 overflow-hidden">
          {mobileTab === 'members' && (
            <PanelMembers sessionId={sessionId} />
          )}
          {mobileTab === 'reviews' && (
            <ReviewQueue sessionId={sessionId} />
          )}
          {mobileTab === 'chat' && (
            <div className="h-full relative">
              <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/20 to-background/40 backdrop-blur-sm" />
              <div className="relative h-full">
                {initialLoadResolved ? (
                  <PanelAgent
                    ref={panelAgentRef}
                    sessionId={sessionId}
                    initialPrompt={session.prompt}
                    initialFiles={session.files}
                    initialSavedHtml={previewHtml}
                    onPreviewReady={handlePreviewReady}
                    onProgressiveHtml={handleProgressiveHtml}
                    broadcastChat={broadcastChat}
                    remoteGenerating={remoteGenerating}
                    remoteGeneratingUser={remoteGeneratingUser}
                    currentUser={currentUser}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-secondary/40 border border-border/30 grid place-items-center animate-pulse">
                        <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono tracking-wider">Loading session…</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {mobileTab === 'preview' && (
            <PanelPreview previewHtml={displayHtml} sessionId={sessionId} />
          )}
        </div>

        {/* Mobile bottom tab bar */}
        <div className="relative z-20 shrink-0 border-t border-border/30 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center h-12">
            <button
              onClick={() => setMobileTab('members')}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-all',
                mobileTab === 'members' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <Users className="w-4 h-4" />
              <span className="text-[9px] font-medium">Team</span>
            </button>
            <button
              onClick={() => setMobileTab('reviews')}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-all',
                mobileTab === 'reviews' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span className="text-[9px] font-medium">Reviews</span>
            </button>
            <button
              onClick={() => setMobileTab('chat')}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-all',
                mobileTab === 'chat' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-[9px] font-medium">Chat</span>
            </button>
            <button
              onClick={() => setMobileTab('preview')}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-all',
                mobileTab === 'preview' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <Eye className="w-4 h-4" />
              <span className="text-[9px] font-medium">Preview</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="relative h-screen overflow-hidden flex flex-col">
      <ShaderBackground />

      {/* Top Bar */}
      <header className="relative z-20 h-12 flex items-center justify-between px-3 shrink-0 border-b border-border/30 backdrop-blur-2xl bg-gradient-to-b from-background/60 via-background/40 to-background/20">
        <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-border/50 to-transparent opacity-50" />

        <div className="flex items-center gap-2 min-w-0">
          <Link href="/" className="group/back relative p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-all active:scale-90" aria-label="Back to home">
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover/back:-translate-x-0.5" />
          </Link>
          <div className="h-4 w-px bg-border/50" />
          <button onClick={toggleLeft}
            className={cn('p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all cursor-pointer active:scale-90', leftOpen && 'bg-secondary/40 text-foreground/70')}
            aria-label="Toggle left panel">
            {leftOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
          </button>
          {leftOpen && (
            <div className="flex items-center p-0.5 rounded-lg bg-secondary/30 border border-border/20">
              <button onClick={() => setLeftTab('members')}
                className={cn('flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-all cursor-pointer', leftTab === 'members' ? 'bg-secondary/60 text-foreground' : 'text-muted-foreground hover:text-foreground/60')}>
                <Users className="w-3 h-3" /> Team
              </button>
              <button onClick={() => setLeftTab('reviews')}
                className={cn('flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-all cursor-pointer', leftTab === 'reviews' ? 'bg-secondary/60 text-foreground' : 'text-muted-foreground hover:text-foreground/60')}>
                <ClipboardCheck className="w-3 h-3" /> Reviews
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative w-5 h-5 rounded-md bg-gradient-to-br from-primary/15 to-primary/5 border border-border/30 grid place-items-center shrink-0">
              <Sparkles className="w-2.5 h-2.5 text-foreground" />
              <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-background" />
            </div>
            <h1 className="text-[11px] font-medium text-foreground font-[var(--font-heading)] truncate max-w-[320px]">{session.prompt}</h1>
          </div>
        </div>

        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/30 border border-border/30">
            <CircleDot className="w-2 h-2 text-emerald-400 animate-pulse" />
            <span className="text-[9px] text-muted-foreground font-mono tracking-wider uppercase">Live</span>
            <span className="text-[9px] text-muted-foreground/50 font-mono">·</span>
            <span className="text-[9px] text-muted-foreground font-mono tabular-nums">{now}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {previewHtml && (
            <>
              <a href={`data:text/html,${encodeURIComponent(previewHtml)}`} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all cursor-pointer"
                title="Open preview in new tab">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <Link href={`/edit/${sessionId}`}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all cursor-pointer"
                title="Edit content">
                <Pencil className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
          <button onClick={toggleRight}
            className={cn('p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all cursor-pointer active:scale-90', rightOpen && 'bg-secondary/40 text-foreground/70')}
            aria-label="Toggle preview panel">
            {rightOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Layout: Members(optional) | Chat | Preview (dominant) */}
      <div className="relative z-10 flex-1 flex overflow-hidden">

        {/* Left: Members / Reviews panel (optional) */}
        <div className={cn(
          'relative shrink-0 overflow-hidden border-r border-border/30 transition-all duration-500 ease-out',
          leftOpen ? 'opacity-100' : 'w-0 opacity-0 border-r-0'
        )}
          style={{ width: leftOpen ? leftWidth : 0 }}>
          <div className="h-full transition-transform duration-500" style={{ transform: leftOpen ? 'translateX(0)' : 'translateX(-100%)' }}>
            {leftTab === 'members' ? (
              <PanelMembers sessionId={sessionId} />
            ) : (
              <ReviewQueue sessionId={sessionId} />
            )}
          </div>
          {leftOpen && <ResizeHandle onMouseDown={startResizeLeft} side="right" />}
        </div>

        {/* Center: Chat (narrower, left side) */}
        <div className="relative shrink-0 overflow-hidden border-r border-border/30"
          style={{ width: chatWidth }}>
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/20 to-background/40 backdrop-blur-sm" />
          <div className="relative h-full">
            {initialLoadResolved ? (
              <PanelAgent
                ref={panelAgentRef}
                sessionId={sessionId}
                initialPrompt={session.prompt}
                initialFiles={session.files}
                initialSavedHtml={previewHtml}
                onPreviewReady={handlePreviewReady}
                onProgressiveHtml={handleProgressiveHtml}
                broadcastChat={broadcastChat}
                remoteGenerating={remoteGenerating}
                remoteGeneratingUser={remoteGeneratingUser}
                currentUser={currentUser}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary/40 border border-border/30 grid place-items-center animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono tracking-wider">Loading session…</p>
                </div>
              </div>
            )}
          </div>
          <ResizeHandle onMouseDown={startResizeChat} side="right" />
        </div>

        {/* Right: Preview (takes remaining space — always dominant) */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <PanelPreview previewHtml={displayHtml} sessionId={sessionId} />
        </div>
      </div>
    </div>
  );
}

function ResizeHandle({ onMouseDown, side }: { onMouseDown: (e: React.MouseEvent) => void; side: 'left' | 'right' }) {
  return (
    <div onMouseDown={onMouseDown} className={cn('absolute top-0 bottom-0 w-1 cursor-col-resize group/handle z-10', side === 'right' ? 'right-0' : 'left-0')}>
      <div className={cn('absolute inset-y-0 w-px bg-gradient-to-b from-transparent via-border/30 to-transparent transition-all duration-200 group-hover/handle:via-border group-hover/handle:w-0.5', side === 'right' ? 'right-0' : 'left-0')} />
      <div className={cn('absolute inset-y-0 -inset-x-1 transition-colors group-hover/handle:bg-secondary/30')} />
    </div>
  );
}
