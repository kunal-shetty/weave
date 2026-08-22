'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Button } from '@/components/ui/button';
import {
  Clock, Eye, ChevronRight, PanelRightClose, PanelRightOpen,
} from 'lucide-react';
import Link from 'next/link';

export function JobHistoryPanel() {
  const { jobHistory } = useSelector((s: RootState) => s.studio);
  const [collapsed, setCollapsed] = useState(false);

  if (!jobHistory.length) return null;

  return (
    <aside
      className={`border-l border-border/50 backdrop-blur-sm bg-background/20 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
        collapsed ? 'w-10' : 'w-72'
      }`}
    >
      {/* Toggle button */}
      <div className={`border-b border-border/50 flex ${collapsed ? 'justify-center' : 'justify-end'} py-2 px-2`}>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {collapsed ? (
            <PanelRightOpen className="w-4 h-4" />
          ) : (
            <PanelRightClose className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Collapsed state — show just icon + count */}
      {collapsed ? (
        <div className="flex flex-col items-center gap-2 py-3">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-medium">{jobHistory.length}</span>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Clock className="w-4 h-4" />
              Recent Jobs
              <span className="ml-auto text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {jobHistory.length}/5
              </span>
            </div>
          </div>

          {/* Job list */}
          <div className="flex-1 p-3 space-y-2 overflow-y-auto">
            {jobHistory.map((job, idx) => (
              <div
                key={job.id}
                className={`card-3d rounded-xl p-3 space-y-2 border ${
                  idx === 0 ? 'border-primary/30 bg-primary/5' : 'border-border/30 bg-secondary/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground truncate">{job.sectionName}</p>
                    <p className="text-xs text-muted-foreground">{job.pageName}</p>
                  </div>
                  {idx === 0 && (
                    <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full shrink-0">
                      Latest
                    </span>
                  )}
                </div>

                {job.warnings.length > 0 && (
                  <p className="text-xs text-yellow-400">⚠ {job.warnings.length} warning{job.warnings.length > 1 ? 's' : ''}</p>
                )}

                <div className="text-xs text-muted-foreground">
                  {new Date(job.timestamp).toLocaleTimeString()}
                </div>

                <Link href={`/preview/${job.pageName}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="btn-3d w-full justify-between gap-2 text-xs text-sidebar-foreground hover:bg-sidebar-accent h-7"
                  >
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Preview
                    </span>
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
