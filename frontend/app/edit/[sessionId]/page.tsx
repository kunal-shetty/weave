'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Save, Eye, Code2, Type, Palette, Layout,
  CheckCircle2, Loader2, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { ShaderBackground } from '@/components/shared/ShaderBackground';
import { cn } from '@/lib/utils';

type EditMode = 'visual' | 'code';

interface EditableField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'color' | 'number';
  value: string;
  originalValue: string;
}

interface SessionData {
  sessionId: string;
  prompt: string;
  files: { name: string; type: string; size: number; base64?: string }[];
  createdAt: string;
}

export default function EditPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = (params?.sessionId as string) || '';

  const [session, setSession] = useState<SessionData | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<EditMode>('visual');
  const [fields, setFields] = useState<EditableField[]>([]);
  const [codeValue, setCodeValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    const stored = sessionStorage.getItem(`codex-session-${sessionId}`);
    if (stored) setSession(JSON.parse(stored));

    const loadContent = async () => {
      // 1. Try MongoDB first
      try {
        const res = await fetch(`${API}/api/sessions/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.htmlContent) {
            setHtml(data.htmlContent);
            setCodeValue(data.htmlContent);
            extractEditableFields(data.htmlContent);
            return;
          }
        }
      } catch { /* fall through */ }

      // 2. Fallback to sessionStorage
      const previewData = sessionStorage.getItem(`codex-preview-${sessionId}`);
      if (previewData) {
        setHtml(previewData);
        setCodeValue(previewData);
        extractEditableFields(previewData);
        return;
      }

      // 3. Placeholder
      const placeholder = `<div style="font-family:system-ui;padding:2rem;max-width:1200px;margin:0 auto;color:white;background:#0a0a0a;min-height:100vh">
  <h1 style="font-size:2rem;color:white;text-align:center;padding-top:4rem">No content generated yet</h1>
  <p style="color:rgba(255,255,255,0.5);text-align:center;margin-top:1rem">Go back to the workspace and generate a section first.</p>
</div>`;
      setHtml(placeholder);
      setCodeValue(placeholder);
      extractEditableFields(placeholder);
    };

    loadContent();
  }, [sessionId, API]);

  useEffect(() => {
    if (!iframeRef.current || !html) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0a;color:white;font-family:system-ui,-apple-system,sans-serif;padding:0}</style></head><body>${html}</body></html>`);
    doc.close();
  }, [html]);

  const extractEditableFields = (htmlContent: string) => {
    const fieldRegex = /id="(field-[^"]+)"[^>]*>([^<]*)</g;
    const extracted: EditableField[] = [];
    let match;

    while ((match = fieldRegex.exec(htmlContent)) !== null) {
      const [, id, value] = match;
      if (value.trim()) {
        const label = id.replace('field-', '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const type = value.match(/^\d+[+]?$/) ? 'text' : 'text';
        extracted.push({ id, label, type, value: value.trim(), originalValue: value.trim() });
      }
    }

    setFields(extracted);
  };

  const updateField = (fieldId: string, newValue: string) => {
    setFields((prev) => prev.map((f) => f.id === fieldId ? { ...f, value: newValue } : f));
    // Update the HTML
    if (html) {
      const regex = new RegExp(`(id="${fieldId}"[^>]*>)([^<]*)`, 'g');
      const updatedHtml = html.replace(regex, `$1${newValue}`);
      setHtml(updatedHtml);
      setCodeValue(updatedHtml);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to MongoDB
      await fetch(`${API}/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlContent: codeValue, status: 'edited' }),
      });
      // Also keep sessionStorage in sync
      sessionStorage.setItem(`codex-preview-${sessionId}`, codeValue);
    } catch {
      // At minimum save locally
      sessionStorage.setItem(`codex-preview-${sessionId}`, codeValue);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCodeChange = (value: string) => {
    setCodeValue(value);
    setHtml(value);
    extractEditableFields(value);
  };

  if (!html) {
    return (
      <div className="relative min-h-screen overflow-hidden flex items-center justify-center bg-black">
        <div className="text-white/30 text-sm animate-pulse">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden flex flex-col bg-black">
      <ShaderBackground />

      {/* Header */}
      <header className="relative z-20 h-14 flex items-center justify-between px-3 shrink-0 border-b border-border/30 backdrop-blur-2xl bg-gradient-to-b from-background/60 via-background/40 to-background/20">
        <div className="flex items-center gap-2 min-w-0">
          <Link href={`/workspace/${sessionId}`} className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="h-5 w-px bg-border/50" />
          <h1 className="text-xs font-medium text-foreground font-[var(--font-heading)]">CMS Editor</h1>
          <span className="text-[10px] text-muted-foreground font-mono">· {sessionId}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 rounded-lg bg-secondary/50 border border-border/30">
            {(['visual', 'code'] as EditMode[]).map((mode) => (
              <button key={mode} onClick={() => setEditMode(mode)}
                className={cn('px-3 py-1.5 rounded-md text-[10px] font-medium transition-all cursor-pointer',
                  editMode === mode ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {mode === 'visual' ? <Type className="w-3 h-3 inline mr-1" /> : <Code2 className="w-3 h-3 inline mr-1" />}
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving}
            className="h-8 text-xs btn-3d gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <CheckCircle2 className="w-3 h-3" /> : <Save className="w-3 h-3" />}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* Left: Fields panel */}
        <div className="w-80 shrink-0 border-r border-border/30 overflow-y-auto p-4 space-y-4 bg-background/30 backdrop-blur-sm">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground font-[var(--font-heading)]">Editable Fields</h2>
            <p className="text-[10px] text-muted-foreground">{fields.length} fields detected</p>
          </div>

          {fields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{field.label}</label>
              <Input
                value={field.value}
                onChange={(e) => updateField(field.id, e.target.value)}
                className="h-8 text-xs bg-input border-border text-foreground"
              />
              {field.value !== field.originalValue && (
                <p className="text-[9px] text-amber-400">Modified from: "{field.originalValue}"</p>
              )}
            </div>
          ))}

          {fields.length === 0 && (
            <div className="text-center py-8">
              <p className="text-xs text-muted-foreground">No editable fields detected in the HTML.</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Add id="field-*" attributes to make elements editable.</p>
            </div>
          )}

          <Button variant="outline" size="sm" className="w-full h-8 text-[10px] gap-1.5" onClick={() => extractEditableFields(codeValue)}>
            <RefreshCw className="w-3 h-3" /> Re-scan fields
          </Button>
        </div>

        {/* Right: Preview */}
        <div className="flex-1 overflow-hidden p-4">
          {editMode === 'visual' ? (
            <div className="h-full rounded-2xl overflow-hidden border border-border/50 bg-black">
              <iframe ref={iframeRef} className="w-full h-full" style={{ border: 'none' }} title="Preview" />
            </div>
          ) : (
            <div className="h-full rounded-2xl overflow-hidden border border-border/50 bg-background/30 backdrop-blur-sm">
              <textarea
                value={codeValue}
                onChange={(e) => handleCodeChange(e.target.value)}
                className="w-full h-full bg-transparent border-none outline-none resize-none text-foreground/80 text-xs font-mono p-4 leading-relaxed"
                spellCheck={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
