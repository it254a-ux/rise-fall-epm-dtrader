'use client';

import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TradeModeToggle } from '@/components/custom/trade-mode-toggle';

export interface TradeBodyProps {
  /**
   * Fully rendered chart element (or its own Skeleton fallback while chart
   * data isn't ready yet). Each body component still owns its own chart
   * wiring/props (symbolKey, contractsArray, isLive, endEpoch, etc.) — this
   * component only places it inside the shared chart column.
   */
  chart: ReactNode;

  /** Whether the whole settings column should show a loading skeleton instead of the Card. */
  isLoading: boolean;

  tradeMode: 'manual' | 'automated';
  onModeChange: (mode: 'manual' | 'automated') => void;
  onOpenBotLibrary: () => void;
  /** Passed straight through to TradeModeToggle (e.g. "Matches/Differs"). */
  label?: string;
  activeTradeType?: string;
  onSelectTradeType?: (type: string) => void;

  /**
   * Buy button markup for manual mode. Each body keeps full control over its
   * own button copy/formatting (Digits: "Buy @ X USD", Rise/Fall: "Buy" +
   * payout beneath, Accumulators: Buy/Close) — TradeBody only decides
   * *where* it sits and *when* it shows (manual mode only).
   */
  buyButton?: ReactNode;

  /** The manual or automated settings panel for the current mode. */
  children: ReactNode;

  // ---- Layout overrides ----
  // All default to the current Digits/Accumulators shape. Rise/Fall's shell
  // differs slightly today (max-w-7xl wrapper, different chart sizing, extra
  // CardContent padding) — pass overrides for those rather than changing the
  // defaults, so this extraction is a zero-diff change for Digits.
  outerClassName?: string;
  gridClassName?: string;
  chartColClassName?: string;
  chartWrapperClassName?: string;
  settingsColClassName?: string;
  cardClassName?: string;
  cardContentClassName?: string;
  skeletonClassName?: string;
}

const DEFAULT_OUTER =
  'flex w-full flex-col px-3 py-2 sm:px-4 sm:py-4 gap-2 sm:gap-3 max-lg:pb-16 lg:pb-2 lg:px-3 lg:flex-1 lg:min-h-0 lg:overflow-hidden';
const DEFAULT_GRID = 'flex flex-col lg:grid lg:grid-cols-[1fr_240px] lg:gap-3 lg:h-full lg:min-h-0';
const DEFAULT_CHART_COL = 'flex flex-col gap-2 px-0 pt-2 lg:py-0 lg:h-full lg:min-h-0';
const DEFAULT_CHART_WRAPPER = 'h-[70vh] min-h-[420px] max-h-[640px] lg:h-full lg:min-h-0 lg:max-h-none';
const DEFAULT_SETTINGS_COL =
  'flex flex-col gap-3 pt-3 lg:pt-0 border-t border-border lg:border-0 lg:h-full lg:min-h-0';
const DEFAULT_CARD = 'lg:h-full lg:overflow-y-auto';
const DEFAULT_CARD_CONTENT = 'pt-4';
const DEFAULT_SKELETON = 'lg:h-full h-48 w-full rounded-xl';

export function TradeBody({
  chart,
  isLoading,
  tradeMode,
  onModeChange,
  onOpenBotLibrary,
  label,
  activeTradeType,
  onSelectTradeType,
  buyButton,
  children,
  outerClassName = DEFAULT_OUTER,
  gridClassName = DEFAULT_GRID,
  chartColClassName = DEFAULT_CHART_COL,
  chartWrapperClassName = DEFAULT_CHART_WRAPPER,
  settingsColClassName = DEFAULT_SETTINGS_COL,
  cardClassName = DEFAULT_CARD,
  cardContentClassName = DEFAULT_CARD_CONTENT,
  skeletonClassName = DEFAULT_SKELETON,
}: TradeBodyProps) {
  return (
    <div className={outerClassName}>
      <div className={gridClassName}>
        {/* Column 1: Chart */}
        <div className={chartColClassName}>
          <div className={chartWrapperClassName} style={{ touchAction: 'pan-y' }}>
            {chart}
          </div>
        </div>

        {/* Column 2: Trade panel in a Card — Manual/Automated/Bot-library
            icons render inline at the top via TradeModeToggle. */}
        <div className={settingsColClassName}>
          {isLoading ? (
            <Skeleton className={skeletonClassName} />
          ) : (
            <Card className={cardClassName}>
              <CardContent className={cardContentClassName}>
                <TradeModeToggle
                  mode={tradeMode}
                  onModeChange={onModeChange}
                  onOpenBotLibrary={onOpenBotLibrary}
                  label={label}
                  activeTradeType={activeTradeType}
                  onSelectTradeType={onSelectTradeType}
                />

                {tradeMode === 'manual' && buyButton}

                {children}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
