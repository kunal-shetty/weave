'use client';

import {
  ChevronDown, Settings, Upload, Lightbulb, FileText, ImageIcon,
  ArrowUp, Paperclip, X, Check, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ParticleOrb } from '@/components/shared/particle-orb';
import { ShaderBackground } from '@/components/shared/ShaderBackground';

export function ChatArea() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [configDropdownOpen, setConfigDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!prompt.trim() && attachedFiles.length === 0) return;
    setIsSubmitting(true);

    try {
      // Create a unique session ID
      const sessionId = crypto.randomUUID().slice(0, 12);

      // Convert attached files to base64 for sending to LLM
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

      // Store session data in sessionStorage for the workspace to pick up
      const sessionData = {
        sessionId,
        prompt: prompt.trim(),
        files: fileData,
        createdAt: new Date().toISOString(),
      };
      sessionStorage.setItem(`codex-session-${sessionId}`, JSON.stringify(sessionData));

      // Navigate to workspace
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
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/50 backdrop-blur-sm bg-background/30">
        <div className="relative">
          <Button
            className="btn-3d btn-glow gap-2 bg-gradient-to-br from-secondary/90 to-secondary/70 text-foreground hover:from-secondary/70 hover:to-secondary/50 backdrop-blur-sm border border-border/30 shadow-lg"
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
          >
            CodeX v1.0
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${modelDropdownOpen ? 'rotate-180' : ''}`} />
          </Button>
          {modelDropdownOpen && (
            <div className="dropdown-menu">
              <button className="dropdown-item" onClick={() => setModelDropdownOpen(false)}>
                CodeX v1.0 — UI Generator
              </button>
              <button className="dropdown-item" onClick={() => setModelDropdownOpen(false)}>
                CodeX v0.5 — Beta
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              className="btn-3d btn-glow gap-2 bg-gradient-to-br from-secondary/90 to-secondary/70 text-foreground hover:from-secondary/70 hover:to-secondary/50 backdrop-blur-sm border border-border/30 shadow-lg"
              onClick={() => setConfigDropdownOpen(!configDropdownOpen)}
            >
              <Settings className="w-4 h-4" />
              Configuration
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
              className="btn-3d btn-glow gap-2 bg-gradient-to-br from-secondary/90 to-secondary/70 text-foreground hover:from-secondary/70 hover:to-secondary/50 backdrop-blur-sm border border-border/30 shadow-lg"
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
            >
              <Upload className="w-4 h-4" />
              Export
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
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-6">
        <div className="relative mb-8">
          <ParticleOrb />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-semibold text-foreground mb-8 text-center font-[var(--font-heading)] tracking-tight">
          Ready to Create Something New?
        </h1>

        {/* Quick Actions */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="secondary" className="btn-3d btn-glow gap-2 bg-gradient-to-br from-secondary/90 to-secondary/70 text-foreground hover:from-secondary/70 hover:to-secondary/50 backdrop-blur-sm shadow-lg font-medium"
            onClick={() => { setPrompt('Create a hero section with an athlete image on the left, bold headline, 3 stat cards, and a red CTA button.'); }}>
            <ImageIcon className="w-4 h-4" />
            Create Image
          </Button>
          <Button variant="secondary" className="btn-3d btn-glow gap-2 bg-gradient-to-br from-secondary/90 to-secondary/70 text-foreground hover:from-secondary/70 hover:to-secondary/50 backdrop-blur-sm shadow-lg font-medium"
            onClick={() => { setPrompt('Brainstorm a landing page layout for a fitness brand with modern dark theme and gradient accents.'); }}>
            <Lightbulb className="w-4 h-4" />
            Brainstorm
          </Button>
          <Button variant="secondary" className="btn-3d btn-glow gap-2 bg-gradient-to-br from-secondary/90 to-secondary/70 text-foreground hover:from-secondary/70 hover:to-secondary/50 backdrop-blur-sm shadow-lg font-medium"
            onClick={() => { setPrompt('Make a plan for a multi-section landing page: hero, features grid, testimonials, pricing, and footer.'); }}>
            <FileText className="w-4 h-4" />
            Make a plan
          </Button>
        </div>

        {/* Input Area */}
        <div className="w-full max-w-4xl">
          {isRecording && (
            <div className="mb-3 input-3d bg-gradient-to-r from-black/90 via-black/95 to-black/90 backdrop-blur-xl rounded-full border border-border/50 px-6 py-3 shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-300">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  <p className="text-sm font-medium text-foreground">Recording...</p>
                </div>
                <div className="flex-1 flex items-center justify-center gap-[2px] h-10 overflow-hidden">
                  {[...Array(60)].map((_, i) => (
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
                  <Button variant="ghost" size="icon" className="btn-3d h-8 w-8 rounded-full bg-secondary/30 hover:bg-destructive/20 text-white hover:text-destructive" onClick={() => setIsRecording(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                  <Button size="icon" className="btn-3d btn-glow h-8 w-8 rounded-full bg-gradient-to-br from-primary via-gray-900 to-black hover:from-gray-900 hover:to-black text-white shadow-xl" onClick={() => setIsRecording(false)}>
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
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/30 text-sm text-foreground/80">
                  <Paperclip className="w-3 h-3" />
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground ml-1 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="input-3d bg-gradient-to-br from-secondary/70 via-secondary/60 to-secondary/50 backdrop-blur-xl rounded-2xl border border-border/50 p-4 shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe the UI you want to build... (e.g. A split-hero section with athlete image left, headline, 3 stat cards, red CTA)"
                  className="flex-1 bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground text-lg min-h-[80px] font-normal"
                />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <div className="flex items-center gap-4">
                  <input ref={fileInputRef} type="file" multiple accept="image/*,.jsx,.tsx,.js,.ts" onChange={handleFileAttach} className="hidden" />
                  <Button variant="ghost" size="sm" className="btn-3d gap-2 text-muted-foreground hover:text-foreground" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="w-4 h-4" />
                    Attach
                  </Button>
                  <Button variant="ghost" size="sm" className="btn-3d gap-2 text-muted-foreground hover:text-foreground">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Button>
                  <Button variant="ghost" size="sm" className="btn-3d gap-2 text-muted-foreground hover:text-foreground">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 3H7V7H3V3Z" fill="currentColor" opacity="0.6" />
                      <path d="M9 3H13V7H9V3Z" fill="currentColor" opacity="0.6" />
                      <path d="M3 9H7V13H3V9Z" fill="currentColor" opacity="0.6" />
                      <path d="M9 9H13V13H9V9Z" fill="currentColor" opacity="0.6" />
                    </svg>
                    Options
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="btn-3d h-9 w-9 text-white hover:text-foreground" onClick={() => setIsRecording(true)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" /><path d="M4 7a1 1 0 0 0-2 0 6 6 0 0 0 5 5.917V15a1 1 0 0 0 2 0v-2.083A6 6 0 0 0 14 7a1 1 0 0 0-2 0 4 4 0 0 1-8 0Z" /></svg>
                  </Button>
                  <Button
                    size="icon"
                    disabled={isSubmitting || (!prompt.trim() && attachedFiles.length === 0)}
                    className="btn-3d btn-glow h-9 w-9 rounded-full bg-gradient-to-br from-primary via-gray-900 to-black hover:from-gray-900 hover:to-black text-white shadow-xl disabled:opacity-40"
                    onClick={handleSubmit}
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUp className="w-5 h-5" />}
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
