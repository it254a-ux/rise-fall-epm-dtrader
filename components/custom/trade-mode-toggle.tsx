'use client';
import { ModeRail } from '@/components/custom/mode-rail';
interface TradeModeToggleProps {
  mode: 'manual' | 'automated';
  onModeChange: (mode: 'manual' | 'automated') => void;
  onOpenBotLibrary: () => void;
  /** e.g. "Rise/Fall", "Matches/Differs" — rendered as "Automate {label}". Defaults to "Rise/Fall". */
  label?: string;
  /** Currently selected trade type — when provided (together with
   * onSelectTradeType), a "Market contracts" icon is added to the icon
   * row via ModeRail. See ModeRail for details. */
  activeTradeType?: string;
  onSelectTradeType?: (type: string) => void;
}
/**
 * Top of the trade panel card: the Manual/Automated/Bot-library icon row,
 * followed by the "Automate {label} ›" breadcrumb. The icon row used to be
 * a separate floating column (mode-rail.tsx) in its own grid cell outside
 * the card — it's now rendered inline here, horizontally, so the panel
 * itself gets that width back and doesn't need to be squeezed.
 */
export function TradeModeToggle({
  mode,
  onModeChange,
  onOpenBotLibrary,
  label = 'Rise/Fall',
  activeTradeType,
  onSelectTradeType,
}: TradeModeToggleProps) {
  return (
    <div className="mb-3">
      <ModeRail
        mode={mode}
        onModeChange={onModeChange}
        onOpenBotLibrary={onOpenBotLibrary}
        activeTradeType={activeTradeType}
        onSelectTradeType={onSelectTradeType}
      />
      <button
        onClick={() => onModeChange('automated')}
        className="flex items-center gap-1 text-[13px] font-semibold text-foreground hover:text-primary"
      >
        Automate {label}
        <span className="text-muted-foreground">›</span>
      </button>
    </div>
  );
}
