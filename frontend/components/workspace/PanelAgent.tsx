'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Send, Loader2, CheckCircle2, Circle, Sparkles, Paperclip,
  AlertCircle, ListChecks, Wand2, ChevronRight, Bot,
} from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';
import { cn } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  type?: 'question' | 'status' | 'error' | 'normal';
}

interface Task {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
}

function getAgentSteps(prompt: string): Task[] {
  const lower = prompt.toLowerCase();
  const tasks: Task[] = [
    { id: '1', label: 'Analysing input', status: 'done' },
    { id: '2', label: 'Determining section type', status: 'done' },
  ];

  if (lower.includes('hero') || lower.includes('split')) {
    tasks.push({ id: '3', label: 'Generating split-hero layout', status: 'running' });
    tasks.push({ id: '4', label: 'Creating stat cards', status: 'pending' });
    tasks.push({ id: '5', label: 'Generating CTA button', status: 'pending' });
  } else if (lower.includes('feature') || lower.includes('grid')) {
    tasks.push({ id: '3', label: 'Generating feature grid', status: 'running' });
    tasks.push({ id: '4', label: 'Adding icons', status: 'pending' });
  } else {
    tasks.push({ id: '3', label: 'Generating section layout', status: 'running' });
    tasks.push({ id: '4', label: 'Assigning fieldIds', status: 'pending' });
  }

  tasks.push({ id: String(tasks.length + 1), label: 'Persisting to database', status: 'pending' });
  tasks.push({ id: String(tasks.length + 2), label: 'Building preview', status: 'pending' });

  return tasks;
}

function getClarifyingQuestions(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  const questions: string[] = [];

  if (!lower.includes('color') && !lower.includes('colour') && !lower.includes('accent')) {
    questions.push('What accent colour would you like? (e.g., red, blue, green)');
  }
  if (!lower.includes('stat') && !lower.includes('card') && !lower.includes('number')) {
    questions.push('Should I include any stat cards or numerical highlights?');
  }
  if (!lower.includes('cta') && !lower.includes('button')) {
    questions.push('What should the call-to-action button say?');
  }

  return questions.slice(0, 2);
}

