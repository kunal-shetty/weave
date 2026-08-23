'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PanelMembers } from './PanelMembers';
import { PanelAgent } from './PanelAgent';
import { PanelPreview } from './PanelPreview';
import { ShaderBackground } from '@/components/shared/ShaderBackground';
import {
  ArrowLeft, PanelLeftClose, PanelLeftOpen,
  PanelRightClose, PanelRightOpen, Sparkles, CircleDot,
  ExternalLink, Pencil,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

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

export function WorkspaceContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = (params?.sessionId as string) || '';
  const supabase = createClient();
  const generatedRef = useRef(false);

  const [session, setSession] = useState<SessionData | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadingFromDb, setLoadingFromDb] = useState(true);

  // Panel visibility: only 2 at a time, center always visible
  // "preview" = right panel, "members" = left panel
  const [activeSide, setActiveSide] = useState<'preview' | 'members'>('preview');
  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(460);
  const [now, setNow] = useState('');

  // Progressive HTML for real-time preview rendering
  const [progressiveHtml, setProgressiveHtml] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(`codex-session-${sessionId}`);
    if (stored) {
      setSession(JSON.parse(stored));
    } else {
      router.push('/');
      return;
    }

    // Try to load existing generated content from MongoDB
    fetchExistingSession();
  }, [sessionId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clock
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Load existing session from MongoDB
  const fetchExistingSession = async () => {
    try {
      const res = await fetch(`${API}/api/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.htmlContent) {
          setPreviewHtml(data.htmlContent);
          setLoadingFromDb(false);
          generatedRef.current = true;
          return;
        }
      }
    } catch (err) {
      console.warn('Could not fetch existing session:', err);
    }
    setLoadingFromDb(false);
  };

  // Save to MongoDB after generation
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
      console.warn('Failed to save session to DB:', err);
    }
  }, [API, sessionId, session, supabase]);

  const handlePreviewReady = useCallback((html: string) => {
    setPreviewHtml(html);
    setProgressiveHtml(null); // clear progressive — final is loaded
    saveToDb(html);
  }, [saveToDb]);

  // Progressive HTML updates (line-by-line streaming feel)
  const handleProgressiveHtml = useCallback((html: string) => {
    setProgressiveHtml(html);
  }, []);

  // Toggle side panels — only 2 at a time
  const toggleLeft = () => {
    setActiveSide((prev) => (prev === 'members' ? 'preview' : 'members'));
  };
  const toggleRight = () => {
    setActiveSide((prev) => (prev === 'preview' ? 'members' : 'preview'));
  };

  // Drag-to-resize
  const startResize = (side: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = side === 'left' ? leftWidth : rightWidth;
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      if (side === 'left') {
        setLeftWidth(Math.max(220, Math.min(420, startW + delta)));
      } else {
        setRightWidth(Math.max(340, Math.min(640, startW - delta)));
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const leftOpen = activeSide === 'members';
  const rightOpen = activeSide === 'preview';

  // The HTML to show in preview: final or progressive
  const displayHtml = previewHtml || progressiveHtml;

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

  return (
    <div className="relative h-screen overflow-hidden flex flex-col">
      <ShaderBackground />

      {/* Top Bar */}
      <header className="relative z-20 h-14 flex items-center justify-between px-3 shrink-0 border-b border-border/30 backdrop-blur-2xl bg-gradient-to-b from-background/60 via-background/40 to-background/20">
        <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-border/50 to-transparent opacity-50" />

        <div className="flex items-center gap-2 min-w-0">
          <Link href="/" className="group/back relative p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-all active:scale-90" aria-label="Back to home">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover/back:-translate-x-0.5" />
          </Link>
          <div className="h-5 w-px bg-border/50" />
          <button onClick={toggleLeft}
            className={cn('p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all cursor-pointer active:scale-90', leftOpen && 'bg-secondary/40 text-foreground/70')}
            aria-label="Toggle members panel">
            {leftOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative w-6 h-6 rounded-md bg-gradient-to-br from-primary/15 to-primary/5 border border-border/30 grid place-items-center shrink-0">
              <Sparkles className="w-3 h-3 text-foreground" />
              <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-background" />
            </div>
            <h1 className="text-xs font-medium text-foreground font-[var(--font-heading)] truncate max-w-[280px]">{session.prompt}</h1>
          </div>
        </div>

        {/* Center status */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/30 border border-border/30">
            <CircleDot className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
            <span className="text-[10px] text-muted-foreground font-mono tracking-wider uppercase">Live session</span>
            <span className="text-[10px] text-muted-foreground/50 font-mono">·</span>
            <span className="text-[10px] text-muted-foreground font-mono tabular-nums">{now}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {previewHtml && (
            <>
              <a href={`data:text/html,${encodeURIComponent(previewHtml)}`} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all cursor-pointer"
                title="Open preview in new tab">
                <ExternalLink className="w-4 h-4" />
              </a>
              <Link href={`/edit/${sessionId}`}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all cursor-pointer"
                title="Edit content">
                <Pencil className="w-4 h-4" />
              </Link>
            </>
          )}
          <button onClick={toggleRight}
            className={cn('p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all cursor-pointer active:scale-90', rightOpen && 'bg-secondary/40 text-foreground/70')}
            aria-label="Toggle preview panel">
            {rightOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 3-Panel Layout — only 2 visible at a time, center always */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* Left: Members / Tasks / Profile */}
        <div className={cn(
          'relative shrink-0 overflow-hidden border-r border-border/30 transition-all duration-500 ease-out',
          leftOpen ? 'opacity-100' : 'w-0 opacity-0 border-r-0'
        )}
          style={{ width: leftOpen ? leftWidth : 0 }}>
          <div className="h-full transition-transform duration-500" style={{ transform: leftOpen ? 'translateX(0)' : 'translateX(-100%)' }}>
            <PanelMembers sessionId={sessionId} />
          </div>
          {leftOpen && <ResizeHandle onMouseDown={startResize('left')} side="right" />}
        </div>

        {/* Center: Agent — always visible, takes remaining space */}
        <div className="flex-1 min-w-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/10 to-background/30 backdrop-blur-sm" />
          <div className="relative h-full">
            <PanelAgent
              sessionId={sessionId}
              initialPrompt={session.prompt}
              initialFiles={session.files}
              onPreviewReady={handlePreviewReady}
              onProgressiveHtml={handleProgressiveHtml}
              skipInitialGeneration={!!previewHtml}
            />
          </div>
        </div>

        {/* Right: Preview */}
        <div className={cn(
          'relative shrink-0 overflow-hidden transition-all duration-500 ease-out',
          rightOpen ? 'opacity-100' : 'w-0 opacity-0'
        )}
          style={{ width: rightOpen ? rightWidth : 0 }}>
          <div className="h-full transition-transform duration-500" style={{ transform: rightOpen ? 'translateX(0)' : 'translateX(100%)' }}>
            <PanelPreview previewHtml={displayHtml} sessionId={sessionId} />
          </div>
          {rightOpen && <ResizeHandle onMouseDown={startResize('right')} side="left" />}
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
