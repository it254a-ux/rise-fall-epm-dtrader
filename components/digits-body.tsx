'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DigitTradePanel } from '@/components/custom/digit-trade-panel';
import type { ActiveSymbol, ProposalInfo, DurationLimits, BuyResult, DerivWS } from '@deriv/core';
import type { ContractMode, TradeType, DigitStats } from '@/lib/digit-types';
import type { UseSmartChartsApiReturn } from '@/hooks/use-smartcharts-api';
import type { SmartChartChartData } from '@/hooks/use-smartchart-chart-data';

const RiseFallChart = dynamic(() => import('@/components/rise-fall-chart').then(m => m.RiseFallChart), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-md border border-border/50 dark:border-white/[0.08] bg-muted/30" />
  ),
});

export interface DigitsBodyProps {
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

  // Chart data (mirrors RiseFallView's props, fed by the digits ws in page.tsx)
  chartData: SmartChartChartData | undefined;
  getQuotes: UseSmartChartsApiReturn['getQuotes'];
  subscribeQuotes: UseSmartChartsApiReturn['subscribeQuotes'];
  unsubscribeQuotes: UseSmartChartsApiReturn['unsubscribeQuotes'];
}

export function DigitsBody({
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
  chartData,
  getQuotes,
  subscribeQuotes,
  unsubscribeQuotes,
}: DigitsBodyProps) {
  return (
    <div className="flex w-full max-w-7xl mx-auto flex-col max-lg:px-0 max-lg:py-0 px-3 py-2 sm:px-4 sm:py-4 gap-2 sm:gap-3 max-lg:flex-1 max-lg:min-h-0 max-lg:overflow-hidden lg:flex-none lg:overflow-visible">
      <div className="max-lg:flex max-lg:flex-col max-lg:flex-1 max-lg:min-h-0 lg:grid lg:grid-cols-[1fr_400px] lg:gap-4">
        {/* Column 1: Chart — same component as Rise/Fall, fed by the digits connection */}
        <div className="max-lg:shrink-0 flex flex-col gap-2 max-lg:px-3 max-lg:pb-2 pt-2 lg:py-0">
          <div className="max-lg:h-[45dvh] lg:h-[min(33.6rem,66vh)] lg:min-h-[384px]">
            {chartData ? (
              <RiseFallChart
                symbolKey="digits-chart"
                symbol={activeSymbol?.underlying_symbol}
                isConnectionOpened={isConnected}
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
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