export function PanelAgent({
  sessionId,
  initialPrompt,
  onPreviewReady,
}: {
  sessionId: string;
  initialPrompt: string;
  onPreviewReady: (html: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [generationResult, setGenerationResult] = useState<{ jsx: string; sectionId: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, tasks]);

  // Simulate agent working on mount, then call real backend
  useEffect(() => {
    if (!initialPrompt) return;

    const steps = getAgentSteps(initialPrompt);
    setTasks(steps);

    const userMsg: ChatMessage = {
      id: 'user-1',
      role: 'user',
      content: initialPrompt,
      timestamp: new Date(),
    };
    setMessages([userMsg]);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: 'agent-1',
          role: 'agent',
          content: "I'll help you build that. Let me analyse your request and generate the section.",
          timestamp: new Date(),
          type: 'status',
        },
      ]);
    }, 800);

    let taskIdx = 0;
    const taskInterval = setInterval(() => {
      taskIdx++;
      if (taskIdx >= steps.length) {
        clearInterval(taskInterval);

        const questions = getClarifyingQuestions(initialPrompt);
        if (questions.length > 0) {
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              {
                id: `agent-q-${Date.now()}`,
                role: 'agent',
                content: `Before I finalize, a couple of quick questions:\n\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`,
                timestamp: new Date(),
                type: 'question',
              },
            ]);
          }, 600);
        }

        // Call the real backend to generate
        const formData = new FormData();
        formData.append('prompt', initialPrompt);
        formData.append('pageName', 'Home');
        formData.append('sectionName', 'Hero');

        fetch(`${API}/api/generate`, { method: 'POST', body: formData })
          .then((res) => res.json())
          .then((data) => {
            if (data.generatedJsx || data.jsx) {
              const jsx = data.generatedJsx || data.jsx;
              setGenerationResult({ jsx, sectionId: data.sectionId });
              onPreviewReady(jsx);

              setMessages((prev) => [
                ...prev,
                {
                  id: `agent-done-${Date.now()}`,
                  role: 'agent',
                  content: `Section generated! You can see the live preview on the right. Click any element to edit it, or use the export options to download.`,
                  timestamp: new Date(),
                  type: 'status',
                },
              ]);
            } else {
              setMessages((prev) => [
                ...prev,
                {
                  id: `agent-error-${Date.now()}`,
                  role: 'agent',
                  content: `Generation completed but no JSX was returned. Check the backend logs.`,
                  timestamp: new Date(),
                  type: 'error',
                },
              ]);
            }
          })
          .catch(() => {
            // Fallback: show a placeholder preview
            onPreviewReady(
              `<div style="font-family:system-ui;padding:2rem;max-width:1200px;margin:0 auto">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:center">
                  <img src="/placeholder.jpg" alt="Hero" style="width:100%;border-radius:1rem" />
                  <div>
                    <span style="display:inline-block;padding:0.4rem 1rem;background:rgba(255,0,0,0.1);color:#ef4444;border-radius:999px;font-size:0.75rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase">PULSE FIT</span>
                    <h1 style="font-size:3rem;font-weight:700;color:white;margin:1rem 0">CHALLENGE YOUR LIMITS</h1>
                    <p style="color:rgba(255,255,255,0.6);font-size:1.125rem;margin-bottom:1.5rem">Be a part of the tribe that's limitless.</p>
                    <button style="padding:1rem 2rem;background:white;color:black;border:none;border-radius:0.75rem;font-weight:700;font-size:0.875rem;cursor:pointer">FIND A WORKOUT</button>
                  </div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:3rem">
                  <div style="text-align:center;padding:1.5rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:1rem"><div style="font-size:1.875rem;font-weight:700;color:white">1000+</div><div style="color:rgba(255,255,255,0.4);margin-top:0.25rem">Community Members</div></div>
                  <div style="text-align:center;padding:1.5rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:1rem"><div style="font-size:1.875rem;font-weight:700;color:white">40+</div><div style="color:rgba(255,255,255,0.4);margin-top:0.25rem">Fitness Programmes</div></div>
                  <div style="text-align:center;padding:1.5rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:1rem"><div style="font-size:1.875rem;font-weight:700;color:white">150+</div><div style="color:rgba(255,255,255,0.4);margin-top:0.25rem">Fitness Channels</div></div>
                </div>
              </div>`
            );
            setMessages((prev) => [
              ...prev,
              {
                id: `agent-fallback-${Date.now()}`,
                role: 'agent',
                content: `Generated a preview (backend returned placeholder). The section is ready to preview.`,
                timestamp: new Date(),
                type: 'status',
              },
            ]);
          });

        return;
      }

      setTasks((prev) =>
        prev.map((t, i) => {
          if (i === taskIdx) return { ...t, status: 'running' as const };
          if (i < taskIdx) return { ...t, status: 'done' as const };
          return t;
        })
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `agent-status-${taskIdx}`,
          role: 'agent',
          content: `✓ ${steps[taskIdx].label}`,
          timestamp: new Date(),
          type: 'status',
        },
      ]);
    }, 1200);

    return () => clearInterval(taskInterval);
  }, [initialPrompt, onPreviewReady]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `agent-${Date.now()}`,
          role: 'agent',
          content: `Got it! I'll update the section with your feedback. The preview on the right will refresh shortly.`,
          timestamp: new Date(),
          type: 'normal',
        },
      ]);
    }, 1500);
  };

  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const runningCount = tasks.filter((t) => t.status === 'running').length;
  const progress = tasks.length > 0 ? (doneCount / tasks.length) * 100 : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Tasks — collapsible */}
      {tasks.length > 0 && (
        <CollapsibleSection
          title="Task pipeline"
          subtitle={runningCount > 0 ? `${runningCount} running · ${tasks.length - doneCount} pending` : `${doneCount} of ${tasks.length} complete`}
          icon={<ListChecks className="w-3.5 h-3.5" />}
          badge={<span className="text-[9px] text-muted-foreground font-mono tabular-nums">{Math.round(progress)}%</span>}
          variant="inset"
        >
          <div className="space-y-2.5">
            <div className="relative h-1.5 rounded-full bg-secondary overflow-hidden border border-border/30">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
              {runningCount > 0 && <div className="absolute inset-y-0 w-1/3 bg-primary rounded-full opacity-70 animate-pulse" />}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tasks.map((task) => (
                <div key={task.id} className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] border transition-all duration-300',
                  task.status === 'done' && 'bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-300/80',
                  task.status === 'running' && 'bg-white/[0.08] border-white/[0.18] text-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.08)]',
                  task.status === 'error' && 'bg-red-500/[0.08] border-red-500/20 text-red-300/80',
                  task.status === 'pending' && 'bg-secondary/30 border-border/30 text-muted-foreground'
                )}>
                  {task.status === 'done' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> :
                   task.status === 'running' ? <Loader2 className="w-3 h-3 text-foreground animate-spin" /> :
                   task.status === 'error' ? <AlertCircle className="w-3 h-3 text-red-400" /> :
                   <Circle className="w-3 h-3 text-muted-foreground/50" />}
                  <span>{task.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
              msg.role === 'user'
                ? 'bg-gradient-to-br from-secondary/80 to-secondary/50 text-foreground border border-border/50'
                : msg.type === 'question'
                ? 'bg-gradient-to-br from-amber-500/[0.08] to-amber-500/[0.02] text-amber-200/90 border border-amber-500/[0.15]'
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
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.role === 'user' && (
                <div className="mt-1.5 text-[10px] text-muted-foreground text-right font-mono">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
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
                <span className="text-[10px] text-muted-foreground ml-1">thinking</span>
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
              className="flex-1 h-9 bg-transparent border-0 text-foreground text-sm placeholder:text-muted-foreground focus-visible:ring-0 px-2" />
            <Button size="icon" onClick={sendMessage} disabled={!input.trim()}
              className={cn('h-9 w-9 rounded-lg btn-3d btn-glow transition-all duration-300',
                input.trim()
                  ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border border-primary shadow-[0_0_24px_-4px_rgba(255,255,255,0.15)]'
                  : 'bg-secondary/50 text-muted-foreground border border-border/50 hover:bg-secondary')}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { label: 'Refine copy', icon: Wand2 },
              { label: 'Add stat cards', icon: Sparkles },
              { label: 'Generate variants', icon: ChevronRight },
            ].map((action) => (
              <button key={action.label}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] bg-secondary/30 border border-border/30 text-muted-foreground hover:bg-secondary/50 hover:text-foreground hover:border-border transition-all cursor-pointer">
                <action.icon className="w-3 h-3" />{action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
