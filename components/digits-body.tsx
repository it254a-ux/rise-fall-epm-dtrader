'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DigitTradePanel } from '@/components/custom/digit-trade-panel';
import { DigitAutomatedPanel } from '@/components/custom/digit-automated-panel';
import { TradeModeToggle } from '@/components/custom/trade-mode-toggle';
import { ModeRail } from '@/components/custom/mode-rail';
import { useMartingaleAutomation } from '@/hooks/use-martingale-automation';
import type { AuthState, ActiveSymbol, ProposalInfo, DurationLimits, BuyResult, DerivWS } from '@deriv/core';
import type { ContractMode, TradeType, DigitStats } from '@/lib/digit-types';
import type { UseSmartChartsApiReturn } from '@/hooks/use-smartcharts-api';
import type { SmartChartChartData } from '@/hooks/use-smartchart-chart-data';
import type { OpenPosition } from '@/lib/types';

const RiseFallChart = dynamic(() => import('@/components/rise-fall-chart').then(m => m.RiseFallChart), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-md border border-border/50 dark:border-white/[0.08] bg-muted/30" />
  ),
});

const TRADE_TYPE_LABELS: Record<TradeType, string> = {
  'matches-differs': 'Matches/Differs',
  'over-under': 'Over/Under',
  'even-odd': 'Even/Odd',
};

export interface DigitsBodyProps {
  authState: AuthState;
  isConnected: boolean;
  isLoading: boolean;
  ws: DerivWS | null;
  activeSymbol: ActiveSymbol | null;
  selectSymbol: (symbol: string) => void;
  digitStats: DigitStats;
  tradeType: TradeType;
  setTradeType: (type: TradeType) => void;
  contractMode: ContractMode;
  setContractMode: (mode: ContractMode) => void;
  selectedDigit: number;
  setSelectedDigit: (digit: number) => void;
  stake: string;
  setStake: (value: string) => void;
  duration: number;
  setDuration: (value: number) => void;
  durationLimits: DurationLimits;
  proposal: ProposalInfo | null;
  isProposalLoading: boolean;
  buyContract: () => Promise<void>;
  isBuying: boolean;
  buyResult: BuyResult | null;
  buyError: string | null;
  clearBuyResult: () => void;
  openPositions: OpenPosition[];

  // Chart data (mirrors RiseFallView's props, fed by the digits ws in page.tsx)
  chartData: SmartChartChartData | undefined;
  getQuotes: UseSmartChartsApiReturn['getQuotes'];
  subscribeQuotes: UseSmartChartsApiReturn['subscribeQuotes'];
  unsubscribeQuotes: UseSmartChartsApiReturn['unsubscribeQuotes'];

  // Trade type tabs (shared header owns the actual tab list; this lets a
  // selected bot — once digit bots exist — force the tab to match the bot)
  onSelectTradeType?: (type: string) => void;
}

