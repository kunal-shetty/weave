'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Monitor, Smartphone, Download, Copy, Check, RefreshCw, Eye,
} from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';
import { cn } from '@/lib/utils';

type Device = 'desktop' | 'tablet' | 'mobile';

export function PanelPreview({ previewHtml }: { previewHtml: string | null }) {
  const [device, setDevice] = useState<Device>('desktop');
  const [linkCopied, setLinkCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [refreshSpin, setRefreshSpin] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const deviceStyles = useMemo(() => {
    switch (device) {
      case 'mobile': return { width: 375, label: 'Mobile · 375', icon: Smartphone };
      case 'tablet': return { width: 768, label: 'Tablet · 768', icon: Smartphone };
      default: return { width: null, label: 'Desktop · Fluid', icon: Monitor };
    }
  }, [device]);

  useEffect(() => {
    if (!iframeRef.current || !previewHtml) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0a;color:white;font-family:system-ui,-apple-system,sans-serif;padding:2rem}</style></head><body>${previewHtml}</body></html>`);
    doc.close();
  }, [previewHtml, iframeKey]);

  const copyJsx = () => {
    if (previewHtml) navigator.clipboard.writeText(previewHtml);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const downloadHtml = () => {
    if (!previewHtml) return;
    const full = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>CodeX Generated Section</title><script src="https://cdn.tailwindcss.com"><\/script></head><body class="bg-gray-950">${previewHtml}</body></html>`;
    const blob = new Blob([full], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codex-section.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    setRefreshSpin(true);
    setIframeKey((k) => k + 1);
    setTimeout(() => setRefreshSpin(false), 600);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 grid place-items-center">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground font-[var(--font-heading)] leading-tight">Live Preview</h3>
              <p className="text-[10px] text-muted-foreground font-mono truncate">{deviceStyles.label}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="relative flex items-center p-0.5 rounded-lg bg-secondary/50 border border-border/30">
              <div className="absolute top-0.5 bottom-0.5 w-[28px] rounded-md bg-gradient-to-b from-secondary to-secondary/50 border border-border/50 shadow-inner transition-all duration-300 ease-out"
                style={{ left: `calc(2px + ${(['desktop', 'tablet', 'mobile'] as Device[]).indexOf(device) * 28}px)` }} />
              {(['desktop', 'tablet', 'mobile'] as Device[]).map((d) => (
                <button key={d} onClick={() => setDevice(d)}
                  className={cn('relative z-10 w-7 h-7 grid place-items-center rounded-md transition-colors cursor-pointer', device === d ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/60')}>
                  {d === 'desktop' && <Monitor className="w-3.5 h-3.5" />}
                  {d === 'mobile' && <Smartphone className="w-3.5 h-3.5" />}
                  {d === 'tablet' && <Smartphone className="w-4 h-4 -rotate-90" />}
                </button>
              ))}
            </div>
            <button onClick={handleRefresh} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer" aria-label="Refresh">
              <RefreshCw className={cn('w-3.5 h-3.5', refreshSpin && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      {/* Preview Frame */}
      <div className="flex-1 overflow-hidden p-4 relative">
        {previewHtml ? (
          <div className="relative h-full flex justify-center">
            <div className={cn(
              'relative h-full rounded-2xl overflow-hidden border border-border/50 bg-gradient-to-br from-gray-950 via-black to-gray-950 transition-all duration-500 ease-out shadow-2xl',
              device === 'desktop' && 'w-full',
              device === 'tablet' && 'w-[768px] max-w-full',
              device === 'mobile' && 'w-[375px]'
            )}>
              <div className="absolute top-0 inset-x-0 h-7 z-10 flex items-center gap-1.5 px-3 bg-gradient-to-b from-white/[0.04] to-transparent border-b border-white/[0.05]">
                <span className="w-2 h-2 rounded-full bg-red-400/60" />
                <span className="w-2 h-2 rounded-full bg-amber-400/60" />
                <span className="w-2 h-2 rounded-full bg-emerald-400/60" />
              </div>
              <iframe ref={iframeRef} key={iframeKey} className="w-full h-full bg-black" style={{ border: 'none' }} title="Preview" />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-secondary/50 border border-border/30 flex items-center justify-center mx-auto">
                <Eye className="w-7 h-7 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground/70">No preview yet</p>
                <p className="text-xs text-muted-foreground mt-1">Generate a section to see it here</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {previewHtml && (
        <CollapsibleSection title="Actions" subtitle="Export & share" icon={<Download className="w-3.5 h-3.5" />} defaultOpen={true} variant="inset">
          <div className="space-y-1.5">
            <button onClick={copyJsx} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-foreground/70 hover:text-foreground hover:bg-secondary/50 transition-all cursor-pointer">
              {linkCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {linkCopied ? 'Copied!' : 'Copy JSX'}
            </button>
            <button onClick={downloadHtml} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-foreground/70 hover:text-foreground hover:bg-secondary/50 transition-all cursor-pointer">
              <Download className="w-3.5 h-3.5" /> Download HTML
            </button>
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}
