'use client';

import {
  ChevronDown, Settings, Upload, Lightbulb, FileText, ImageIcon,
  ArrowUp, Paperclip, X, Check, Loader2, Sliders, Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ParticleOrb } from '@/components/shared/particle-orb';
import { ShaderBackground } from '@/components/shared/ShaderBackground';
import { createClient } from '@/lib/supabase/client';
import { useIsMobile } from '@/components/ui/use-mobile';
import { cn } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function ChatArea({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const router = useRouter();
  const supabase = createClient();
  const isMobile = useIsMobile();
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [configDropdownOpen, setConfigDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings state
  const [model, setModel] = useState<'codex-v1' | 'codex-beta'>('codex-v1');
  const [creativity, setCreativity] = useState(70);
  const [outputStyle, setOutputStyle] = useState<'html' | 'jsx'>('html');

  // Options state
  const [sectionType, setSectionType] = useState<'hero' | 'cards' | 'pricing' | 'testimonials' | 'footer'>('hero');
  const [tone, setTone] = useState<'bold' | 'minimal' | 'playful'>('bold');
  const [accent, setAccent] = useState<'red' | 'blue' | 'green' | 'purple'>('red');

  // Close any open dropdown on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSettingsOpen(false);
        setOptionsOpen(false);
        setModelDropdownOpen(false);
        setConfigDropdownOpen(false);
        setExportDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSubmit = async () => {
    if (!prompt.trim() && attachedFiles.length === 0) return;
    setIsSubmitting(true);

    try {
      const sessionId = crypto.randomUUID().slice(0, 12);

      // Convert attached files to base64
      const fileData = await Promise.all(
        attachedFiles.map(async (f) => {
          const buffer = await f.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
          return {
            name: f.name,
            type: f.type,
            size: f.size,
            base64,
          };
        })
      );

      // Fold settings + options into the prompt so Gemini respects them
      const accentMap: Record<string, string> = {
        red: '#ef4444',
        blue: '#3b82f6',
        green: '#10b981',
        purple: '#a855f7',
      };
      const optionsDirective = [
        `[Section type: ${sectionType}]`,
        `[Tone: ${tone}]`,
        `[Accent colour: ${accent} (${accentMap[accent]})]`,
        `[Creativity: ${creativity}%]`,
        `[Output: ${outputStyle}]`,
      ].join(' ');
      const finalPrompt = `${optionsDirective} ${prompt.trim()}`.trim();

      const sessionData = {
        sessionId,
        prompt: finalPrompt,
        files: fileData,
        options: { sectionType, tone, accent, creativity, model, outputStyle },
        createdAt: new Date().toISOString(),
      };

      // Save to sessionStorage (for instant access on same device)
      sessionStorage.setItem(`codex-session-${sessionId}`, JSON.stringify(sessionData));

      // Save to MongoDB (for cross-device/cross-account access)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await fetch(`${API}/api/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              userId: user.id,
              email: user.email,
              fullName: user.user_metadata?.full_name || user.user_metadata?.name,
              avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture,
              prompt: finalPrompt,
              files: fileData,
              fileCount: fileData.length,
            }),
          });
        }
      } catch (err) {
        console.warn('Failed to save session to DB:', err);
        // Continue anyway — sessionStorage is the fallback
      }

      router.push(`/workspace/${sessionId}`);
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setAttachedFiles((prev) => [...prev, ...Array.from(files)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <main className="flex-1 flex flex-col relative overflow-hidden">
      <ShaderBackground />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-border/50 backdrop-blur-sm bg-background/30">
        <div className="flex items-center gap-2">
          {onMenuToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 sm:hidden text-muted-foreground hover:text-foreground"
              onClick={onMenuToggle}
            >
              <Menu className="w-4 h-4" />
            </Button>
          )}
          <div className="relative">
            <Button
              className="btn-3d btn-glow gap-1.5 sm:gap-2 text-xs sm:text-sm bg-gradient-to-br from-secondary/90 to-secondary/70 text-foreground hover:from-secondary/70 hover:to-secondary/50 backdrop-blur-sm border border-border/30 shadow-lg"
              onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            >
              {isMobile ? 'v1.0' : 'Promptify v1.0'}
              <ChevronDown className={cn('w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-300', modelDropdownOpen && 'rotate-180')} />
            </Button>
            {modelDropdownOpen && (
              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={() => setModelDropdownOpen(false)}>
                  Promptify v1.0 — UI Generator
                </button>
                <button className="dropdown-item" onClick={() => setModelDropdownOpen(false)}>
                  Promptify v0.5 — Beta
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="relative">
            <Button
              className="btn-3d btn-glow gap-1.5 sm:gap-2 text-xs sm:text-sm bg-gradient-to-br from-secondary/90 to-secondary/70 text-foreground hover:from-secondary/70 hover:to-secondary/50 backdrop-blur-sm border border-border/30 shadow-lg"
              onClick={() => setConfigDropdownOpen(!configDropdownOpen)}
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {isMobile ? '' : 'Configuration'}
            </Button>
            {configDropdownOpen && (
              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={() => setConfigDropdownOpen(false)}>General Settings</button>
                <button className="dropdown-item" onClick={() => setConfigDropdownOpen(false)}>API Keys</button>
                <button className="dropdown-item" onClick={() => setConfigDropdownOpen(false)}>Preferences</button>
                <button className="dropdown-item" onClick={() => setConfigDropdownOpen(false)}>Advanced</button>
              </div>
            )}
          </div>

          <div className="relative">
            <Button
              className="btn-3d btn-glow gap-1.5 sm:gap-2 text-xs sm:text-sm bg-gradient-to-br from-secondary/90 to-secondary/70 text-foreground hover:from-secondary/70 hover:to-secondary/50 backdrop-blur-sm border border-border/30 shadow-lg"
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
            >
              <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {isMobile ? '' : 'Export'}
            </Button>
            {exportDropdownOpen && (
              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={() => setExportDropdownOpen(false)}>Export as PDF</button>
                <button className="dropdown-item" onClick={() => setExportDropdownOpen(false)}>Export as Markdown</button>
                <button className="dropdown-item" onClick={() => setExportDropdownOpen(false)}>Export as JSON</button>
                <button className="dropdown-item" onClick={() => setExportDropdownOpen(false)}>Share Link</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-4 sm:pb-6 overflow-y-auto">
        <div className="relative mb-4 sm:mb-8">
          <ParticleOrb />
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl font-semibold text-foreground mb-4 sm:mb-8 text-center font-[var(--font-heading)] tracking-tight px-2">
          {isMobile ? 'Create Something New' : 'Ready to Create Something New?'}
        </h1>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-8 px-2">
          <Button variant="secondary" className="btn-3d btn-glow gap-1.5 sm:gap-2 bg-gradient-to-br from-secondary/90 to-secondary/70 text-foreground hover:from-secondary/70 hover:to-secondary/50 backdrop-blur-sm shadow-lg font-medium text-xs sm:text-sm"
            onClick={() => { setPrompt('Create a hero section with an athlete image on the left, bold headline, 3 stat cards, and a red CTA button.'); }}>
            <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {isMobile ? 'Image' : 'Create Image'}
          </Button>
          <Button variant="secondary" className="btn-3d btn-glow gap-1.5 sm:gap-2 bg-gradient-to-br from-secondary/90 to-secondary/70 text-foreground hover:from-secondary/70 hover:to-secondary/50 backdrop-blur-sm shadow-lg font-medium text-xs sm:text-sm"
            onClick={() => { setPrompt('Brainstorm a landing page layout for a fitness brand with modern dark theme and gradient accents.'); }}>
            <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {isMobile ? 'Ideas' : 'Brainstorm'}
          </Button>
          <Button variant="secondary" className="btn-3d btn-glow gap-1.5 sm:gap-2 bg-gradient-to-br from-secondary/90 to-secondary/70 text-foreground hover:from-secondary/70 hover:to-secondary/50 backdrop-blur-sm shadow-lg font-medium text-xs sm:text-sm"
            onClick={() => { setPrompt('Make a plan for a multi-section landing page: hero, features grid, testimonials, pricing, and footer.'); }}>
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {isMobile ? 'Plan' : 'Make a plan'}
          </Button>
        </div>

        {/* Input Area */}
        <div className="w-full max-w-4xl px-2 sm:px-0">
          {isRecording && (
            <div className="mb-3 input-3d bg-gradient-to-r from-black/90 via-black/95 to-black/90 backdrop-blur-xl rounded-full border border-border/50 px-4 sm:px-6 py-3 shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-300">
              <div className="flex items-center justify-between gap-4 sm:gap-6">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  <p className="text-xs sm:text-sm font-medium text-foreground">Recording...</p>
                </div>
                <div className="flex-1 flex items-center justify-center gap-[2px] h-8 sm:h-10 overflow-hidden">
                  {[...Array(isMobile ? 30 : 60)].map((_, i) => (
                    <div
                      key={i}
                      className="voice-wave-bar-horizontal bg-foreground/70 rounded-full shrink-0"
                      style={{
                        width: '2px',
                        animationDelay: `${-i * 0.03}s`,
                        animationDirection: 'reverse',
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="icon" className="btn-3d h-8 w-8 rounded-full bg-secondary/40 hover:bg-destructive/20 text-foreground hover:text-destructive" onClick={() => setIsRecording(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                  <Button size="icon" className="btn-3d btn-glow h-8 w-8 rounded-full bg-gradient-to-br from-white via-neutral-200 to-neutral-400 hover:from-neutral-100 hover:to-neutral-300 text-black shadow-xl" onClick={() => setIsRecording(false)}>
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Attached files */}
          {attachedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachedFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/30 text-xs sm:text-sm text-foreground/80">
                  <Paperclip className="w-3 h-3" />
                  <span className="truncate max-w-[100px] sm:max-w-[150px]">{file.name}</span>
                  <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground ml-1 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="input-3d bg-gradient-to-br from-secondary/70 via-secondary/60 to-secondary/50 backdrop-blur-xl rounded-2xl border border-border/50 p-3 sm:p-4 shadow-2xl">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isMobile ? "Describe the UI you want to build..." : "Describe the UI you want to build... (e.g. A split-hero section with athlete image left, headline, 3 stat cards, red CTA)"}
                  className="flex-1 bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground text-base sm:text-lg min-h-[60px] sm:min-h-[80px] font-normal"
                />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <div className="flex items-center gap-2 sm:gap-4">
                  <input ref={fileInputRef} type="file" multiple accept="image/*,.jsx,.tsx,.js,.ts" onChange={handleFileAttach} className="hidden" />
                  <Button variant="ghost" size="sm" className="btn-3d gap-1 sm:gap-2 text-muted-foreground hover:text-foreground text-xs sm:text-sm" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Attach</span>
                  </Button>
                  {/* Settings dropdown */}
                  <div className="relative">
                    <Button variant="ghost" size="sm"
                      className="btn-3d gap-1 sm:gap-2 text-muted-foreground hover:text-foreground text-xs sm:text-sm"
                      onClick={() => { setSettingsOpen((v) => !v); setOptionsOpen(false); }}>
                      <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Settings</span>
                      <ChevronDown className={cn('w-3 h-3 transition-transform', settingsOpen && 'rotate-180')} />
                    </Button>
                    {settingsOpen && (
                      <div className="absolute bottom-full mb-2 left-0 w-72 rounded-xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl p-3 z-50">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-1">Model</p>
                        <div className="grid grid-cols-2 gap-1.5 mb-3">
                          {[
                            { id: 'codex-v1', label: 'Promptify v1.0', sub: 'UI Generator' },
                            { id: 'codex-beta', label: 'Promptify v0.5', sub: 'Beta' },
                          ].map((m) => (
                            <button key={m.id} onClick={() => setModel(m.id as 'codex-v1' | 'codex-beta')}
                              className={cn('text-left px-2.5 py-2 rounded-lg border text-xs transition-all',
                                model === m.id
                                  ? 'bg-secondary/60 border-border text-foreground'
                                  : 'border-transparent hover:bg-secondary/40 text-muted-foreground hover:text-foreground')}>
                              <div className="font-medium">{m.label}</div>
                              <div className="text-[10px] text-muted-foreground/70">{m.sub}</div>
                            </button>
                          ))}
                        </div>

                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-1">Creativity</p>
                        <div className="px-1 mb-3">
                          <input type="range" min={0} max={100} value={creativity}
                            onChange={(e) => setCreativity(Number(e.target.value))}
                            className="w-full accent-white" />
                          <div className="flex justify-between text-[9px] text-muted-foreground font-mono mt-1">
                            <span>Precise</span><span>{creativity}%</span><span>Wild</span>
                          </div>
                        </div>

                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-1">Output style</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { id: 'html', label: 'HTML fragment' },
                            { id: 'jsx', label: 'JSX / React' },
                          ].map((s) => (
                            <button key={s.id} onClick={() => setOutputStyle(s.id as 'html' | 'jsx')}
                              className={cn('px-2.5 py-1.5 rounded-lg border text-xs transition-all',
                                outputStyle === s.id
                                  ? 'bg-secondary/60 border-border text-foreground'
                                  : 'border-transparent hover:bg-secondary/40 text-muted-foreground hover:text-foreground')}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Options dropdown */}
                  <div className="relative">
                    <Button variant="ghost" size="sm"
                      className="btn-3d gap-1 sm:gap-2 text-muted-foreground hover:text-foreground text-xs sm:text-sm"
                      onClick={() => { setOptionsOpen((v) => !v); setSettingsOpen(false); }}>
                      <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Options</span>
                      <ChevronDown className={cn('w-3 h-3 transition-transform', optionsOpen && 'rotate-180')} />
                    </Button>
                    {optionsOpen && (
                      <div className="absolute bottom-full mb-2 left-0 w-80 rounded-xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl p-3 z-50">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-1">Section type</p>
                        <div className="grid grid-cols-3 gap-1.5 mb-3">
                          {[
                            { id: 'hero', label: 'Hero' },
                            { id: 'cards', label: 'Cards' },
                            { id: 'pricing', label: 'Pricing' },
                            { id: 'testimonials', label: 'Reviews' },
                            { id: 'features', label: 'Features' },
                            { id: 'footer', label: 'Footer' },
                          ].map((s) => (
                            <button key={s.id} onClick={() => setSectionType(s.id as typeof sectionType)}
                              className={cn('px-2 py-1.5 rounded-lg border text-[11px] transition-all',
                                sectionType === s.id
                                  ? 'bg-secondary/60 border-border text-foreground'
                                  : 'border-transparent hover:bg-secondary/40 text-muted-foreground hover:text-foreground')}>
                              {s.label}
                            </button>
                          ))}
                        </div>

                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-1">Tone</p>
                        <div className="grid grid-cols-3 gap-1.5 mb-3">
                          {[
                            { id: 'bold', label: 'Bold' },
                            { id: 'minimal', label: 'Minimal' },
                            { id: 'playful', label: 'Playful' },
                          ].map((t) => (
                            <button key={t.id} onClick={() => setTone(t.id as typeof tone)}
                              className={cn('px-2 py-1.5 rounded-lg border text-[11px] transition-all',
                                tone === t.id
                                  ? 'bg-secondary/60 border-border text-foreground'
                                  : 'border-transparent hover:bg-secondary/40 text-muted-foreground hover:text-foreground')}>
                              {t.label}
                            </button>
                          ))}
                        </div>

                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-1">Accent colour</p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { id: 'red', label: 'Red', dot: 'bg-red-500' },
                            { id: 'blue', label: 'Blue', dot: 'bg-blue-500' },
                            { id: 'green', label: 'Green', dot: 'bg-emerald-500' },
                            { id: 'purple', label: 'Purple', dot: 'bg-purple-500' },
                          ].map((c) => (
                            <button key={c.id} onClick={() => setAccent(c.id as typeof accent)}
                              className={cn('flex items-center gap-2 px-2 py-1.5 rounded-lg border text-[11px] transition-all',
                                accent === c.id
                                  ? 'bg-secondary/60 border-border text-foreground'
                                  : 'border-transparent hover:bg-secondary/40 text-muted-foreground hover:text-foreground')}>
                              <span className={cn('w-2.5 h-2.5 rounded-full', c.dot)} />
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Button variant="ghost" size="icon" className="btn-3d h-8 w-8 sm:h-9 sm:w-9 text-white hover:text-foreground" onClick={() => setIsRecording(true)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" /><path d="M4 7a1 1 0 0 0-2 0 6 6 0 0 0 5 5.917V15a1 1 0 0 0 2 0v-2.083A6 6 0 0 0 14 7a1 1 0 0 0-2 0 4 4 0 0 1-8 0Z" /></svg>
                  </Button>
                  <Button
                    size="icon"
                    disabled={isSubmitting || (!prompt.trim() && attachedFiles.length === 0)}
                    className="btn-3d btn-glow h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br from-white via-neutral-200 to-neutral-400 hover:from-neutral-100 hover:to-neutral-300 text-black shadow-xl disabled:opacity-40"
                    onClick={handleSubmit}
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
