'use client';

import { useEffect, useRef, useState } from 'react';
import type { DigitStats } from '@/lib/digit-types';

interface DigitStatsBarProps {
  digitStats: DigitStats;
  selectedDigit: number;
  onDigitSelect: (digit: number) => void;
  lastDigit?: number | null;
}

interface DigitCircleProps {
  digit: number;
  pct: number;
  isSelected: boolean;
  isLast: boolean;
  isHighest: boolean;
  isLowest: boolean;
  hasData: boolean;
  onClick: () => void;
}

/** Keyframes for the small "scanning" indicator next to the prediction
 *  label, and for the selected-digit pulse ring. Injected once via a
 *  <style> tag so no separate CSS file needs to be touched. */
const SCAN_STYLE_ID = 'digit-stats-scan-styles';
function ScanStyles() {
  return (
    <style id={SCAN_STYLE_ID}>{`
      @keyframes digit-scan-sweep {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(250%); }
      }
      @keyframes digit-selected-pulse {
        0% { box-shadow: 0 0 0 0 rgba(245,158,11,0.55); }
        70% { box-shadow: 0 0 0 5px rgba(245,158,11,0); }
        100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); }
      }
    `}</style>
  );
}

/** Small rectangle with a sweeping line inside — signals that the digit
 *  stats bar is actively watching the live tick stream (independent of
 *  whether an automated bot is armed/running). */
function ScanningIndicator() {
  return (
    <span
      title="Live — scanning tick stream"
      style={{
        position: 'relative',
        display: 'inline-block',
        width: '18px',
        height: '10px',
        borderRadius: '2px',
        border: '1px solid rgba(0,210,211,0.5)',
        background: 'rgba(0,210,211,0.08)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '30%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, #00d2d3, transparent)',
          animation: 'digit-scan-sweep 1.6s linear infinite',
        }}
      />
    </span>
  );
}

