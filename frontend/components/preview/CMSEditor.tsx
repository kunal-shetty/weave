'use client';

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { patchElement, CMSElement, CardItem } from '@/store/slices/cmsSlice';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/components/ui/use-mobile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Save, X, ChevronDown, ChevronUp, ImageIcon,
  Type, AlignLeft, MousePointer, LayoutGrid, Palette,
} from 'lucide-react';

interface CMSEditorProps {
  sectionId: string;
  pageName: string;
  onClose?: () => void;
}

const CONTENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  Image:     <ImageIcon className="w-3.5 h-3.5" />,
  Text:      <Type className="w-3.5 h-3.5" />,
  Textfield: <AlignLeft className="w-3.5 h-3.5" />,
  Button:    <MousePointer className="w-3.5 h-3.5" />,
  Cards:     <LayoutGrid className="w-3.5 h-3.5" />,
};

export function CMSEditor({ sectionId, pageName, onClose }: CMSEditorProps) {
  const dispatch = useDispatch<AppDispatch>();
  const isMobile = useIsMobile();
  const allSections = useSelector((s: RootState) => s.cms.allSections);
  const elements = useSelector((s: RootState) => {
    // Derive element list from store; real data fetched by parent
    const pageData = allSections[pageName] || {};
    return Object.entries(pageData).map(([fieldId, val]) => ({ fieldId, value: val }));
  });

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [localLoops, setLocalLoops] = useState<Record<string, CardItem[]>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [cssMode, setCssMode] = useState<Record<string, boolean>>({});
  const [cssValues, setCssValues] = useState<Record<string, string>>({});

  // Full element metadata from the API
  const [elementMeta, setElementMeta] = useState<CMSElement[]>([]);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    fetch(`${API}/api/elements?sectionId=${sectionId}`)
      .then((r) => r.json())
      .then((data: CMSElement[]) => {
        setElementMeta(data);
        // Seed local state from fetched metadata
        const vals: Record<string, string> = {};
        const loops: Record<string, CardItem[]> = {};
        data.forEach((el) => {
          if (el.contentType === 'Cards' && el.loop) {
            loops[el.fieldId] = el.loop;
          } else {
            vals[el.fieldId] = el.content || '';
          }
          if (el.css) setCssValues((prev) => ({ ...prev, [el.fieldId]: el.css! }));
        });
        setLocalValues(vals);
        setLocalLoops(loops);
      })
      .catch(() => toast.error('Failed to load element metadata'));
  }, [sectionId]);

  const toggleExpand = (fieldId: string) => {
    setExpanded((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }));
  };

  const handleSave = async (el: CMSElement) => {
    setSaving((prev) => ({ ...prev, [el.fieldId]: true }));
    try {
      const payload: { fieldId: string; content?: string; css?: string; loop?: CardItem[] } = {
        fieldId: el.fieldId,
      };
      if (el.contentType === 'Cards') {
        payload.loop = localLoops[el.fieldId];
      } else {
        payload.content = localValues[el.fieldId] ?? el.content;
      }
      if (cssMode[el.fieldId]) {
        payload.css = cssValues[el.fieldId];
      }
      await dispatch(patchElement(payload)).unwrap();
      toast.success(`${el.elementName} saved`);
    } catch {
      toast.error(`Failed to save ${el.elementName}`);
    } finally {
      setSaving((prev) => ({ ...prev, [el.fieldId]: false }));
    }
  };

  const updateCardField = (fieldId: string, cardIndex: number, key: 'value1' | 'value2', val: string) => {
    setLocalLoops((prev) => {
      const loop = [...(prev[fieldId] || [])];
      loop[cardIndex] = { ...loop[cardIndex], [key]: val };
      return { ...prev, [fieldId]: loop };
    });
  };

  if (!elementMeta.length) {
    return (
      <div className={cn(
        'border-l border-border/50 flex items-center justify-center p-6 text-muted-foreground text-sm',
        isMobile ? 'w-full' : 'w-80'
      )}>
        Loading elements…
      </div>
    );
  }

  return (
    <aside className={cn(
      'border-l border-border/50 backdrop-blur-sm bg-background/30 flex flex-col overflow-hidden',
      isMobile ? 'w-full absolute inset-0 z-20' : 'w-80'
    )}>
      {/* Header */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border/50 flex items-center justify-between shrink-0">
        <h3 className="text-xs sm:text-sm font-semibold text-foreground">CMS Editor</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] sm:text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            {elementMeta.length} fields
          </span>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Elements list */}
      <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2">
        {elementMeta.map((el) => (
          <div key={el.fieldId} className="card-3d rounded-xl border border-border/30 bg-secondary/20 overflow-hidden">
            {/* Element header */}
            <button
              className="w-full flex items-center justify-between px-2.5 sm:px-3 py-2 sm:py-2.5 text-left hover:bg-secondary/30 transition-colors"
              onClick={() => toggleExpand(el.fieldId)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground shrink-0">
                  {CONTENT_TYPE_ICONS[el.contentType]}
                </span>
                <span className="text-xs sm:text-sm font-medium text-foreground truncate">{el.elementName}</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0 bg-secondary/50 px-1.5 py-0.5 rounded hidden sm:inline">
                  {el.contentType}
                </span>
              </div>
              {expanded[el.fieldId] ? (
                <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
            </button>

            {/* Expanded editor */}
            {expanded[el.fieldId] && (
              <div className="px-2.5 sm:px-3 pb-3 space-y-2.5 sm:space-y-3 border-t border-border/30 pt-2.5 sm:pt-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-mono break-all">
                  fieldId: {el.fieldId}
                </p>

                {/* Cards editor */}
                {el.contentType === 'Cards' ? (
                  <div className="space-y-2">
                    {(localLoops[el.fieldId] || []).map((card, i) => (
                      <div key={i} className="space-y-1.5 p-2 bg-secondary/30 rounded-lg">
                        <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Card {i + 1}</p>
                        <input
                          className="w-full bg-input border border-border rounded-md px-2 py-1.5 text-xs sm:text-sm text-foreground"
                          placeholder="Value (e.g. 1000+)"
                          value={card.value1}
                          onChange={(e) => updateCardField(el.fieldId, i, 'value1', e.target.value)}
                        />
                        <input
                          className="w-full bg-input border border-border rounded-md px-2 py-1.5 text-xs sm:text-sm text-foreground"
                          placeholder="Label (e.g. Community Members)"
                          value={card.value2}
                          onChange={(e) => updateCardField(el.fieldId, i, 'value2', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                ) : el.contentType === 'Image' ? (
                  <div className="space-y-1.5">
                    <label className="text-[10px] sm:text-xs text-muted-foreground">Image URL / Path</label>
                    <input
                      className="w-full bg-input border border-border rounded-md px-2 py-1.5 text-xs sm:text-sm text-foreground"
                      value={localValues[el.fieldId] ?? el.content}
                      onChange={(e) => setLocalValues((p) => ({ ...p, [el.fieldId]: e.target.value }))}
                    />
                  </div>
                ) : el.contentType === 'Textfield' ? (
                  <div className="space-y-1.5">
                    <label className="text-[10px] sm:text-xs text-muted-foreground">Content</label>
                    <textarea
                      rows={3}
                      className="w-full bg-input border border-border rounded-md px-2 py-1.5 text-xs sm:text-sm text-foreground resize-none"
                      value={localValues[el.fieldId] ?? el.content}
                      onChange={(e) => setLocalValues((p) => ({ ...p, [el.fieldId]: e.target.value }))}
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[10px] sm:text-xs text-muted-foreground">Content</label>
                    <input
                      className="w-full bg-input border border-border rounded-md px-2 py-1.5 text-xs sm:text-sm text-foreground"
                      value={localValues[el.fieldId] ?? el.content}
                      onChange={(e) => setLocalValues((p) => ({ ...p, [el.fieldId]: e.target.value }))}
                    />
                  </div>
                )}

                {/* CSS override toggle */}
                <div>
                  <button
                    className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setCssMode((p) => ({ ...p, [el.fieldId]: !p[el.fieldId] }))}
                  >
                    <Palette className="w-3 h-3" />
                    {cssMode[el.fieldId] ? 'Hide CSS Override' : 'Add CSS Override'}
                  </button>
                  {cssMode[el.fieldId] && (
                    <textarea
                      rows={3}
                      className="mt-1.5 w-full bg-input border border-border rounded-md px-2 py-1.5 text-[10px] sm:text-xs text-foreground font-mono resize-none"
                      placeholder="color: red; font-size: 24px;"
                      value={cssValues[el.fieldId] || ''}
                      onChange={(e) => setCssValues((p) => ({ ...p, [el.fieldId]: e.target.value }))}
                    />
                  )}
                </div>

                {/* Save */}
                <Button
                  onClick={() => handleSave(el)}
                  disabled={saving[el.fieldId]}
                  className="btn-3d btn-glow w-full gap-2 bg-gradient-to-br from-primary via-gray-900 to-black text-white h-8 text-xs sm:text-sm"
                >
                  {saving[el.fieldId] ? (
                    <span className="animate-spin">◌</span>
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  {saving[el.fieldId] ? 'Saving…' : 'Save'}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
