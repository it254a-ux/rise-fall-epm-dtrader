'use client';
interface ModeRailProps {
  mode: 'manual' | 'automated';
  onModeChange: (mode: 'manual' | 'automated') => void;
  onOpenBotLibrary: () => void;
}
/**
 * Manual / Automated / Bot-library icon row. Previously rendered as a
 * floating vertical column in its own grid cell outside the trade panel
 * card; now rendered horizontally, inline at the top of the card (see
 * TradeModeToggle), so it no longer eats a dedicated grid column or
 * squeezes the panel width.
 *
 * Mobile-only: given a relative position + elevated z-index so it sits
 * above whatever overlay/loading layer is covering it for the first ~2
 * minutes after reload on mobile (same tap-lock issue fixed on the
 * Rise/Fall trade-controls panel). Desktop (lg:) is untouched.
 */
export function ModeRail({ mode, onModeChange, onOpenBotLibrary }: ModeRailProps) {
  return (
    <div className="flex flex-row items-center gap-2 mb-2 max-lg:relative max-lg:z-[9999]">
      <button
        onClick={() => onModeChange('manual')}
        title="Manual trading"
        className={`rounded-md p-2 border border-border transition-colors ${
          mode === 'manual' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:bg-foreground/5'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
          <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
          <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
          <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </button>
      <button
        onClick={() => onModeChange('automated')}
        title="Automated trading"
        className={`rounded-full p-2 transition-colors ${
          mode === 'automated' ? 'bg-orange-500/15 text-orange-500' : 'text-muted-foreground hover:bg-foreground/5'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
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
        className="rounded-full p-2 text-muted-foreground hover:bg-foreground/5 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
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
