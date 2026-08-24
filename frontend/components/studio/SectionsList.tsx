'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/components/ui/use-mobile';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Eye, Clock, CheckCircle, XCircle, RefreshCw, LayoutGrid,
  Wand2, Filter, Calendar,
} from 'lucide-react';
import { ParticleOrb } from '@/components/shared/particle-orb';

interface Section {
  sectionId: string;
  sectionName: string;
  pageName: string;
  sectionStatus: 'Pending' | 'Approved' | 'Rejected';
  inputModes: string[];
  accentColor: string;
  variations: number;
  wireframeUrl?: string;
  cardGridColumns: number;
  createdAt: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const STATUS_STYLES = {
  Pending:  'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  Approved: 'text-green-400 bg-green-400/10 border-green-400/30',
  Rejected: 'text-red-400 bg-red-400/10 border-red-400/30',
};

const STATUS_ICONS = {
  Pending:  Clock,
  Approved: CheckCircle,
  Rejected: XCircle,
};

export function SectionsList() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = () => {
    setLoading(true);
    fetch(`${API}/api/sections`)
      .then((r) => r.json())
      .then(setSections)
      .catch(() => toast.error('Failed to load sections'))
      .finally(() => setLoading(false));
  };

  const handleStatusChange = async (sectionId: string, status: 'Approved' | 'Rejected') => {
    setUpdating((prev) => ({ ...prev, [sectionId]: true }));
    try {
      const res = await fetch(`${API}/api/sections/${sectionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionStatus: status }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setSections((prev) => prev.map((s) => s.sectionId === sectionId ? updated : s));
      toast.success(`Section ${status.toLowerCase()}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating((prev) => ({ ...prev, [sectionId]: false }));
    }
  };

  const filtered = filter === 'All' ? sections : sections.filter((s) => s.sectionStatus === filter);

  return (
    <main className="flex-1 flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="shader-orb shader-orb-1" />
        <div className="shader-orb shader-orb-2" />
      </div>
      <div className="absolute inset-0 opacity-[0.15] grid-background" />

      {/* Header */}
      <header className="relative z-10 flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3 sm:py-4 border-b border-border/50 backdrop-blur-sm bg-background/30 flex-wrap">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 sm:w-5 h-4 sm:h-5 text-primary" />
          <h1 className="text-sm sm:text-lg font-semibold text-foreground font-[var(--font-heading)]">
            {isMobile ? 'Sections' : 'All Sections'}
          </h1>
          <span className="text-xs sm:text-sm text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            {sections.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
          {/* Filter */}
          <div className="flex items-center bg-secondary rounded-lg p-0.5 border border-border gap-0.5">
            <Filter className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground ml-1.5 sm:ml-2" />
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((f) => (
              <Button
                key={f}
                variant="ghost"
                size="sm"
                className={`h-6 sm:h-7 px-1.5 sm:px-2.5 text-[10px] sm:text-xs rounded-md ${filter === f ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                onClick={() => setFilter(f)}
              >
                {isMobile ? f.slice(0, 3) : f}
              </Button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 sm:h-8 w-7 sm:w-8 border border-border/50"
            onClick={fetchSections}
          >
            <RefreshCw className={`w-3.5 sm:w-4 h-3.5 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Link href="/generate">
            <Button className="btn-3d btn-glow gap-1 sm:gap-2 bg-gradient-to-br from-primary via-gray-900 to-black text-white h-7 sm:h-8 text-xs sm:text-sm">
              <Wand2 className="w-3.5 h-3.5" /> {!isMobile && 'New Section'}
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto p-3 sm:p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-20 space-y-4">
            <ParticleOrb />
            <p className="text-muted-foreground text-xs sm:text-sm">Loading sections…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center space-y-4 px-4">
            <div className="w-12 sm:w-16 h-12 sm:h-16 rounded-2xl bg-secondary/50 flex items-center justify-center">
              <LayoutGrid className="w-6 sm:w-8 h-6 sm:h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">
              {filter === 'All' ? 'No sections yet' : `No ${filter} sections`}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              {filter === 'All'
                ? 'Generate your first section in the Studio.'
                : `No sections with status "${filter}" found.`}
            </p>
            {filter === 'All' && (
              <Link href="/generate">
                <Button className="btn-3d btn-glow gap-2 bg-gradient-to-br from-primary via-gray-900 to-black text-white text-sm">
                  <Wand2 className="w-4 h-4" /> Open Studio
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filtered.map((section) => {
              const StatusIcon = STATUS_ICONS[section.sectionStatus];
              return (
                <div
                  key={section.sectionId}
                  className="card-3d bg-gradient-to-br from-secondary/70 via-secondary/50 to-secondary/30 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-border/50 overflow-hidden shadow-xl group"
                >
                  {/* Wireframe thumbnail */}
                  {section.wireframeUrl ? (
                    <div className="h-28 sm:h-36 overflow-hidden bg-black/40">
                      <img
                        src={section.wireframeUrl}
                        alt={`${section.sectionName} wireframe`}
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                      />
                    </div>
                  ) : (
                    <div className="h-28 sm:h-36 bg-secondary/30 flex items-center justify-center">
                      <div
                        className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: section.accentColor + '20', border: `1px solid ${section.accentColor}40` }}
                      >
                        <LayoutGrid className="w-5 sm:w-6 h-5 sm:h-6" style={{ color: section.accentColor }} />
                      </div>
                    </div>
                  )}

                  <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                    {/* Title + status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate font-[var(--font-heading)] text-sm sm:text-base">
                          {section.sectionName}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{section.pageName}</p>
                      </div>
                      <span className={`flex items-center gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border shrink-0 ${STATUS_STYLES[section.sectionStatus]}`}>
                        <StatusIcon className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                        {isMobile ? section.sectionStatus.slice(0, 3) : section.sectionStatus}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                        {new Date(section.createdAt).toLocaleDateString()}
                      </span>
                      <span>v{section.variations}</span>
                      <span className="flex items-center gap-1">
                        <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full" style={{ backgroundColor: section.accentColor }} />
                        {section.cardGridColumns} cards
                      </span>
                    </div>

                    {/* Input mode badges */}
                    <div className="flex gap-1 sm:gap-1.5 flex-wrap">
                      {section.inputModes?.map((mode) => (
                        <span key={mode} className="text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground border border-border/30">
                          {mode}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 sm:gap-2 pt-1">
                      <Link href={`/preview/${section.pageName}`} className="flex-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="btn-3d w-full gap-1.5 sm:gap-2 border border-border/50 text-foreground h-7 sm:h-8 text-[10px] sm:text-xs"
                        >
                          <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Preview
                        </Button>
                      </Link>

                      {section.sectionStatus === 'Pending' && (
                        <>
                          <Button
                            size="sm"
                            disabled={updating[section.sectionId]}
                            className="btn-3d gap-1 bg-green-600 hover:bg-green-500 text-white h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-2.5"
                            onClick={() => handleStatusChange(section.sectionId, 'Approved')}
                          >
                            <CheckCircle className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            disabled={updating[section.sectionId]}
                            className="btn-3d gap-1 bg-red-700 hover:bg-red-600 text-white h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-2.5"
                            onClick={() => handleStatusChange(section.sectionId, 'Rejected')}
                          >
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