/** Small grip icon — visual affordance that the header row is a drag handle. */
function GripIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.6 }}>
      <circle cx="5" cy="3.5" r="1.2" fill="currentColor" />
      <circle cx="11" cy="3.5" r="1.2" fill="currentColor" />
      <circle cx="5" cy="8" r="1.2" fill="currentColor" />
      <circle cx="11" cy="8" r="1.2" fill="currentColor" />
      <circle cx="5" cy="12.5" r="1.2" fill="currentColor" />
      <circle cx="11" cy="12.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function DigitCircle({
  digit,
  pct,
  isSelected,
  isLast,
  isHighest,
  isLowest,
  hasData,
  onClick,
}: DigitCircleProps) {
  const viewBoxSize = 64;
  const strokeWidth = 4;
  const radius = (viewBoxSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillRatio = hasData ? pct / 100 : 0;
  const dashOffset = circumference * (1 - fillRatio);
  const insetPct = ((strokeWidth + 2) / viewBoxSize) * 100;

  // Selected uses its own colour (amber) so it never gets visually confused
  // with the highest/lowest-probability highlighting, which used to share
  // the same cyan as "selected" and made the actual pick hard to spot.
  const arcColor = isSelected
    ? '#f59e0b'
    : isLowest
    ? '#ef4444'
    : isHighest
    ? '#00d2d3'
    : '#4b5563';

  const pctColor = isSelected
    ? '#f59e0b'
    : isLowest
    ? '#ef4444'
    : isHighest
    ? '#00d2d3'
    : '#9ca3af';

  const ringBg = isSelected ? '#2b2210' : '#1f2937';
  const outerGlow = isSelected ? '0 0 14px 4px rgba(245,158,11,0.45)' : 'none';

  return (
    <button
      onClick={onClick}
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '100%' }}
      aria-label={`Select digit ${digit}`}
    >
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}>
        <svg
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: 'rotate(-90deg)',
          }}
        >
          <circle
            cx={viewBoxSize / 2}
            cy={viewBoxSize / 2}
            r={radius}
            fill="none"
            stroke="#374151"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={viewBoxSize / 2}
            cy={viewBoxSize / 2}
            r={radius}
            fill="none"
            stroke={arcColor}
            strokeWidth={isSelected ? strokeWidth + 1.5 : strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease, stroke-width 0.2s ease' }}
          />
        </svg>

        <div
          style={{
            position: 'absolute',
            top: `${insetPct}%`,
            left: `${insetPct}%`,
            right: `${insetPct}%`,
            bottom: `${insetPct}%`,
            borderRadius: '50%',
            background: ringBg,
            boxShadow: outerGlow,
            border: isSelected ? '1.5px solid #f59e0b' : 'none',
            animation: isSelected ? 'digit-selected-pulse 1.8s infinite' : 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Fixed px sizes, not vw — vw sizes off the full viewport width,
              not this circle, which is what caused the numbers to overflow
              and overlap when the panel column is narrow. */}
          <span
            style={{
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              lineHeight: 1,
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {digit}
          </span>
          <span
            style={{
              color: pctColor,
              fontSize: '7.5px',
              fontWeight: 600,
              lineHeight: 1.3,
              fontFamily: 'monospace',
              transition: 'color 0.3s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {hasData ? `${pct.toFixed(1)}%` : '—'}
          </span>
        </div>

        {isSelected && (
          <div
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              width: '11px',
              height: '11px',
              borderRadius: '50%',
              background: '#f59e0b',
              border: '1.5px solid #2b2210',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#1a1200', fontSize: '7px', fontWeight: 900, lineHeight: 1 }}>✓</span>
          </div>
        )}

        {isLast && (
          <div
            style={{
              position: 'absolute',
              bottom: -6,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '6px solid #ef4444',
              transition: 'left 0.2s ease',
            }}
          />
        )}
      </div>
    </button>
  );
}

export function DigitStatsBar({
  digitStats,
  selectedDigit,
  onDigitSelect,
  lastDigit = null,
}: DigitStatsBarProps) {
  const maxPct = Math.max(...digitStats.percentages);
  const minPct = Math.min(...digitStats.percentages);
  const hasData = digitStats.totalTicks > 0;

  // FLOATING / DRAGGABLE — this bar now renders as a fixed overlay instead
  // of inline in the trade panel's column, so it floats on top of the
  // chart. Defaults to centered, near the bottom of the screen. Dragging
  // the header row (title + scanning indicator, marked with a grip icon)
  // repositions it anywhere on screen; position is kept in state only
  // (not persisted), so it resets to the default spot on reload — same as
  // every other panel control, none of which persist across reloads either.
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const handlePointerMove = (e: PointerEvent) => {
    if (!dragState.current || !containerRef.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    let newX = dragState.current.origX + dx;
    let newY = dragState.current.origY + dy;
    const w = containerRef.current.offsetWidth;
    const h = containerRef.current.offsetHeight;
    newX = Math.min(Math.max(0, newX), window.innerWidth - w);
    newY = Math.min(Math.max(0, newY), window.innerHeight - h);
    setPos({ x: newX, y: newY });
  };

  const handlePointerUp = () => {
    dragState.current = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...(pos
          ? { left: pos.x, top: pos.y }
          : { left: '50%', bottom: '88px', transform: 'translateX(-50%)' }),
        width: 'min(92vw, 260px)',
        background: 'transparent',
        border: 'none',
        borderRadius: '12px',
        padding: '8px 10px',
        boxShadow: 'none',
      }}
    >
      <ScanStyles />
      <div
        onPointerDown={handlePointerDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          marginBottom: '6px',
          cursor: 'grab',
          touchAction: 'none',
          color: '#9ca3af',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="text-[10px] text-muted-foreground">Last digit prediction</span>
          <ScanningIndicator />
        </div>
        <GripIcon />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(32px, 1fr))',
          gap: '6px 6px',
          placeItems: 'center',
          width: '100%',
        }}
      >
        {digitStats.percentages.map((pct, digit) => (
          <DigitCircle
            key={digit}
            digit={digit}
            pct={pct}
            isSelected={digit === selectedDigit}
            isLast={digit === lastDigit}
            isHighest={hasData && pct === maxPct}
            isLowest={hasData && pct === minPct}
            hasData={hasData}
            onClick={() => onDigitSelect(digit)}
          />
        ))}
      </div>
    </div>
  );
}
