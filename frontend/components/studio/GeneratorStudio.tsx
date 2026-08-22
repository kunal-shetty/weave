'use client';

import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { runGenerate, clearError } from '@/store/slices/studioSlice';
import { ParticleOrb } from '@/components/shared/particle-orb';
import { Button } from '@/components/ui/button';
import {
  Popover, PopoverTrigger, PopoverContent,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import {
  ImageIcon, Code2, FileText, Wand2, Eye, Download,
  Upload, X, ChevronDown, Settings, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { JobHistoryPanel } from './JobHistoryPanel';

type InputMode = 'wireframe' | 'code' | 'prompt';

export function GeneratorStudio() {
  const dispatch = useDispatch<AppDispatch>();
  const { generating, error, progress, lastJob, jobHistory } = useSelector((s: RootState) => s.studio);

  const [activeModes, setActiveModes] = useState<Set<InputMode>>(new Set(['prompt']));
  const [prompt, setPrompt] = useState('');
  const [code, setCode] = useState('');
  const [wireframeFile, setWireframeFile] = useState<File | null>(null);
  const [pageName, setPageName] = useState('Home');
  const [sectionName, setSectionName] = useState('HeroSection');
  const [accentColor, setAccentColor] = useState('#ef4444');
  const [cardCount, setCardCount] = useState(3);
  const [configOpen, setConfigOpen] = useState(false);
  const [showJsx, setShowJsx] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleMode = (mode: InputMode) => {
    setActiveModes((prev) => {
      const next = new Set(prev);
      if (next.has(mode)) { if (next.size > 1) next.delete(mode); }
      else next.add(mode);
      return next;
    });
  };

  const handleWireframeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setWireframeFile(file);
      setActiveModes((prev) => new Set([...prev, 'wireframe']));
    } else {
      toast.error('Only PNG, JPG, and WebP files are supported');
    }
  };

  const handleGenerate = async () => {
    if (!prompt && !code && !wireframeFile) {
      toast.error('Provide at least one input: prompt, code, or wireframe');
      return;
    }
    dispatch(clearError());

    const formData = new FormData();
    if (prompt) formData.append('prompt', prompt);
    if (code) formData.append('code', code);
    if (wireframeFile) formData.append('wireframe', wireframeFile);
    formData.append('pageName', pageName);
    formData.append('sectionName', sectionName);
    formData.append('accentColor', accentColor);
    formData.append('cardCount', String(cardCount));

    const result = await dispatch(runGenerate(formData));
    if (runGenerate.fulfilled.match(result)) {
      toast.success('Section generated successfully!');
      setShowJsx(true);
    } else {
      toast.error(result.payload as string || 'Generation failed');
    }
  };

  const handleDownloadZip = () => {
    if (!lastJob) return;
    const blob = new Blob(
      [JSON.stringify({ generatedJsx: lastJob.generatedJsx, ids: lastJob.ids, sectionName: lastJob.sectionName, pageName: lastJob.pageName }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lastJob.sectionName}.json`;
    a.click();
  };

  return (
    <main className="flex-1 flex flex-col relative overflow-hidden">
      {/* Background from template */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="shader-orb shader-orb-1" />
        <div className="shader-orb shader-orb-2" />
        <div className="shader-orb shader-orb-3" />
      </div>
      <div className="absolute inset-0 opacity-[0.15] grid-background" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/50 backdrop-blur-sm bg-background/30">
        <div className="flex items-center gap-3">
          {(['wireframe', 'code', 'prompt'] as InputMode[]).map((mode) => (
            <Button
              key={mode}
              onClick={() => toggleMode(mode)}
              className={`btn-3d gap-2 backdrop-blur-sm border shadow-lg ${
                activeModes.has(mode)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary/70 text-foreground hover:bg-secondary/50 border-border/30'
              }`}
            >
              {mode === 'wireframe' && <ImageIcon className="w-4 h-4" />}
              {mode === 'code' && <Code2 className="w-4 h-4" />}
              {mode === 'prompt' && <FileText className="w-4 h-4" />}
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {/* Config Popover — stays within viewport */}
          <Popover open={configOpen} onOpenChange={setConfigOpen}>
            <PopoverTrigger asChild>
              <Button
                className="btn-3d gap-2 bg-secondary/70 text-foreground hover:bg-secondary/50 border border-border/30 shadow-lg"
              >
                <Settings className="w-4 h-4" />
                Config
                <ChevronDown className={`w-3 h-3 transition-transform ${configOpen ? 'rotate-180' : ''}`} />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={8} className="w-72 p-0 bg-secondary/90 backdrop-blur-xl border-border/50">
              <div className="p-3 space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Page Name</label>
                  <input className="w-full mt-1 bg-input border border-border rounded-lg px-3 py-1.5 text-sm text-foreground" value={pageName} onChange={(e) => setPageName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Section Name</label>
                  <input className="w-full mt-1 bg-input border border-border rounded-lg px-3 py-1.5 text-sm text-foreground" value={sectionName} onChange={(e) => setSectionName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Accent Color</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-border" />
                    <input className="flex-1 bg-input border border-border rounded-lg px-3 py-1.5 text-sm text-foreground" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Stat Cards Count</label>
                  <input type="number" min={1} max={6} className="w-full mt-1 bg-input border border-border rounded-lg px-3 py-1.5 text-sm text-foreground" value={cardCount} onChange={(e) => setCardCount(Number(e.target.value))} />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {lastJob && (
            <>
              <Link href={`/preview/${lastJob.pageName}`}>
                <Button className="btn-3d btn-glow gap-2 bg-secondary/70 text-foreground hover:bg-secondary/50 border border-border/30 shadow-lg">
                  <Eye className="w-4 h-4" /> Preview
                </Button>
              </Link>
              <Button onClick={handleDownloadZip} className="btn-3d gap-2 bg-secondary/70 text-foreground hover:bg-secondary/50 border border-border/30 shadow-lg">
                <Download className="w-4 h-4" /> Export
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6 overflow-y-auto">
          {/* Orb + Title */}
          {!lastJob && (
            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-6">
                <ParticleOrb />
              </div>
              <h1 className="text-4xl font-semibold text-foreground text-center font-[var(--font-heading)] tracking-tight">
                Generate a UI Section
              </h1>
              <p className="text-muted-foreground mt-2 text-center">
                Upload a wireframe, paste code, write a prompt — or combine all three.
              </p>
            </div>
          )}

          {/* Input Panels */}
          <div className="w-full max-w-4xl space-y-4">
            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Wireframe Panel — filename only, no image preview */}
            {activeModes.has('wireframe') && (
              <div
                className="input-3d bg-gradient-to-br from-secondary/70 via-secondary/60 to-secondary/50 backdrop-blur-xl rounded-2xl border border-border/50 p-4 shadow-2xl"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleWireframeDrop}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <ImageIcon className="w-4 h-4" />
                    {wireframeFile ? (
                      <span className="truncate max-w-[280px]">{wireframeFile.name}</span>
                    ) : (
                      'Wireframe'
                    )}
                  </div>
                  {wireframeFile && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { setWireframeFile(null); }}>
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                {!wireframeFile && (
                  <div
                    className="mt-3 border-2 border-dashed border-border/50 rounded-xl p-6 text-center cursor-pointer hover:border-border transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Drop PNG/JPG/WebP or click to upload</p>
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setWireframeFile(f);
                      }} />
                  </div>
                )}
              </div>
            )}

            {/* Code Panel */}
            {activeModes.has('code') && (
              <div className="input-3d bg-gradient-to-br from-secondary/70 via-secondary/60 to-secondary/50 backdrop-blur-xl rounded-2xl border border-border/50 p-4 shadow-2xl">
                <div className="flex items-center gap-2 mb-3 text-sm font-medium text-foreground">
                  <Code2 className="w-4 h-4" /> Existing Code Patterns
                </div>
                <textarea
                  className="w-full bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground text-sm font-mono min-h-[150px]"
                  placeholder="Paste existing React/JSX code here. The engine will preserve your Redux selectors, class conventions, and patterns."
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
            )}

            {/* Prompt + Submit */}
            <div className="input-3d bg-gradient-to-br from-secondary/70 via-secondary/60 to-secondary/50 backdrop-blur-xl rounded-2xl border border-border/50 p-4 shadow-2xl">
              {activeModes.has('prompt') && (
                <div className="flex items-start gap-3 mb-4">
                  <FileText className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                  <textarea
                    className="flex-1 bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground text-lg min-h-[80px]"
                    placeholder="Describe your section… e.g. 'Split hero layout: athlete image left, bold headline, 3 stat cards, red CTA button. Fitness brand.'"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <div className="text-xs text-muted-foreground">
                  {Array.from(activeModes).join(' + ')} mode{activeModes.size > 1 ? 's' : ''}
                  {activeModes.size > 1 && <span className="ml-1 text-primary">• combined</span>}
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="btn-3d btn-glow gap-2 bg-gradient-to-br from-primary via-gray-900 to-black hover:from-gray-900 hover:to-black text-white shadow-xl"
                >
                  {generating ? (
                    <><span className="animate-spin">◌</span> {progress || 'Generating…'}</>
                  ) : (
                    <><Wand2 className="w-4 h-4" /> Generate</>
                  )}
                </Button>
              </div>
            </div>

            {/* Generated JSX Output */}
            {lastJob && showJsx && (
              <div className="input-3d bg-gradient-to-br from-secondary/70 via-secondary/60 to-secondary/50 backdrop-blur-xl rounded-2xl border border-border/50 p-4 shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Generated JSX — {lastJob.sectionName}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowJsx(false)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                {lastJob.warnings.length > 0 && (
                  <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-400 space-y-1">
                    {lastJob.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
                  </div>
                )}
                <pre className="text-xs text-muted-foreground overflow-x-auto max-h-64 font-mono whitespace-pre-wrap">
                  {lastJob.generatedJsx}
                </pre>
                <div className="mt-3 flex gap-2">
                  <Link href={`/preview/${lastJob.pageName}`}>
                    <Button className="btn-3d btn-glow gap-2 bg-gradient-to-br from-primary via-gray-900 to-black text-white">
                      <Eye className="w-4 h-4" /> Open Preview
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Job History Sidebar */}
        {jobHistory.length > 0 && <JobHistoryPanel />}
      </div>
    </main>
  );
}