export function DigitsBody({
  authState,
  isConnected,
  isLoading,
  activeSymbol,
  selectSymbol,
  digitStats,
  tradeType,
  contractMode,
  setContractMode,
  selectedDigit,
  setSelectedDigit,
  stake,
  setStake,
  duration,
  setDuration,
  durationLimits,
  proposal,
  isProposalLoading,
  buyContract,
  isBuying,
  buyResult,
  buyError,
  clearBuyResult,
  openPositions,
  chartData,
  getQuotes,
  subscribeQuotes,
  unsubscribeQuotes,
}: DigitsBodyProps) {
  const [tradeMode, setTradeMode] = useState<'manual' | 'automated'>('manual');
  const isAuthenticated = authState === 'authenticated';
  const isMobile = useIsMobile();

  const automation = useMartingaleAutomation({
    isConnected,
    isAuthenticated,
    stake,
    setStake,
    proposal,
    buyContract,
    isBuying,
    buyResult,
    buyError,
    clearBuyResult,
    openPositions,
  });

  const handleModeChange = (mode: 'manual' | 'automated') => {
    if (mode === 'manual' && automation.isRunning) {
      automation.stop();
    }
    setTradeMode(mode);
  };

  // TODO(D6): BOT_LIBRARY currently only contains Rise/Fall-shaped programs
  // (direction/duration/durationUnit, no contractMode/digit fields), so
  // there's nothing safe to apply to digit contracts yet. Wire this once
  // digit bots exist in lib/bots-library.ts.
  const handleOpenBotLibrary = () => {
    // no-op for now — see TODO above
  };

  return (
    <div className="flex w-full max-w-7xl mx-auto flex-col max-lg:px-0 max-lg:py-0 px-3 py-2 sm:px-4 sm:py-4 gap-2 sm:gap-3 max-lg:flex-1 max-lg:min-h-0 max-lg:overflow-hidden lg:flex-none lg:overflow-visible">
      <div className="max-lg:flex max-lg:flex-col max-lg:flex-1 max-lg:min-h-0 lg:grid lg:grid-cols-[1fr_400px_auto] lg:gap-4">
        {/* Column 1: Chart — same component as Rise/Fall, fed by the digits connection */}
        <div className="max-lg:shrink-0 flex flex-col gap-2 max-lg:px-3 max-lg:pb-2 pt-2 lg:py-0">
          <div
            className="h-[70vh] min-h-[420px] max-h-[640px] lg:h-[min(33.6rem,66vh)] lg:min-h-[384px] lg:max-h-none"
            style={{ touchAction: 'pan-y' }}
          >
            {chartData ? (
              <RiseFallChart
                symbolKey="digits-chart"
                symbol={activeSymbol?.underlying_symbol}
                isConnectionOpened={isConnected}
                isMobile={isMobile}
                chartData={chartData}
                getQuotes={getQuotes}
                subscribeQuotes={subscribeQuotes}
                unsubscribeQuotes={unsubscribeQuotes}
                onSymbolChange={selectSymbol}
                contractsArray={[]}
              />
            ) : (
              <Skeleton className="h-full w-full rounded-md" />
            )}
          </div>
        </div>

        {/* Column 2: Trade panel in a Card, matching Rise/Fall's panel shape */}
        <div className="max-lg:flex-1 max-lg:min-h-0 max-lg:overflow-y-auto max-lg:overscroll-contain max-lg:px-3 max-lg:border-t max-lg:border-border max-lg:pt-3 max-lg:pb-28 lg:pt-0 flex flex-col gap-3">
          {isLoading ? (
            <Skeleton className="lg:h-[min(33.6rem,66vh)] lg:min-h-[384px] max-lg:h-48 w-full rounded-xl" />
          ) : (
            <Card className="lg:h-[min(33.6rem,66vh)] lg:min-h-[384px] lg:overflow-y-auto">
              <CardContent className="pt-4">
                <TradeModeToggle
                  mode={tradeMode}
                  onModeChange={handleModeChange}
                  label={TRADE_TYPE_LABELS[tradeType]}
                />

                {tradeMode === 'manual' ? (
                  <DigitTradePanel
                    tradeType={tradeType}
                    contractMode={contractMode}
                    onContractModeChange={setContractMode}
                    digitStats={digitStats}
                    selectedDigit={selectedDigit}
                    onSelectedDigitChange={setSelectedDigit}
                    isConnected={isConnected}
                    stake={stake}
                    onStakeChange={setStake}
                    duration={duration}
                    onDurationChange={setDuration}
                    durationLimits={durationLimits}
                    proposal={proposal}
                    isProposalLoading={isProposalLoading}
                    onBuy={buyContract}
                    isBuying={isBuying}
                    buyResult={buyResult}
                    buyError={buyError}
                    onClearBuyResult={clearBuyResult}
                  />
                ) : (
                  <DigitAutomatedPanel
                    tradeType={tradeType}
                    contractMode={contractMode}
                    onContractModeChange={setContractMode}
                    digitStats={digitStats}
                    selectedDigit={selectedDigit}
                    onSelectedDigitChange={setSelectedDigit}
                    isConnected={isConnected}
                    isAuthenticated={isAuthenticated}
                    automation={automation}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Column 3: floating Manual/Automated rail (desktop only) */}
        <ModeRail mode={tradeMode} onModeChange={handleModeChange} onOpenBotLibrary={handleOpenBotLibrary} />
      </div>
    </div>
  );
}
