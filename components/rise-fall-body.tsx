'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BotLibraryPanel } from '@/components/custom/bot-library-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useContractMarkers } from '@/hooks/use-contract-markers';
import { TradeControls } from './trade-controls';
import { AutomatedPanel } from '@/components/custom/automated-panel';
import { TradeBody } from './trade-body';
import { useMartingaleAutomation } from '../hooks/use-martingale-automation';
import type { MartingaleSettings, StrategyId } from '../hooks/use-martingale-automation';
import type { StrategyProgram } from '@deriv/core';
import type {
  ActiveSymbol,
  ProposalInfo,
  BuyResult,
  DerivWS,
} from '@deriv/core';
import type { Direction, DurationSelectUnit, DurationOption } from '../lib/types';
import type { UseSmartChartsApiReturn } from '@/hooks/use-smartcharts-api';
import type { SmartChartChartData } from '@/hooks/use-smartchart-chart-data';
import type { OpenPosition } from '../lib/types';

const RiseFallChart = dynamic(() => import('./rise-fall-chart').then(m => m.RiseFallChart), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-md border border-border/50 dark:border-white/[0.08] bg-muted/30" />
  ),
});

export interface RiseFallBodyProps {
  ws: DerivWS | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  activeSymbol: ActiveSymbol | null;
  selectSymbol: (symbol: string) => void;
  direction: Direction;
  setDirection: (direction: Direction) => void;
  allowEquals: boolean;
  setAllowEquals: (value: boolean) => void;
  stake: string;
  onStakeChange: (value: string) => void;
  duration: number;
  setDuration: (value: number) => void;
  durationOptions: DurationOption[];
  durationUnit: DurationSelectUnit;
  setDurationUnit: (unit: DurationSelectUnit) => void;
  endDate: Date | undefined;
  setEndDate: (date: Date | undefined) => void;
  endTime: string;
  setEndTime: (time: string) => void;
  proposal: ProposalInfo | null;
  buyContract: () => Promise<void>;
  isBuying: boolean;
  buyResult: BuyResult | null;
  buyError: string | null;
  clearBuyResult: () => void;
  openPositions: OpenPosition[];
  sellContract: (contractId: number, bidPrice: string) => Promise<void>;
  sellingId: number | null;
  chartData: SmartChartChartData | undefined;
  getQuotes: UseSmartChartsApiReturn['getQuotes'];
  subscribeQuotes: UseSmartChartsApiReturn['subscribeQuotes'];
  unsubscribeQuotes: UseSmartChartsApiReturn['unsubscribeQuotes'];
  isLive?: boolean;
  endEpoch?: number;
  isAuthenticated?: boolean;
  activeTradeType?: string;
  onSelectTradeType?: (type: string) => void;
}

