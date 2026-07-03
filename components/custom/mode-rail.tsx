'use client';

interface ModeRailProps {
  mode: 'manual' | 'automated';
  onModeChange: (mode: 'manual' | 'automated') => void;
  onOpenBotLibrary: () => void;
}

/**
 * Vertical Manual/Automated/Bot-Library rail. Deriv places these icons in a
 * floating column at the far right edge of the screen — outside the trade
 * panel card entirely, not inside its header. Rendered by rise-fall-view.tsx
 * in a dedicated third grid column so it lines up alongside the panel
 * without sitting inside it.
 */
export function ModeRail({ mode, onModeChange, onOpenBotLibrary }: ModeRailProps) {
  return (
    <div className="hidden lg:flex flex-col items-center gap-3 pt-1">
      <button
        onClick={() => onModeChange('manual')}
        title="Manual trading"
        className={`rounded-md p-2.5 border border-border transition-colors ${
          mode === 'manual' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:bg-foreground/5'
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
          <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
          <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
          <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </button>
      <button
        onClick={() => onModeChange('automated')}
        title="Automated trading"
        className={`rounded-full p-2.5 transition-colors ${
          mode === 'automated' ? 'bg-orange-500/15 text-orange-500' : 'text-muted-foreground hover:bg-foreground/5'
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="3" y="5" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="6" cy="9" r="1" fill="currentColor" />
          <circle cx="10" cy="9" r="1" fill="currentColor" />
          <path d="M8 5V2" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="8" cy="1.5" r="0.8" fill="currentColor" />
        </svg>
      </button>
      <button
        onClick={onOpenBotLibrary}
        title="Bot library"
        className="rounded-full p-2.5 text-muted-foreground hover:bg-foreground/5 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M2 6.5H14" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="5" cy="9.5" r="1" fill="currentColor" />
          <circle cx="8" cy="9.5" r="1" fill="currentColor" />
          <circle cx="11" cy="9.5" r="1" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
