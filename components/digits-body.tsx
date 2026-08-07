'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DigitTradePanel } from '@/components/custom/digit-trade-panel';
import { DigitAutomatedPanel } from '@/components/custom/digit-automated-panel';
import { DigitEntryAutomatedPanel } from '@/components/custom/digit-entry-automated-panel';
import { TradeModeToggle } from '@/components/custom/trade-mode-toggle';
import { ModeRail } from '@/components/custom/mode-rail';
import { useMartingaleAutomation } from '@/hooks/use-martingale-automation';
import { useDigitsEntryAutomation } from '@/hooks/use-digits-entry-automation';
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
  lastDigit: number | null;
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
  lastDigit,
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

  // Martingale automation — used for Matches/Differs and Even/Odd, unchanged.
  const martingaleAutomation = useMartingaleAutomation({
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

  // Entry-watcher automation — used only for Over/Under. Places no trade on
  // Start; arms and watches the digit stream, fires once the trigger digit
  // lands, then lets the contract settle on its own.
  const overUnderAutomation = useDigitsEntryAutomation({
    isConnected,
    isAuthenticated,
    contractMode,
    selectedDigit,
    lastDigit,
    proposal,
    buyContract,
    isBuying,
    buyResult,
    buyError,
    clearBuyResult,
    openPositions,
  });

  const isOverUnder = tradeType === 'over-under';
  const activeIsRunning = isOverUnder ? overUnderAutomation.isRunning : martingaleAutomation.isRunning;

  const handleModeChange = (mode: 'manual' | 'automated') => {
    if (mode === 'manual' && activeIsRunning) {
      if (isOverUnder) {
        overUnderAutomation.stop('Stopped manually');
      } else {
        martingaleAutomation.stop();
      }
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
    <div className="flex w-full flex-col px-3 py-2 sm:px-4 sm:py-4 gap-2 sm:gap-3 max-lg:pb-32 lg:pb-2 lg:px-3 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_300px_auto] lg:gap-3 lg:h-full lg:min-h-0">
        {/* Column 1: Chart — same component as Rise/Fall, fed by the digits connection */}
        <div className="flex flex-col gap-2 px-0 pt-2 lg:py-0 lg:h-full lg:min-h-0">
          <div
            className="h-[70vh] min-h-[420px] max-h-[640px] lg:h-full lg:min-h-0 lg:max-h-none"
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

        {/* Column 2: Trade panel in a Card, matching Rise/Fall's panel shape — narrowed to 300px */}
        <div className="flex flex-col gap-3 pt-3 lg:pt-0 border-t border-border lg:border-0 lg:h-full lg:min-h-0">
          {isLoading ? (
            <Skeleton className="lg:h-full h-48 w-full rounded-xl" />
          ) : (
            <Card className="lg:h-full lg:min-h-0 lg:overflow-y-auto">
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
                    lastDigit={lastDigit}
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
                ) : isOverUnder ? (
                  <DigitEntryAutomatedPanel
                    contractMode={contractMode}
                    onContractModeChange={setContractMode}
                    digitStats={digitStats}
                    lastDigit={lastDigit}
                    selectedDigit={selectedDigit}
                    onSelectedDigitChange={setSelectedDigit}
                    stake={stake}
                    onStakeChange={setStake}
                    duration={duration}
                    onDurationChange={setDuration}
                    durationLimits={durationLimits}
                    isConnected={isConnected}
                    isAuthenticated={isAuthenticated}
                    automation={overUnderAutomation}
                  />
                ) : (
                  <DigitAutomatedPanel
                    tradeType={tradeType}
                    contractMode={contractMode}
                    onContractModeChange={setContractMode}
                    digitStats={digitStats}
                    lastDigit={lastDigit}
                    selectedDigit={selectedDigit}
                    onSelectedDigitChange={setSelectedDigit}
                    isConnected={isConnected}
                    isAuthenticated={isAuthenticated}
                    automation={martingaleAutomation}
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
