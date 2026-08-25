'use client';

import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TradeModeToggle } from '@/components/custom/trade-mode-toggle';

export interface TradeBodyProps {
  /**
   * Fully rendered chart element (or its own Skeleton fallback while chart
   * data isn't ready yet). Each body component still owns its own chart
   * wiring/props (symbolKey, contractsArray, isLive, endEpoch, etc.) —
   * this component only places it inside the shared chart column.
   */
  chart: ReactNode;

  /** Whether the whole settings column should show a loading skeleton instead of the Card. */
  isLoading: boolean;

  /** Passed straight through to TradeModeToggle (e.g. "Matches/Differs"). */
  label?: string;
  activeTradeType?: string;
  onSelectTradeType?: (type: string) => void;

  /**
   * The automated settings panel for the current trade type. Manual mode
   * and its Buy button have been removed app-wide — every trade type now
   * renders only its automated panel here, which manages its own buying
   * internally (no separate buyButton slot needed anymore).
   */
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
const DEFAULT_GRID =
  'flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-3 lg:h-full lg:min-h-0';
const DEFAULT_CHART_COL = 'flex flex-col gap-2 px-0 pt-2 lg:py-0 lg:h-full lg:min-h-0';
const DEFAULT_CHART_WRAPPER = 'h-[70vh] min-h-[420px] max-h-[640px] lg:h-full lg:min-h-0 lg:max-h-none';
const DEFAULT_SETTINGS_COL =
  'flex flex-col gap-3 pt-3 lg:pt-0 border-t border-border lg:border-0 lg:h-full lg:min-h-0';
const DEFAULT_CARD = 'lg:h-full lg:overflow-y-auto thin-scrollbar';
const DEFAULT_CARD_CONTENT = 'pt-4';
const DEFAULT_SKELETON = 'lg:h-full h-48 w-full rounded-xl';

export function TradeBody({
  chart,
  isLoading,
  label,
  activeTradeType,
  onSelectTradeType,
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
          {/* MOBILE FIX: added contain: 'layout paint' so the browser isolates
              the heavy SmartCharts canvas from the rest of the page. Scroll and
              touch events outside the chart no longer force the browser to
              recalculate the chart's layout, eliminating the scroll-jank that
              made the page feel "locked" on phones. */}
          <div className={chartWrapperClassName} style={{ touchAction: 'pan-y', contain: 'layout paint' }}>
            {chart}
          </div>
        </div>

        {/* Column 2: Trade panel in a Card — the Automated-trading badge
            and Market-contracts icon render inline at the top via
            TradeModeToggle. */}
        <div className={settingsColClassName}>
          {isLoading ? (
            <Skeleton className={skeletonClassName} />
          ) : (
            <Card className={cardClassName}>
              <CardContent className={cardContentClassName}>
                <TradeModeToggle
                  label={label}
                  activeTradeType={activeTradeType}
                  onSelectTradeType={onSelectTradeType}
                />

                {children}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
