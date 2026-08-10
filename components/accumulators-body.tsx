'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AccumulatorTradePanel } from '@/components/custom/accumulator-trade-panel';
import { AccumulatorAutomatedPanel } from '@/components/custom/accumulator-automated-panel';
import { TradeModeToggle } from '@/components/custom/trade-mode-toggle';
import { useAccumulatorAutomation } from '@/hooks/use-accumulator-automation';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useContractMarkers } from '@/hooks/use-contract-markers';
import type { ChartBarrier } from '@/components/custom/smart-chart';
import type { ActiveSymbol, BuyResult, DerivWS, Tick } from '@deriv/core';
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
  /** Live market tick stream — passed to the automation hook for tick counting. */
  currentTick: Tick | null;
  openPositions: OpenPosition[];
  sellContract: (contractId: number, bidPrice: string) => Promise<void>;
  sellingId: number | null;
  sellError: string | null;
  clearSellError: () => void;
  isAuthenticated: boolean;
  chartData: SmartChartChartData | undefined;
  getQuotes: UseSmartChartsApiReturn['getQuotes'];
  subscribeQuotes: UseSmartChartsApiReturn['subscribeQuotes'];
  unsubscribeQuotes: UseSmartChartsApiReturn['unsubscribeQuotes'];
  /** Currently selected trade type across the whole app (rise-fall,
   * accumulators, matches-differs, etc) and the setter for it — passed
   * down to TradeModeToggle so the "Market contracts" menu can switch tabs. */
  activeTradeType?: string;
  onSelectTradeType?: (type: string) => void;
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
  currentTick,
  openPositions,
  sellContract,
  sellingId,
  sellError,
  clearSellError,
  isAuthenticated,
  chartData,
  getQuotes,
  subscribeQuotes,
  unsubscribeQuotes,
  activeTradeType,
  onSelectTradeType,
}: AccumulatorsBodyProps) {
  const isMobile = useIsMobile();
  const contractMarkers = useContractMarkers(openPositions, activeSymbol?.underlying_symbol, isMobile);
  const [tradeMode, setTradeMode] = useState<'manual' | 'automated'>('manual');

  const automation = useAccumulatorAutomation({
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
    currentTick,
    openPositions,
    sellContract,
    sellingId,
    sellError,
    clearSellError,
  });

  const handleModeChange = (mode: 'manual' | 'automated') => {
    if (mode === 'manual' && automation.isRunning) {
      automation.stop('Stopped manually');
    }
    setTradeMode(mode);
  };

  const handleOpenBotLibrary = () => {};

  const activeAccuPosition = openPositions.find(
    (p) => p.contract_type === 'ACCU' && p.underlying_symbol === activeSymbol?.underlying_symbol
  ) ?? null;

  // Buy/Close purchase-result toasts — previously lived inside
  // AccumulatorTradePanel alongside the Buy button; moved here with the
  // button itself so both stay together.
  useEffect(() => {
    if (buyError) {
      toast.error('Purchase Failed', { description: buyError });
      clearBuyResult();
    }
  }, [buyError, clearBuyResult]);

  useEffect(() => {
    if (buyResult) {
      toast.success('Contract Purchased', {
        description: `Buy price: ${buyResult.buyPrice.toFixed(2)} USD | Payout: ${buyResult.payout.toFixed(2)} USD | Balance: ${buyResult.balanceAfter.toFixed(2)} USD`,
      });
      clearBuyResult();
    }
  }, [buyResult, clearBuyResult]);

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
    <div className="flex w-full flex-col px-3 py-2 sm:px-4 sm:py-4 gap-2 sm:gap-3 max-lg:pb-16 lg:pb-2 lg:px-3 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_240px] lg:gap-3 lg:h-full lg:min-h-0">
        <div className="flex flex-col gap-2 px-0 pt-2 lg:py-0 lg:h-full lg:min-h-0">
          <div
            className="lg:h-full lg:min-h-0"
            style={{
              height: isMobile ? 'calc(100dvh - 150px)' : undefined,
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

        {/* Trade panel — the Manual/Automated/Bot-library icons now render
            inline at the top of the card via TradeModeToggle, so this
            column no longer shares width with a separate rail column. */}
        <div className="flex flex-col gap-3 pt-3 lg:pt-0 border-t border-border lg:border-0 lg:h-full lg:min-h-0">
          {isLoading ? (
            <Skeleton className="lg:h-full h-48 w-full rounded-xl" />
          ) : (
            <Card className="lg:h-full lg:min-h-0 lg:overflow-y-auto">
              <CardContent className="pt-4">
                <TradeModeToggle
                  mode={tradeMode}
                  onModeChange={handleModeChange}
                  onOpenBotLibrary={handleOpenBotLibrary}
                  label="Accumulators"
                  activeTradeType={activeTradeType}
                  onSelectTradeType={onSelectTradeType}
                />

                {/* Buy / Close button — moved here so it sits right after
                    Market contracts / the mode row instead of at the
                    bottom of the panel, manual mode only (automated mode
                    manages its own buy/sell via the automation panel). */}
                {tradeMode === 'manual' && (
                  <div className="w-full mb-3">
                    {!activeAccuPosition && (
                      <Button
                        className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs"
                        disabled={!isConnected || !proposal || isBuying}
                        onClick={buyContract}
                      >
                        {isBuying ? 'Purchasing...' : 'Buy'}
                      </Button>
                    )}

                    {activeAccuPosition && (
                      <Button
                        variant="outline"
                        className="w-full rounded-full border-black bg-white text-black hover:bg-white hover:text-black dark:border-white dark:bg-transparent dark:text-white dark:hover:bg-white/10 h-8 text-xs"
                        disabled={!isConnected || sellingId === activeAccuPosition.contract_id || !activeAccuPosition.is_valid_to_sell}
                        onClick={() => sellContract(activeAccuPosition.contract_id, activeAccuPosition.bid_price)}
                      >
                        {sellingId === activeAccuPosition.contract_id ? 'Closing...' : (
                          <span className="flex flex-col items-center leading-tight gap-0.5">
                            <span>Close</span>
                            <span className="text-[10px] font-normal opacity-90">
                              {(parseFloat(activeAccuPosition.buy_price) + parseFloat(activeAccuPosition.profit)).toFixed(2)} {activeAccuPosition.currency}
                            </span>
                          </span>
                        )}
                      </Button>
                    )}
                  </div>
                )}

                {tradeMode === 'manual' ? (
                  <AccumulatorTradePanel
                    growthRate={growthRate}
                    onGrowthRateChange={setGrowthRate}
                    growthRateOptions={growthRateOptions}
                    stake={stake}
                    onStakeChange={setStake}
                    takeProfit={takeProfit}
                    onTakeProfitChange={setTakeProfit}
                    proposal={proposal}
                    activePosition={activeAccuPosition}
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
      </div>
    </div>
  );
}
