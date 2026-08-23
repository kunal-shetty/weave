'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Monitor, Smartphone, RefreshCw, Eye,
  ExternalLink, Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type Device = 'desktop' | 'tablet' | 'mobile';

export function PanelPreview({ previewHtml, sessionId }: { previewHtml: string | null; sessionId?: string }) {
  const [device, setDevice] = useState<Device>('desktop');
  const [iframeKey, setIframeKey] = useState(0);
  const [refreshSpin, setRefreshSpin] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const deviceStyles = useMemo(() => {
    switch (device) {
      case 'mobile': return { label: 'Mobile · 375' };
      case 'tablet': return { label: 'Tablet · 768' };
      default: return { label: 'Desktop' };
    }
  }, [device]);

  // Render HTML into iframe
  useEffect(() => {
    if (!iframeRef.current || !previewHtml) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0a;color:white;font-family:system-ui,-apple-system,sans-serif;padding:0;overflow:hidden}::-webkit-scrollbar{display:none}body{-ms-overflow-style:none;scrollbar-width:none}</style></head><body>${previewHtml}</body></html>`);
    doc.close();
  }, [previewHtml, iframeKey]);

  const openInNewTab = () => {
    if (!previewHtml) return;
    const full = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>CodeX Preview</title><script src="https://cdn.tailwindcss.com"><\/script></head><body class="bg-gray-950" style="padding:2rem">${previewHtml}</body></html>`;
    const blob = new Blob([full], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleRefresh = () => {
    setRefreshSpin(true);
    setIframeKey((k) => k + 1);
    setTimeout(() => setRefreshSpin(false), 600);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Compact toolbar */}
      <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/20 grid place-items-center">
            <Eye className="w-2.5 h-2.5 text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-background" />
          </div>
          <span className="text-[11px] font-medium text-foreground/70">Preview</span>
          <span className="text-[9px] text-muted-foreground/50 font-mono">{deviceStyles.label}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Device switcher */}
          <div className="relative flex items-center p-0.5 rounded-md bg-secondary/40 border border-border/20">
            {(['desktop', 'tablet', 'mobile'] as Device[]).map((d) => (
              <button key={d} onClick={() => setDevice(d)}
                className={cn(
                  'relative z-10 w-6 h-6 grid place-items-center rounded transition-all cursor-pointer',
                  device === d ? 'text-foreground bg-secondary/80' : 'text-muted-foreground/50 hover:text-foreground/60'
                )}>
                {d === 'desktop' && <Monitor className="w-3 h-3" />}
                {d === 'mobile' && <Smartphone className="w-3 h-3" />}
                {d === 'tablet' && <Smartphone className="w-3.5 h-3.5 -rotate-90" />}
              </button>
            ))}
          </div>

          <button onClick={handleRefresh}
            className="p-1 rounded-md hover:bg-secondary text-muted-foreground/50 hover:text-foreground transition-all cursor-pointer"
            aria-label="Refresh">
            <RefreshCw className={cn('w-3 h-3', refreshSpin && 'animate-spin')} />
          </button>

          <div className="w-px h-3 bg-border/30 mx-0.5" />

          {previewHtml && (
            <>
              <button onClick={openInNewTab}
                className="p-1 rounded-md hover:bg-secondary text-muted-foreground/50 hover:text-foreground transition-all cursor-pointer"
                title="Open in new tab">
                <ExternalLink className="w-3 h-3" />
              </button>
              {sessionId && (
                <Link href={`/edit/${sessionId}`}
                  className="p-1 rounded-md hover:bg-secondary text-muted-foreground/50 hover:text-foreground transition-all cursor-pointer"
                  title="Edit content">
                  <Pencil className="w-3 h-3" />
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* Preview — full remaining height, no padding, no scrollbar */}
      <div className="flex-1 overflow-hidden relative">
        {previewHtml ? (
          <div className="h-full flex justify-center bg-black/50">
            <div className={cn(
              'relative h-full overflow-hidden transition-all duration-500 ease-out',
              device === 'desktop' && 'w-full',
              device === 'tablet' && 'w-[768px] max-w-full border-x border-border/30',
              device === 'mobile' && 'w-[375px] border-x border-border/30'
            )}>
              <iframe ref={iframeRef} key={iframeKey} className="w-full h-full bg-black scrollbar-none" style={{ border: 'none' }} title="Preview" />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-secondary/40 border border-border/20 flex items-center justify-center mx-auto">
                <Eye className="w-5 h-5 text-muted-foreground/30" />
              </div>
              <p className="text-[11px] text-muted-foreground/40">No preview yet</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
