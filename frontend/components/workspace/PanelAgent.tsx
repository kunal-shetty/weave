'use client';

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
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

export interface PanelAgentHandle {
  appendRemoteMessage: (msg: { role: 'user' | 'agent'; content: string; type?: ChatMessage['type']; fromUser?: string }) => void;
}

export const PanelAgent = forwardRef<PanelAgentHandle, {
  sessionId: string;
  initialPrompt: string;
  initialFiles?: FileData[];
  initialSavedHtml?: string | null;
  onPreviewReady: (html: string) => void;
  onProgressiveHtml?: (html: string) => void;
  broadcastChat?: (msg: { role: 'user' | 'agent'; content: string; type?: ChatMessage['type']; user?: { id: string; email: string; fullName?: string | null; avatarUrl?: string | null } }) => void;
  remoteGenerating?: boolean;
  remoteGeneratingUser?: { fullName?: string | null; email: string } | null;
  currentUser?: { id: string; email: string; fullName?: string | null; avatarUrl?: string | null } | null;
}>(function PanelAgent({
  sessionId,
  initialPrompt,
  initialFiles,
  initialSavedHtml,
  onPreviewReady,
  onProgressiveHtml,
  broadcastChat,
  remoteGenerating,
  remoteGeneratingUser,
  currentUser,
}, ref) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentHtml, setCurrentHtml] = useState<string | null>(initialSavedHtml || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialTriggeredRef = useRef(false);
  const broadcastChatRef = useRef(broadcastChat);
  broadcastChatRef.current = broadcastChat;

  // Real conversation turns to send to Gemini: alternating user prompt + model
  // HTML response. Kept separate from the noisy status messages in `messages`.
  const conversationTurnsRef = useRef<Array<{ role: 'user' | 'model'; content: string }>>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = useCallback((role: 'agent', content: string, type?: ChatMessage['type']) => {
    setMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}-${Math.random()}`, role, content, timestamp: new Date(), type },
    ]);
    // Mirror to other workspace collaborators
    broadcastChatRef.current?.({ role, content, type, user: currentUser ?? undefined });
  }, []);

  // Public API for the parent to push a remote-originated message into the local list
  const appendRemoteMessage = useCallback((msg: { role: 'user' | 'agent'; content: string; type?: ChatMessage['type']; fromUser?: string }) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `remote-${Date.now()}-${Math.random()}`,
        role: msg.role,
        content: msg.fromUser && msg.role === 'user' ? `${msg.content}\n\n— ${msg.fromUser}` : msg.content,
        timestamp: new Date(),
        type: msg.type ?? 'status',
      },
    ]);
  }, []);

  useImperativeHandle(ref, () => ({ appendRemoteMessage }), [appendRemoteMessage]);

  const analyzeOutput = useCallback((html: string) => {
    const lines = html.split('\n').filter((l) => l.trim());
    const tags = html.match(/<[a-zA-Z][a-zA-Z0-9]*[\s>]/g) || [];
    const styles = (html.match(/style\s*=/g) || []).length;
    const kb = (new TextEncoder().encode(html).length / 1024).toFixed(1);
    return { lines: lines.length, tags: tags.length, styles, kb };
  }, []);

  const generate = useCallback(
    async (
      prompt: string,
      images: string[] = [],
      isFollowUp: boolean = false
    ) => {
      setIsStreaming(true);

      addMessage('agent', isFollowUp ? 'Analysing your follow-up…' : 'Analysing your prompt…');
      await sleep(1000 + Math.random() * 600);
      addMessage('agent', 'Prompt understood. Preparing generation context…');
      await sleep(600 + Math.random() * 400);

      if (images.length > 0) {
        addMessage('agent', `Processing ${images.length} attached asset(s)…`);
        await sleep(800 + Math.random() * 400);
      }

      if (isFollowUp) {
        addMessage('agent', 'Loading previous conversation context…');
        await sleep(400 + Math.random() * 300);
      }

      addMessage('agent', 'Connecting to Gemini…');
      await sleep(800 + Math.random() * 500);
      addMessage('agent', isFollowUp ? 'Updating HTML based on context…' : 'Generating HTML & CSS now…');

      // Use the real conversation-turn ref (alternating user prompt + model HTML)
      // so Gemini sees the prior exchange correctly. The ref is updated by the
      // caller (sendMessage / initial useEffect) BEFORE this function runs, so
      // the latest prompt is already in there.
      const conversationHistory = conversationTurnsRef.current
        .filter((t) => t.content && t.content.trim().length > 0)
        .map((t) => ({ role: t.role === 'user' ? 'user' : 'agent', content: t.content }));

      let accumulated = '';

      try {
        const res = await fetch(`${API}/api/gemini/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            images,
            model: 'gemini-3.6-flash',
            history: isFollowUp ? conversationHistory : [],
            currentHtml: isFollowUp ? currentHtml : null,
          }),
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

        let html = accumulated;
        const codeBlockMatch = html.match(/```(?:html)?\s*\n?([\s\S]*?)```/);
        if (codeBlockMatch) html = codeBlockMatch[1].trim();
        html = html.replace(/^(here\s+is|below\s+is|this\s+is).*?\n/i, '');
        if (!html.includes('<')) {
          html = `<div style="font-family:system-ui;padding:2rem;max-width:1200px;margin:0 auto;color:white;background:#0a0a0a;min-height:100vh"><pre style="white-space:pre-wrap">${html}</pre></div>`;
        }

        await sleep(500);
        addMessage('agent', 'Cleaning up output…');
        await sleep(400);

        const stats = analyzeOutput(html);
        addMessage('agent', `Done — ${stats.lines} lines · ${stats.tags} elements · ${stats.styles} styles · ${stats.kb}KB`);

        addMessage('agent', 'Rendering preview…');
        await sleep(300);

        await progressiveReveal(html, (partial) => {
          if (onProgressiveHtml) onProgressiveHtml(partial);
        });

        onPreviewReady(html);
        setCurrentHtml(html);

        // Record the model's actual HTML response in the conversation history
        // so follow-up prompts have proper alternation (user → model → user).
        conversationTurnsRef.current = [
          ...conversationTurnsRef.current,
          { role: 'model', content: html },
        ];

        await sleep(200);
        addMessage(
          'agent',
          isFollowUp
            ? 'Preview updated with your changes. Need any more adjustments?'
            : 'Section is live in the preview. What would you like to adjust?'
        );
      } catch (err) {
        const fallbackHtml = buildFallbackHtml(prompt);
        onPreviewReady(fallbackHtml);
        setCurrentHtml(fallbackHtml);
        // Still record the fallback HTML so the next follow-up has context.
        conversationTurnsRef.current = [
          ...conversationTurnsRef.current,
          { role: 'model', content: fallbackHtml },
        ];
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

  useEffect(() => {
    if (!initialPrompt) return;
    if (initialTriggeredRef.current) return;
    initialTriggeredRef.current = true;

    setMessages([{ id: 'user-1', role: 'user', content: initialPrompt, timestamp: new Date() }]);

    // If the parent already loaded saved HTML, surface it without regenerating
    if (initialSavedHtml && initialSavedHtml.trim()) {
      // Seed the conversation with the prior exchange so a follow-up prompt
      // has a proper (user → model) history to send to Gemini.
      conversationTurnsRef.current = [
        { role: 'user', content: initialPrompt },
        { role: 'model', content: initialSavedHtml },
      ];
      addMessage('agent', 'Loaded existing section from database. Preview is ready.', 'status');
      onPreviewReady(initialSavedHtml);
      if (onProgressiveHtml) onProgressiveHtml(initialSavedHtml);
      return;
    }

    // Fresh session — record the initial prompt so the next follow-up sees it.
    conversationTurnsRef.current = [{ role: 'user', content: initialPrompt }];

    const images = (initialFiles || [])
      .filter((f) => f.type.startsWith('image/') && f.base64)
      .map((f) => f.base64!);

    generate(initialPrompt, images, false);
  }, [initialPrompt, initialFiles, initialSavedHtml, generate, addMessage, onPreviewReady, onProgressiveHtml]);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMsg = input.trim();

    // Append the new user turn to the real conversation history BEFORE calling
    // generate, so the history the backend sees includes this prompt.
    conversationTurnsRef.current = [
      ...conversationTurnsRef.current,
      { role: 'user', content: userMsg },
    ];

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', content: userMsg, timestamp: new Date() },
    ]);
    // Mirror the user prompt to other collaborators
    broadcastChatRef.current?.({ role: 'user', content: userMsg, type: undefined, user: currentUser ?? undefined });
    setInput('');

    await generate(userMsg, [], true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages — hidden scrollbar */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scrollbar-none">
        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'relative max-w-[90%] rounded-xl px-3 py-2 text-[13px] leading-relaxed',
              msg.role === 'user'
                ? 'bg-secondary/70 text-foreground border border-border/40'
                : msg.type === 'error'
                ? 'bg-red-500/8 text-red-300/90 border border-red-500/15'
                : msg.type === 'status'
                ? 'bg-secondary/20 text-muted-foreground border border-border/20'
                : 'bg-secondary/30 text-foreground/70 border border-border/20'
            )}>
              {msg.role === 'agent' && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Bot className="w-3 h-3 text-foreground/50" />
                  <span className="text-[9px] text-muted-foreground/60 font-mono">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              <div className="whitespace-pre-wrap wrap-break-word">{msg.content}</div>
              {msg.role === 'user' && (
                <div className="mt-1 text-[9px] text-muted-foreground/50 text-right font-mono">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        ))}

        {isStreaming && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-secondary/30 border border-border/20 rounded-xl px-3 py-2">
              <div className="flex items-center gap-1.5">
                <Bot className="w-3 h-3 text-foreground/40" />
                <div className="flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2.5 border-t border-border/30">
        <div className="relative group/input">
          <div className="absolute -inset-px rounded-xl pointer-events-none transition-opacity duration-300 opacity-0 bg-linear-to-br from-primary/20 via-transparent to-primary/10 blur-sm group-focus-within/input:opacity-100" />
          <div className="relative flex items-center gap-1.5 p-1 rounded-xl bg-secondary/50 border border-border/50 input-3d">
            <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer">
              <Paperclip className="w-3.5 h-3.5" />
            </button>
            <Input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Reply to agent…"
              disabled={isStreaming}
              className="flex-1 h-8 bg-transparent border-0 text-foreground text-[13px] placeholder:text-muted-foreground/50 focus-visible:ring-0 px-1" />
            <Button size="icon" onClick={sendMessage} disabled={!input.trim() || isStreaming}
              className={cn('h-8 w-8 rounded-lg btn-3d btn-glow transition-all duration-300',
                input.trim() && !isStreaming
                  ? 'bg-linear-to-br from-primary to-primary/80 text-primary-foreground border border-primary shadow-[0_0_24px_-4px_rgba(255,255,255,0.15)]'
                  : 'bg-secondary/50 text-muted-foreground border border-border/50 hover:bg-secondary')}>
              {isStreaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

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