export function RiseFallBody({
  ws,
  isConnected,
  isLoading,
  error,
  activeSymbol,
  selectSymbol,
  direction,
  setDirection,
  allowEquals,
  setAllowEquals,
  stake,
  onStakeChange,
  duration,
  setDuration,
  durationOptions,
  durationUnit,
  setDurationUnit,
  endDate,
  setEndDate,
  endTime,
  setEndTime,
  proposal,
  buyContract,
  isBuying,
  buyResult,
  buyError,
  clearBuyResult,
  openPositions,
  sellContract,
  sellingId,
  chartData,
  getQuotes,
  subscribeQuotes,
  unsubscribeQuotes,
  isLive,
  endEpoch,
  isAuthenticated,
  activeTradeType,
  onSelectTradeType,
}: RiseFallBodyProps) {
  const isMobile = useIsMobile();
  const contractMarkers = useContractMarkers(openPositions, activeSymbol?.underlying_symbol, isMobile);
  const [tradeMode, setTradeMode] = useState<'manual' | 'automated'>('manual');
  const [isBotLibraryOpen, setIsBotLibraryOpen] = useState(false);

  const automation = useMartingaleAutomation({
    isConnected,
    isAuthenticated: !!isAuthenticated,
    stake,
    setStake: onStakeChange,
    proposal,
    buyContract,
    isBuying,
    buyResult,
    buyError,
    clearBuyResult,
    openPositions,
  });

  const handleModeChange = (mode: 'manual' | 'automated') => {
    if (mode === 'manual' && automation.isRunning) automation.stop();
    setTradeMode(mode);
  };

  const handleSelectBot = (program: StrategyProgram) => {
    if (automation.isRunning) automation.stop();
    const strategyId: StrategyId = program.stakeRule.type === 'dalembert' ? 'dalembert' : 'martingale';
    const nextSettings: MartingaleSettings = {
      strategyId,
      baseStake: program.baseStake,
      multiplier: program.stakeRule.type === 'martingale' ? program.stakeRule.multiplier : 2,
      stakeIncrement: program.stakeRule.type === 'dalembert' ? program.stakeRule.increment : 2,
      maxStake: program.stakeRule.type !== 'fixed' ? program.stakeRule.maxStake ?? null : null,
      profitThreshold: program.profitThreshold,
      lossThreshold: program.lossThreshold,
    };
    automation.setSettings(nextSettings);
    setDirection(program.direction);
    setAllowEquals(program.allowEquals ?? allowEquals);
    setTradeMode('automated');
    setIsBotLibraryOpen(false);
  };

  // Buy purchase-result toasts — same pattern as Accumulators and Digits.
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

  // NOTE: previously this error state replaced the entire page (its own
  // full-screen <main>, no Header/Footer). Header/Footer now live in
  // page.tsx around every body component, same as Digits/Accumulators, so
  // this renders inside that shell instead of taking over the screen.
  // Flagging this in case you want the old full-screen behavior back.
  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Connection Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const chart = chartData ? (
    <RiseFallChart
      symbolKey="rise-fall-chart"
      symbol={activeSymbol?.underlying_symbol}
      isConnectionOpened={isConnected}
      isMobile={isMobile}
      chartData={chartData}
      getQuotes={getQuotes}
      subscribeQuotes={subscribeQuotes}
      unsubscribeQuotes={unsubscribeQuotes}
      onSymbolChange={selectSymbol}
      isLive={isLive}
      endEpoch={endEpoch}
      contractsArray={contractMarkers}
    />
  ) : (
    <Skeleton className="h-full w-full rounded-md" />
  );

  // Buy button copy stays Rise/Fall's own (payout shown under "Buy") — only
  // the shared wrapper/sizing/placement now comes from TradeBody, same as
  // Digits keeps its own "Buy @ X USD" copy.
  const buyButton = (
    <div className="w-full mb-3 max-lg:relative max-lg:z-[9999]">
      <Button
        className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs"
        disabled={!isConnected || !proposal || isBuying}
        onClick={buyContract}
      >
        {isBuying ? (
          'Purchasing...'
        ) : (
          <span className="flex flex-col items-center leading-tight gap-0.5">
            <span>Buy</span>
            {proposal && (
              <span className="text-[9px] font-normal opacity-90">
                {proposal.payout.toFixed(2)} USD
              </span>
            )}
          </span>
        )}
      </Button>
    </div>
  );

  return (
    <>
      <TradeBody
        chart={chart}
        isLoading={isLoading}
        tradeMode={tradeMode}
        onModeChange={handleModeChange}
        onOpenBotLibrary={() => setIsBotLibraryOpen(true)}
        activeTradeType={activeTradeType}
        onSelectTradeType={onSelectTradeType}
        buyButton={buyButton}
      >
        {tradeMode === 'manual' ? (
          <TradeControls
            direction={direction}
            onDirectionChange={setDirection}
            allowEquals={allowEquals}
            onAllowEqualsChange={setAllowEquals}
            isConnected={isConnected}
            stake={stake}
            onStakeChange={onStakeChange}
            duration={duration}
            onDurationChange={setDuration}
            durationOptions={durationOptions}
            durationUnit={durationUnit}
            onDurationUnitChange={setDurationUnit}
            endDate={endDate}
            onEndDateChange={setEndDate}
            endTime={endTime}
            onEndTimeChange={setEndTime}
            ws={ws}
            activeSymbol={activeSymbol}
            proposal={proposal}
            isAuthenticated={isAuthenticated}
          />
        ) : (
          <AutomatedPanel
            direction={direction}
            onDirectionChange={setDirection}
            allowEquals={allowEquals}
            onAllowEqualsChange={setAllowEquals}
            isConnected={isConnected}
            isAuthenticated={!!isAuthenticated}
            automation={automation}
          />
        )}
      </TradeBody>

      <BotLibraryPanel
        open={isBotLibraryOpen}
        onClose={() => setIsBotLibraryOpen(false)}
        onSelectBot={handleSelectBot}
      />
    </>
  );
}
