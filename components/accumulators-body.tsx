'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AccumulatorTradePanel } from '@/components/custom/accumulator-trade-panel';
import { AccumulatorAutomatedPanel } from '@/components/custom/accumulator-automated-panel';
import { TradeModeToggle } from '@/components/custom/trade-mode-toggle';
import { ModeRail } from '@/components/custom/mode-rail';
import { useMartingaleAutomation } from '@/hooks/use-martingale-automation';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useContractMarkers } from '@/hooks/use-contract-markers';
import type { ChartBarrier } from '@/components/custom/smart-chart';
import type { ActiveSymbol, ProposalInfo, BuyResult, DerivWS } from '@deriv/core';
import type { GrowthRate } from '@/lib/accumulator-types';
import type { AccumulatorProposalInfo } from '@/hooks/use-accumulator-proposal';
import type { UseSmartChartsApiReturn } from '@/hooks/use-smartcharts-api';
import type { SmartChartChartData } from '@/hooks/use-smartchart-chart-data';
import type { OpenPosition } from '@/lib/types';

const AccumulatorChart = dynamic(
  () => import('@/components/custom/accumulator-chart').then(m => m.AccumulatorChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse rounded-md border border-border/50 dark:border-white/[0.08] bg-muted/30" />
    ),
  }
);

export interface AccumulatorsBodyProps {
  ws: DerivWS | null;
  isConnected: boolean;
  isLoading: boolean;
  activeSymbol: ActiveSymbol | null;
  selectSymbol: (symbol: string) => void;

  growthRate: GrowthRate;
  setGrowthRate: (rate: GrowthRate) => void;
  growthRateOptions: { value: number; label: string }[];
  stake: string;
  setStake: (value: string) => void;
  takeProfit: string;
  setTakeProfit: (value: string) => void;
  proposal: AccumulatorProposalInfo | null;
  buyContract: () => Promise<void>;
  isBuying: boolean;
  buyResult: BuyResult | null;
  buyError: string | null;
  clearBuyResult: () => void;

  openPositions: OpenPosition[];
  sellContract: (contractId: number, bidPrice: string) => Promise<void>;
  sellingId: number | null;

  isAuthenticated: boolean;

  chartData: SmartChartChartData | undefined;
  getQuotes: UseSmartChartsApiReturn['getQuotes'];
  subscribeQuotes: UseSmartChartsApiReturn['subscribeQuotes'];
  unsubscribeQuotes: UseSmartChartsApiReturn['unsubscribeQuotes'];
}

export function AccumulatorsBody({
  isConnected,
  isLoading,
  activeSymbol,
  selectSymbol,
  growthRate,
  setGrowthRate,
  growthRateOptions,
  stake,
  setStake,
  takeProfit,
  setTakeProfit,
  proposal,
  buyContract,
  isBuying,
  buyResult,
  buyError,
  clearBuyResult,
  openPositions,
  sellContract,
  sellingId,
  isAuthenticated,
  chartData,
  getQuotes,
  subscribeQuotes,
  unsubscribeQuotes,
}: AccumulatorsBodyProps) {
  const isMobile = useIsMobile();
  const contractMarkers = useContractMarkers(openPositions, activeSymbol?.underlying_symbol, isMobile);
  const [tradeMode, setTradeMode] = useState<'manual' | 'automated'>('manual');

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

  const handleOpenBotLibrary = () => {
    // no-op for now
  };

  const activeAccuPosition = openPositions.find(
    (p) => p.contract_type === 'ACCU' && p.underlying_symbol === activeSymbol?.underlying_symbol
  ) ?? null;

  const barrierColor = proposal?.hasCrossedBarrier ? '#cc2e3d' : '#008832';

  const chartBarriers: ChartBarrier[] =
    proposal?.highBarrier && proposal?.lowBarrier
      ? [
          {
            shade: 'BETWEEN',
            high: proposal.highBarrier,
            low: proposal.lowBarrier,
            relative: false,
            draggable: false,
            hideBarrierLine: false,
            hideOffscreenBarrier: true,
            hideOffscreenLine: true,
            hidePriceLabel: false,
            color: barrierColor,
            shadeColor: barrierColor,
          },
        ]
      : [];

  return (
    <div className="flex w-full max-w-7xl mx-auto flex-col px-3 py-2 sm:px-4 sm:py-4 gap-2 sm:gap-3 max-lg:pb-32 lg:pb-6">
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_400px_auto] lg:gap-4">

        {/* Column 1: Chart */}
        <div className="flex flex-col gap-2 px-0 pt-2 lg:py-0">
          <div
            className="lg:h-[min(33.6rem,66vh)] lg:min-h-[384px]"
            style={{
              height: isMobile ? '360px' : undefined,
              touchAction: 'pan-y',
            }}
          >
            {chartData ? (
              <AccumulatorChart
                symbolKey="accumulator-chart"
                symbol={activeSymbol?.underlying_symbol}
                isConnectionOpened={isConnected}
                isMobile={isMobile}
                chartData={chartData}
                getQuotes={getQuotes}
                subscribeQuotes={subscribeQuotes}
                unsubscribeQuotes={unsubscribeQuotes}
                onSymbolChange={selectSymbol}
                barriers={chartBarriers}
                contractsArray={contractMarkers}
              />
            ) : (
              <Skeleton className="h-full w-full rounded-md" />
            )}
          </div>
        </div>

        {/* Column 2: Trade panel */}
        <div className="flex flex-col gap-3 pt-3 lg:pt-0 border-t border-border lg:border-0">
          {isLoading ? (
            <Skeleton className="lg:h-[min(33.6rem,66vh)] lg:min-h-[384px] h-48 w-full rounded-xl" />
          ) : (
            <Card className="lg:h-[min(33.6rem,66vh)] lg:min-h-[384px] lg:overflow-y-auto">
              <CardContent className="pt-4">
                <TradeModeToggle mode={tradeMode} onModeChange={handleModeChange} label="Accumulators" />

                {tradeMode === 'manual' ? (
                  <AccumulatorTradePanel
                    growthRate={growthRate}
                    onGrowthRateChange={setGrowthRate}
                    growthRateOptions={growthRateOptions}
                    isConnected={isConnected}
                    stake={stake}
                    onStakeChange={setStake}
                    takeProfit={takeProfit}
                    onTakeProfitChange={setTakeProfit}
                    proposal={proposal}
                    onBuy={buyContract}
                    isBuying={isBuying}
                    buyResult={buyResult}
                    buyError={buyError}
                    onClearBuyResult={clearBuyResult}
                    activePosition={activeAccuPosition}
                    onClose={sellContract}
                    isClosing={sellingId === activeAccuPosition?.contract_id}
                    isAuthenticated={isAuthenticated}
                  />
                ) : (
                  <AccumulatorAutomatedPanel
                    growthRate={growthRate}
                    onGrowthRateChange={setGrowthRate}
                    growthRateOptions={growthRateOptions}
                    takeProfit={takeProfit}
                    onTakeProfitChange={setTakeProfit}
                    isConnected={isConnected}
                    isAuthenticated={isAuthenticated}
                    automation={automation}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Column 3: Mode rail (desktop only) */}
        <ModeRail mode={tradeMode} onModeChange={handleModeChange} onOpenBotLibrary={handleOpenBotLibrary} />
      </div>
    </div>
  );
}
