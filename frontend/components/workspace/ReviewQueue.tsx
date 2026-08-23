'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getClientSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, XCircle, Eye, AlertTriangle,
  ChevronDown, ChevronUp, User, Sparkles,
  Image, Type, Plus, Minus, ArrowUpDown,
  ClipboardCheck, Clock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ReviewRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ReviewItem {
  reviewId: string;
  sessionId: string;
  sectionId?: string;
  type: 'wireframe_region' | 'field_change' | 'new_element' | 'removed_element' | 'reordered';
  confidence: number;
  status: 'pending' | 'assigned' | 'approved' | 'rejected' | 'needs_changes';
  assignedTo?: string;
  assignedName?: string;
  region?: ReviewRegion;
  wireframeLabel?: string;
  wireframeSuggestion?: string;
  fieldId?: string;
  elementName?: string;
  previousContent?: string;
  newContent?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

interface ReviewQueueProps {
  sessionId: string;
  onRefresh?: () => void;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  wireframe_region: { icon: <Image className="w-3 h-3" />, label: 'Wireframe Region', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  field_change: { icon: <Type className="w-3 h-3" />, label: 'Field Changed', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  new_element: { icon: <Plus className="w-3 h-3" />, label: 'New Element', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  removed_element: { icon: <Minus className="w-3 h-3" />, label: 'Removed Element', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  reordered: { icon: <ArrowUpDown className="w-3 h-3" />, label: 'Reordered', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
};

function confidenceColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-red-400';
}

function confidenceBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/20';
  if (score >= 50) return 'bg-yellow-500/10 border-yellow-500/20';
  return 'bg-red-500/10 border-red-500/20';
}

export function ReviewQueue({ sessionId }: ReviewQueueProps) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const supabase = createClient();

  const fetchItems = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.set('type', filterType);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const res = await fetch(`${API}/api/reviews/${sessionId}?${params}`);
      if (res.ok) {
        setItems(await res.json());
      }
    } catch (err) {
      console.warn('[ReviewQueue] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId, filterType, filterStatus]);

  // Refetch on filter change
  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Subscribe to socket for live review queue updates
  const fetchRef = useRef(fetchItems);
  fetchRef.current = fetchItems;
  useEffect(() => {
    const socket = getClientSocket();
    const onMemberChange = (payload: { action?: string; sessionId?: string }) => {
      if (payload.sessionId === sessionId && (payload.action === 'review_created' || payload.action === 'review_updated')) {
        fetchRef.current();
      }
    };
    socket.on('workspace:member_change', onMemberChange);
    return () => { socket.off('workspace:member_change', onMemberChange); };
  }, [sessionId]);

  const updateItem = async (reviewId: string, body: Record<string, unknown>) => {
    setActionLoading(reviewId);
    try {
      const res = await fetch(`${API}/api/reviews/${sessionId}/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((i) => (i.reviewId === reviewId ? { ...i, ...updated } : i)));
      }
    } catch (err) {
      console.warn('[ReviewQueue] Update error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssign = async (reviewId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await updateItem(reviewId, {
      status: 'assigned',
      assignedTo: user.id,
      assignedName: user.user_metadata?.full_name || user.email,
    });
  };

  const handleApprove = async (reviewId: string) => {
    await updateItem(reviewId, { status: 'approved' });
  };

  const handleReject = async (reviewId: string) => {
    await updateItem(reviewId, { status: 'rejected' });
  };

  const handleBulkApprove = async () => {
    try {
      await fetch(`${API}/api/reviews/${sessionId}/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      fetchItems();
    } catch (err) {
      console.warn('[ReviewQueue] Bulk approve error:', err);
    }
  };

  const handleBulkReject = async () => {
    try {
      await fetch(`${API}/api/reviews/${sessionId}/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      fetchItems();
    } catch (err) {
      console.warn('[ReviewQueue] Bulk reject error:', err);
    }
  };

  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const lowConfidenceCount = items.filter((i) => i.confidence < 50 && i.status === 'pending').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border/30 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-3.5 h-3.5 text-foreground/70" />
            <span className="text-[11px] font-medium text-foreground/80">Review Queue</span>
          </div>
          {pendingCount > 0 && (
            <span className={cn(
              'text-[9px] font-mono px-1.5 py-0.5 rounded-full border',
              lowConfidenceCount > 0
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
            )}>
              {pendingCount} pending
              {lowConfidenceCount > 0 && ` · ${lowConfidenceCount} low`}
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-1">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-[10px] bg-secondary/50 border border-border/30 rounded-md px-1.5 py-0.5 text-muted-foreground"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-[10px] bg-secondary/50 border border-border/30 rounded-md px-1.5 py-0.5 text-muted-foreground"
          >
            <option value="all">All types</option>
            <option value="wireframe_region">Wireframe</option>
            <option value="field_change">Field Changes</option>
            <option value="new_element">New</option>
            <option value="removed_element">Removed</option>
            <option value="reordered">Reordered</option>
          </select>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 scrollbar-none">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Clock className="w-4 h-4 text-muted-foreground/30 animate-pulse" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div className="w-8 h-8 rounded-lg bg-secondary/30 border border-border/20 grid place-items-center">
              <CheckCircle2 className="w-4 h-4 text-muted-foreground/30" />
            </div>
            <p className="text-[10px] text-muted-foreground/40">
              {filterStatus === 'pending' ? 'All clear — nothing to review' : 'No items match filter'}
            </p>
          </div>
        ) : (
          items.map((item) => {
            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.field_change;
            const isExpanded = expandedId === item.reviewId;
            const isPending = item.status === 'pending';
            const isLoading = actionLoading === item.reviewId;

            return (
              <div
                key={item.reviewId}
                className={cn(
                  'rounded-xl border transition-all',
                  isPending ? 'border-border/40 bg-secondary/15' : 'border-border/20 bg-secondary/5'
                )}
              >
                {/* Item header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : item.reviewId)}
                  className="w-full flex items-start gap-2 px-2.5 py-2 text-left hover:bg-secondary/20 rounded-xl transition-colors"
                >
                  <span className={cn('shrink-0 mt-0.5 px-1.5 py-0.5 rounded border text-[9px] font-mono', cfg.color)}>
                    {cfg.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-foreground/80 truncate">
                        {item.wireframeLabel || item.elementName || item.type.replace(/_/g, ' ')}
                      </span>
                      {item.type === 'wireframe_region' && (
                        <span className={cn('text-[9px] font-mono px-1 py-0.5 rounded border', confidenceBg(item.confidence), confidenceColor(item.confidence))}>
                          {item.confidence}%
                        </span>
                      )}
                    </div>
                    {item.wireframeSuggestion && (
                      <p className="text-[9px] text-muted-foreground/50 mt-0.5 truncate">{item.wireframeSuggestion}</p>
                    )}
                    {item.status === 'assigned' && item.assignedName && (
                      <p className="text-[9px] text-blue-400/60 mt-0.5 flex items-center gap-1">
                        <User className="w-2.5 h-2.5" /> {item.assignedName}
                      </p>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground/40 shrink-0 mt-1" /> : <ChevronDown className="w-3 h-3 text-muted-foreground/40 shrink-0 mt-1" />}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-2.5 pb-2.5 space-y-2 border-t border-border/20 pt-2">
                    {/* Field diff (for field_change / new_element / removed_element) */}
                    {(item.type === 'field_change' || item.type === 'new_element') && item.newContent && (
                      <div className="text-[10px] bg-secondary/30 rounded-lg p-2 font-mono text-foreground/60 break-all">
                        <span className="text-muted-foreground/40 text-[9px]">New:</span> {item.newContent.slice(0, 200)}
                      </div>
                    )}
                    {item.type === 'field_change' && item.previousContent && (
                      <div className="text-[10px] bg-red-500/5 rounded-lg p-2 font-mono text-foreground/40 break-all line-through">
                        <span className="text-muted-foreground/40 text-[9px]">Was:</span> {item.previousContent.slice(0, 200)}
                      </div>
                    )}
                    {item.type === 'removed_element' && item.previousContent && (
                      <div className="text-[10px] bg-red-500/5 rounded-lg p-2 font-mono text-red-400/60 break-all">
                        <span className="text-muted-foreground/40 text-[9px]">Removed:</span> {item.previousContent.slice(0, 200)}
                      </div>
                    )}

                    {/* Wireframe confidence bar */}
                    {item.type === 'wireframe_region' && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-secondary/40 overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', item.confidence >= 80 ? 'bg-emerald-500' : item.confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500')}
                            style={{ width: `${item.confidence}%` }}
                          />
                        </div>
                        <span className={cn('text-[9px] font-mono', confidenceColor(item.confidence))}>{item.confidence}%</span>
                      </div>
                    )}

                    {/* Region coordinates (for wireframe) */}
                    {item.region && item.region.width > 0 && (
                      <p className="text-[9px] text-muted-foreground/30 font-mono">
                        Region: ({(item.region.x * 100).toFixed(0)}%, {(item.region.y * 100).toFixed(0)}%) · {(item.region.width * 100).toFixed(0)}%×{(item.region.height * 100).toFixed(0)}%
                      </p>
                    )}

                    {/* Action buttons */}
                    {isPending && (
                      <div className="flex gap-1.5 pt-1">
                        <Button
                          size="sm"
                          disabled={isLoading}
                          onClick={() => handleAssign(item.reviewId)}
                          className="h-6 text-[10px] gap-1 bg-secondary/50 border border-border/30 text-muted-foreground hover:text-foreground"
                        >
                          <User className="w-2.5 h-2.5" /> Claim
                        </Button>
                        <Button
                          size="sm"
                          disabled={isLoading}
                          onClick={() => handleApprove(item.reviewId)}
                          className="h-6 text-[10px] gap-1 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30"
                        >
                          <CheckCircle2 className="w-2.5 h-2.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          disabled={isLoading}
                          onClick={() => handleReject(item.reviewId)}
                          className="h-6 text-[10px] gap-1 bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30"
                        >
                          <XCircle className="w-2.5 h-2.5" /> Reject
                        </Button>
                      </div>
                    )}

                    {/* Status badge for resolved items */}
                    {item.status !== 'pending' && item.status !== 'assigned' && (
                      <div className={cn(
                        'text-[9px] font-mono px-2 py-0.5 rounded-full border inline-flex items-center gap-1',
                        item.status === 'approved' && 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                        item.status === 'rejected' && 'bg-red-500/10 border-red-500/20 text-red-400',
                        item.status === 'needs_changes' && 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
                      )}>
                        {item.status === 'approved' && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {item.status === 'rejected' && <XCircle className="w-2.5 h-2.5" />}
                        {item.status === 'needs_changes' && <AlertTriangle className="w-2.5 h-2.5" />}
                        {item.status}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bulk actions footer */}
      {items.some((i) => i.status === 'pending') && (
        <div className="px-2.5 py-2 border-t border-border/30 shrink-0 flex gap-1.5">
          <Button
            size="sm"
            onClick={handleBulkApprove}
            className="flex-1 h-7 text-[10px] gap-1 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30"
          >
            <CheckCircle2 className="w-3 h-3" /> Approve All
          </Button>
          <Button
            size="sm"
            onClick={handleBulkReject}
            className="flex-1 h-7 text-[10px] gap-1 bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30"
          >
            <XCircle className="w-3 h-3" /> Reject All
          </Button>
        </div>
      )}
    </div>
  );
}
