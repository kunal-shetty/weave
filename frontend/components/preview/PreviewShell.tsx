'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { fetchElementsByPage } from '@/store/slices/cmsSlice';
import { useSocket } from '@/hooks/useSocket';
import { CMSEditor } from './CMSEditor';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { buildPreviewHtml } from '@/lib/buildPreviewHtml';
import {
  Monitor, Smartphone, Edit3, Eye, RefreshCw,
  CheckCircle, XCircle, Clock, Wifi, WifiOff, ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface Section {
  sectionId: string;
  sectionName: string;
  pageName: string;
  sectionStatus: 'Pending' | 'Approved' | 'Rejected';
  generatedJsx: string;
  wireframeUrl?: string;
  accentColor: string;
  variations: number;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const STATUS_CONFIG = {
  Pending:  { label: 'Pending',  icon: Clock,         color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' },
  Approved: { label: 'Approved', icon: CheckCircle,   color: 'text-green-400 border-green-400/30 bg-green-400/10' },
  Rejected: { label: 'Rejected', icon: XCircle,       color: 'text-red-400 border-red-400/30 bg-red-400/10' },
};

interface PreviewShellProps {
  pageName: string;
}

export function PreviewShell({ pageName }: PreviewShellProps) {
  const dispatch = useDispatch<AppDispatch>();
  const lastJob = useSelector((s: RootState) => s.studio.lastJob);
  const allSections = useSelector((s: RootState) => s.cms.allSections);

  const [sections, setSections] = useState<Section[]>([]);
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [showEditor, setShowEditor] = useState(false);
  const [showWireframe, setShowWireframe] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [loading, setLoading] = useState(true);

  // Socket.IO — join active section room for live patches
  useSocket(activeSection?.sectionId ?? null);

  // Fetch sections for this page
  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/sections`)
      .then((r) => r.json())
      .then((data: Section[]) => {
        const filtered = data.filter((s) => s.pageName === pageName);
        setSections(filtered);
        if (filtered.length > 0) setActiveSection(filtered[0]);
      })
      .catch(() => toast.error('Failed to load sections'))
      .finally(() => setLoading(false));
  }, [pageName]);

  // Fetch elements into Redux
  useEffect(() => {
    dispatch(fetchElementsByPage(pageName));
  }, [pageName, dispatch]);

  const handleStatusChange = async (status: 'Approved' | 'Rejected') => {
    if (!activeSection) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`${API}/api/sections/${activeSection.sectionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionStatus: status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      const updated = await res.json();
      setActiveSection(updated);
      setSections((prev) => prev.map((s) => s.sectionId === updated.sectionId ? updated : s));
      toast.success(`Section ${status.toLowerCase()}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRegenerate = async () => {
    if (!activeSection) return;
    try {
      const res = await fetch(`${API}/api/sections/${activeSection.sectionId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `Regenerate ${activeSection.sectionName}` }),
      });
      if (!res.ok) throw new Error('Regeneration failed');
      const data = await res.json();
      setActiveSection((prev) => prev ? { ...prev, generatedJsx: data.generatedJsx, variations: prev.variations + 1 } : prev);
      dispatch(fetchElementsByPage(pageName));
      toast.success('Section regenerated');
    } catch {
      toast.error('Regeneration failed');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading preview…</p>
        </div>
      </div>
    );
  }

  const statusCfg = activeSection ? STATUS_CONFIG[activeSection.sectionStatus] : null;
  const StatusIcon = statusCfg?.icon;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border/50 backdrop-blur-sm bg-background/30 flex-wrap">
        <Link href="/generate">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>

        {/* Page / Section picker */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-muted-foreground truncate">{pageName}</span>
          <span className="text-muted-foreground">/</span>
          <select
            className="bg-secondary border border-border rounded-lg px-2 py-1 text-sm text-foreground"
            value={activeSection?.sectionId || ''}
            onChange={(e) => {
              const s = sections.find((x) => x.sectionId === e.target.value);
              if (s) setActiveSection(s);
            }}
          >
            {sections.map((s) => (
              <option key={s.sectionId} value={s.sectionId}>{s.sectionName}</option>
            ))}
            {sections.length === 0 && <option disabled>No sections yet</option>}
          </select>
        </div>

        {/* Status badge */}
        {statusCfg && StatusIcon && (
          <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${statusCfg.color}`}>
            <StatusIcon className="w-3 h-3" />
            {statusCfg.label}
          </span>
        )}

        {activeSection && (
          <span className="text-xs text-muted-foreground">v{activeSection.variations}</span>
        )}

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Viewport toggle */}
          <div className="flex items-center bg-secondary rounded-lg p-0.5 border border-border">
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 rounded-md ${viewport === 'desktop' ? 'bg-background shadow-sm' : ''}`}
              onClick={() => setViewport('desktop')}
            >
              <Monitor className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 rounded-md ${viewport === 'mobile' ? 'bg-background shadow-sm' : ''}`}
              onClick={() => setViewport('mobile')}
            >
              <Smartphone className="w-4 h-4" />
            </Button>
          </div>

          {/* Wireframe overlay toggle */}
          {activeSection?.wireframeUrl && (
            <Button
              variant="ghost"
              size="sm"
              className={`btn-3d gap-2 border h-8 ${showWireframe ? 'border-primary text-primary bg-primary/10' : 'border-border/50'}`}
              onClick={() => setShowWireframe(!showWireframe)}
            >
              <Eye className="w-3.5 h-3.5" />
              Wireframe
            </Button>
          )}

          {/* Editor toggle */}
          <Button
            variant="ghost"
            size="sm"
            className={`btn-3d gap-2 border h-8 ${showEditor ? 'border-primary text-primary bg-primary/10' : 'border-border/50'}`}
            onClick={() => setShowEditor(!showEditor)}
          >
            <Edit3 className="w-3.5 h-3.5" />
            CMS Editor
          </Button>

          {/* Regenerate */}
          <Button
            size="sm"
            className="btn-3d gap-2 bg-secondary/70 border border-border/50 text-foreground h-8"
            onClick={handleRegenerate}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Regen
          </Button>

          {/* Status actions */}
          {activeSection?.sectionStatus === 'Pending' && (
            <>
              <Button
                size="sm"
                disabled={updatingStatus}
                className="btn-3d gap-2 bg-green-600 hover:bg-green-500 text-white h-8"
                onClick={() => handleStatusChange('Approved')}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                disabled={updatingStatus}
                className="btn-3d gap-2 bg-red-700 hover:bg-red-600 text-white h-8"
                onClick={() => handleStatusChange('Rejected')}
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Canvas + Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview canvas */}
        <div className="flex-1 overflow-auto bg-[#0d0d0d] relative">
          {/* Wireframe overlay */}
          {showWireframe && activeSection?.wireframeUrl && (
            <div className="absolute inset-0 z-10 pointer-events-none">
              <img
                src={activeSection.wireframeUrl}
                alt="Wireframe overlay"
                className="w-full h-full object-contain opacity-40 mix-blend-screen"
              />
            </div>
          )}

          <div className={`transition-all duration-300 mx-auto ${viewport === 'mobile' ? 'max-w-[390px] shadow-2xl' : 'w-full'}`}>
            {sections.length === 0 ? (
              <EmptyPreview pageName={pageName} />
            ) : activeSection ? (
              <LiveSectionPreview section={activeSection} pageName={pageName} />
            ) : null}
          </div>
        </div>

        {/* CMS Editor panel */}
        {showEditor && activeSection && (
          <CMSEditor
            sectionId={activeSection.sectionId}
            pageName={pageName}
            onClose={() => setShowEditor(false)}
          />
        )}
      </div>
    </div>
  );
}

function EmptyPreview({ pageName }: { pageName: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-12">
      <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
        <Eye className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">No sections yet</h2>
      <p className="text-muted-foreground mb-6">
        Generate a section for <span className="text-foreground font-medium">"{pageName}"</span> first.
      </p>
      <Link href="/generate">
        <Button className="btn-3d btn-glow gap-2 bg-gradient-to-br from-primary via-gray-900 to-black text-white">
          Open Generator Studio
        </Button>
      </Link>
    </div>
  );
}

function LiveSectionPreview({ section, pageName }: { section: Section; pageName: string }) {
  const dispatch = useDispatch<AppDispatch>();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const allSections = useSelector((s: RootState) => s.cms.allSections);
  const allSectionsCss = useSelector((s: RootState) => s.cms.allSectionsCss);

  // Build HTML from Redux element data
  const elements = allSections[pageName] || {};
  const cssOverrides = allSectionsCss[pageName] || {};

  const previewHtml = useMemo(
    () => buildPreviewHtml(elements, cssOverrides, section.accentColor),
    [elements, cssOverrides, section.accentColor],
  );

  // Write HTML into iframe whenever it changes
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(previewHtml);
    doc.close();
  }, [previewHtml]);

  // If no elements loaded yet, fetch them
  useEffect(() => {
    if (Object.keys(elements).length === 0) {
      dispatch(fetchElementsByPage(pageName));
    }
  }, [pageName, dispatch, elements]);

  return (
    <div className="h-full flex flex-col">
      {/* Section info bar */}
      <div className="px-4 py-2 border-b border-border/30 flex items-center gap-3 shrink-0">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: section.accentColor }}
        />
        <span className="text-sm font-medium text-foreground">{section.sectionName}</span>
        <span className="text-xs text-muted-foreground">— {section.pageName}</span>
        <span className="text-xs text-muted-foreground font-mono">v{section.variations}</span>
      </div>

      {/* Live rendered preview in iframe */}
      <div className="flex-1 overflow-hidden bg-[#0a0a0a]">
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          style={{ border: 'none', overflow: 'auto' }}
          title="Section Preview"
        />
      </div>
    </div>
  );
}
