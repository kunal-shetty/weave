'use client';

import { cn } from '@/lib/utils';

interface Region {
  label: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  suggestion?: string;
}

interface WireframeOverlayProps {
  regions: Region[];
  className?: string;
  onRegionClick?: (region: Region) => void;
}

function confidenceBorderColor(score: number): string {
  if (score >= 80) return 'border-emerald-400/60';
  if (score >= 50) return 'border-yellow-400/60';
  return 'border-red-400/60';
}

function confidenceBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500/8';
  if (score >= 50) return 'bg-yellow-500/8';
  return 'bg-red-500/8';
}

function confidenceBadgeColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500/90 text-white';
  if (score >= 50) return 'bg-yellow-500/90 text-black';
  return 'bg-red-500/90 text-white';
}

export function WireframeOverlay({ regions, className, onRegionClick }: WireframeOverlayProps) {
  if (!regions.length) return null;

  return (
    <div className={cn('absolute inset-0 pointer-events-none', className)}>
      {regions.map((region, i) => (
        <div
          key={i}
          className={cn(
            'absolute rounded-lg border-2 border-dashed transition-all duration-300',
            confidenceBorderColor(region.confidence),
            confidenceBg(region.confidence),
            onRegionClick && 'pointer-events-auto cursor-pointer hover:brightness-110'
          )}
          style={{
            left: `${region.x * 100}%`,
            top: `${region.y * 100}%`,
            width: `${region.width * 100}%`,
            height: `${region.height * 100}%`,
          }}
          onClick={() => onRegionClick?.(region)}
          title={region.suggestion || region.label}
        >
          {/* Confidence badge */}
          <div className={cn(
            'absolute -top-2.5 left-1 px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold shadow-lg',
            confidenceBadgeColor(region.confidence)
          )}>
            {region.confidence}%
          </div>

          {/* Label */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm rounded-b-md px-1.5 py-0.5">
            <p className="text-[8px] text-white/80 font-mono truncate">{region.label}</p>
            {region.suggestion && (
              <p className="text-[7px] text-white/50 truncate">{region.suggestion}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
