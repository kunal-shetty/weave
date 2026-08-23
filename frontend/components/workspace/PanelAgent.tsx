'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Send, Loader2, Paperclip, Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  type?: 'status' | 'error' | 'thinking';
}

interface FileData {
  name: string;
  type: string;
  size: number;
  base64?: string;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Progressively reveal HTML to the preview panel in chunks.
 */
async function progressiveReveal(
  fullHtml: string,
  onChunk: (partialHtml: string) => void,
) {
  const lines = fullHtml.split('\n');
  const total = lines.length;
  const chunkSize = 4;

  for (let i = 0; i < total; i += chunkSize) {
    onChunk(lines.slice(0, Math.min(i + chunkSize, total)).join('\n'));
    await sleep(60 + Math.random() * 40);
  }

  onChunk(fullHtml);
}

export function PanelAgent({
  sessionId,
  initialPrompt,
  initialFiles,
  onPreviewReady,
  onProgressiveHtml,
  skipInitialGeneration = false,
}: {
  sessionId: string;
  initialPrompt: string;
  initialFiles?: FileData[];
  onPreviewReady: (html: string) => void;
  onProgressiveHtml?: (html: string) => void;
  skipInitialGeneration?: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = useCallback((role: 'agent', content: string, type?: ChatMessage['type']) => {
    setMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}-${Math.random()}`, role, content, timestamp: new Date(), type },
    ]);
  }, []);

  const analyzeOutput = useCallback((html: string) => {
    const lines = html.split('\n').filter((l) => l.trim());
    const tags = html.match(/<[a-zA-Z][a-zA-Z0-9]*[\s>]/g) || [];
    const styles = (html.match(/style\s*=/g) || []).length;
    const kb = (new TextEncoder().encode(html).length / 1024).toFixed(1);
    return { lines: lines.length, tags: tags.length, styles, kb };
  }, []);

  const generate = useCallback(
    async (prompt: string, images: string[] = [], isFollowUp: boolean = false) => {
      setIsStreaming(true);

      // Step 1: Analyze
      addMessage('agent', 'Analysing your prompt…');
      await sleep(1000 + Math.random() * 600);
      addMessage('agent', 'Prompt understood. Preparing generation context…');
      await sleep(600 + Math.random() * 400);

      if (images.length > 0) {
        addMessage('agent', `Processing ${images.length} attached asset(s)…`);
        await sleep(800 + Math.random() * 400);
      }

      // Step 2: Connect
      addMessage('agent', 'Connecting to Gemini…');
      await sleep(800 + Math.random() * 500);

      addMessage('agent', 'Generating HTML & CSS now…');

      let accumulated = '';

      try {
        const res = await fetch(`${API}/api/gemini/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, images, model: 'gemini-3.6-flash' }),
        });

        if (!res.ok) throw new Error(`Backend returned ${res.status}`);

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.error) throw new Error(parsed.error);
                if (parsed.text) accumulated += parsed.text;
              } catch {}
            }
          }
        }

        // Clean up
        let html = accumulated;
        const codeBlockMatch = html.match(/```(?:html)?\s*\n?([\s\S]*?)```/);
        if (codeBlockMatch) html = codeBlockMatch[1].trim();
        html = html.replace(/^(here\s+is|below\s+is|this\s+is).*?\n/i, '');
        if (!html.includes('<')) {
          html = `<div style="font-family:system-ui;padding:2rem;max-width:1200px;margin:0 auto;color:white;background:#0a0a0a;min-height:100vh"><pre style="white-space:pre-wrap">${html}</pre></div>`;
        }

        // Step 3: Sanitize
        await sleep(500);
        addMessage('agent', 'Cleaning up output…');
        await sleep(400);

        // Step 4: Stats
        const stats = analyzeOutput(html);
        addMessage('agent', `Done — ${stats.lines} lines · ${stats.tags} elements · ${stats.styles} styles · ${stats.kb}KB`);

        // Step 5: Progressive reveal
        addMessage('agent', 'Rendering preview…');
        await sleep(300);

        await progressiveReveal(html, (partial) => {
          if (onProgressiveHtml) onProgressiveHtml(partial);
        });

        // Final
        onPreviewReady(html);

        await sleep(200);
        addMessage(
          'agent',
          isFollowUp
            ? 'Preview updated. Need any changes?'
            : 'Section is live in the preview. What would you like to adjust?'
        );
      } catch (err) {
        const fallbackHtml = buildFallbackHtml(prompt);
        onPreviewReady(fallbackHtml);
        addMessage(
          'agent',
          `Gemini error (${err instanceof Error ? err.message : 'unknown'}). Showing placeholder. Check GOOGLE_AI_API_KEY in backend .env.`,
          'error'
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [API, onPreviewReady, onProgressiveHtml, analyzeOutput, addMessage]
  );

  // On mount: generate for initial prompt
  useEffect(() => {
    if (!initialPrompt) return;

    setMessages([{ id: 'user-1', role: 'user', content: initialPrompt, timestamp: new Date() }]);

    if (skipInitialGeneration) {
      addMessage('agent', 'Loaded existing section from database. Preview is ready.', 'status');
      return;
    }

    const images = (initialFiles || [])
      .filter((f) => f.type.startsWith('image/') && f.base64)
      .map((f) => f.base64!);

    generate(initialPrompt, images, false);
  }, [initialPrompt, initialFiles, generate, skipInitialGeneration]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', content: input.trim(), timestamp: new Date() },
    ]);
    const msg = input.trim();
    setInput('');

    await generate(msg, [], true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
              msg.role === 'user'
                ? 'bg-gradient-to-br from-secondary/80 to-secondary/50 text-foreground border border-border/50'
                : msg.type === 'error'
                ? 'bg-gradient-to-br from-red-500/[0.08] to-red-500/[0.02] text-red-300/90 border border-red-500/[0.15]'
                : msg.type === 'status'
                ? 'bg-secondary/30 text-muted-foreground border border-border/30'
                : 'bg-gradient-to-br from-secondary/50 to-secondary/20 text-foreground/75 border border-border/30'
            )}>
              {msg.role === 'agent' && (
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="relative w-5 h-5 rounded-md bg-gradient-to-br from-primary/30 to-primary/10 border border-border flex items-center justify-center">
                    <Bot className="w-3 h-3 text-foreground/80" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-background" />
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">CodeX Agent</span>
                  <span className="text-[10px] text-muted-foreground/50">·</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              {msg.role === 'user' && (
                <div className="mt-1.5 text-[10px] text-muted-foreground text-right font-mono">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator when waiting for Gemini response (after last agent message) */}
        {isStreaming && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-secondary/50 border border-border/30 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="relative w-5 h-5 rounded-md bg-primary/20 border border-border flex items-center justify-center">
                  <Bot className="w-3 h-3 text-foreground/80" />
                </div>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/30 bg-gradient-to-b from-transparent to-background/50">
        <div className="relative group/input">
          <div className="absolute -inset-px rounded-xl pointer-events-none transition-opacity duration-300 opacity-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/10 blur-sm group-focus-within/input:opacity-100" />
          <div className="relative flex items-center gap-2 p-1.5 rounded-xl bg-secondary/50 border border-border/50 backdrop-blur-md input-3d">
            <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer">
              <Paperclip className="w-4 h-4" />
            </button>
            <Input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Reply to agent…"
              disabled={isStreaming}
              className="flex-1 h-9 bg-transparent border-0 text-foreground text-sm placeholder:text-muted-foreground focus-visible:ring-0 px-2" />
            <Button size="icon" onClick={sendMessage} disabled={!input.trim() || isStreaming}
              className={cn('h-9 w-9 rounded-lg btn-3d btn-glow transition-all duration-300',
                input.trim() && !isStreaming
                  ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border border-primary shadow-[0_0_24px_-4px_rgba(255,255,255,0.15)]'
                  : 'bg-secondary/50 text-muted-foreground border border-border/50 hover:bg-secondary')}>
              {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildFallbackHtml(prompt: string): string {
  return `<div style="font-family:system-ui;padding:2rem;max-width:1200px;margin:0 auto;color:white;background:#0a0a0a">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:center">
      <div style="width:100%;aspect-ratio:4/3;background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:1rem;display:flex;align-items:center;justify-content:center">
        <span style="color:#666;font-size:0.875rem">Generated preview</span>
      </div>
      <div>
        <span style="display:inline-block;padding:0.4rem 1rem;background:rgba(255,0,0,0.1);color:#ef4444;border-radius:999px;font-size:0.75rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase">CODEX</span>
        <h1 style="font-size:3rem;font-weight:700;color:white;margin:1rem 0">${prompt.slice(0, 60)}</h1>
        <p style="color:rgba(255,255,255,0.6);font-size:1.125rem;margin-bottom:1.5rem">AI-generated UI section from your prompt.</p>
        <button style="padding:1rem 2rem;background:white;color:black;border:none;border-radius:0.75rem;font-weight:700;font-size:0.875rem;cursor:pointer">Get Started</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:3rem">
      <div style="text-align:center;padding:1.5rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:1rem"><div style="font-size:1.875rem;font-weight:700;color:white">1000+</div><div style="color:rgba(255,255,255,0.4);margin-top:0.25rem">Community Members</div></div>
      <div style="text-align:center;padding:1.5rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:1rem"><div style="font-size:1.875rem;font-weight:700;color:white">40+</div><div style="color:rgba(255,255,255,0.4);margin-top:0.25rem">Programmes</div></div>
      <div style="text-align:center;padding:1.5rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:1rem"><div style="font-size:1.875rem;font-weight:700;color:white">150+</div><div style="color:rgba(255,255,255,0.4);margin-top:0.25rem">Channels</div></div>
    </div>
  </div>`;
}
