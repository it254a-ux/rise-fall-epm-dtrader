'use client';

interface TradeModeToggleProps {
  mode: 'manual' | 'automated';
  onModeChange: (mode: 'manual' | 'automated') => void;
  /** e.g. "Rise/Fall", "Matches/Differs" — rendered as "Automate {label}". Defaults to "Rise/Fall". */
  label?: string;
}

/**
 * "Automate Rise/Fall ›" breadcrumb shown at the top of the trade panel in
 * both manual and automated mode. The Manual/Automated switch itself now
 * lives in ModeRail (a separate floating column) — see mode-rail.tsx.
 * Clicking this breadcrumb still jumps straight into automated mode, same
 * as the reference site.
 */
export function TradeModeToggle({ mode, onModeChange, label = 'Rise/Fall' }: TradeModeToggleProps) {
  return (
    <button
      onClick={() => onModeChange('automated')}
      className="flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary mb-3"
    >
      Automate {label}
      <span className="text-muted-foreground">›</span>
    </button>
  );
}
