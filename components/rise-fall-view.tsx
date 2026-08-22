'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/custom/footer';
import { Header } from '@/components/custom/header';
import { BotLibraryPanel } from '@/components/custom/bot-library-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useContractMarkers } from '@/hooks/use-contract-markers';
import { TradeControls } from './trade-controls';
import { AutomatedPanel } from '@/components/custom/automated-panel';
import { TradeModeToggle } from '@/components/custom/trade-mode-toggle';
import { useMartingaleAutomation } from '../hooks/use-martingale-automation';
import type { MartingaleSettings, StrategyId } from '../hooks/use-martingale-automation';
import type { StrategyProgram } from '@deriv/core';
import type {
  AuthState,
  DerivAccount,
  ActiveSymbol,
  ProposalInfo,
  BuyResult,
  DerivWS,
} from '@deriv/core';
import type { Direction, DurationSelectUnit, DurationOption } from '../lib/types';
import type { UseSmartChartsApiReturn } from '@/hooks/use-smartcharts-api';
import type { SmartChartChartData } from '@/hooks/use-smartchart-chart-data';
import type { OpenPosition } from '../lib/types';
import type { OpenSymbolTab } from '@/hooks/use-symbol-tabs';

const RiseFallChart = dynamic(() => import('./rise-fall-chart').then(m => m.RiseFallChart), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-md border border-border/50 dark:border-white/[0.08] bg-muted/30" />
  ),
});

export interface RiseFallViewProps {
  authState: AuthState;
  accounts: DerivAccount[];
  activeAccount: DerivAccount | null;
  onLogin: () => Promise<void>;
  onSignUp: () => Promise<void>;
  onLogout: () => void;
  onSwitchAccount: (accountId: string) => Promise<void>;
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
  logoSrc?: string;
  appName?: string;
  activeTradeType?: string;
  onSelectTradeType?: (type: string) => void;
  // Forwarded straight through to <Header> — this component holds no
  // symbol-tab state of its own; whoever renders <RiseFallView> owns the
  // useSymbolTabs() call and supplies these, same as every other prop here.
  symbolTabs: OpenSymbolTab[];
  activeSymbolTabId: string;
  onSelectSymbolTab: (id: string) => void;
  onCloseSymbolTab: (id: string) => void;
  browsableSymbols: ActiveSymbol[];
  isBrowsableSymbolsLoading?: boolean;
  onPickSymbol: (symbol: string, displayName: string) => void;
}

export function RiseFallView({
  authState,
  accounts,
  activeAccount,
  onLogin,
  onSignUp,
  onLogout,
  onSwitchAccount,
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
  chartData,
  getQuotes,
  subscribeQuotes,
  unsubscribeQuotes,
  isLive,
  endEpoch,
  logoSrc,
  appName,
  activeTradeType,
  onSelectTradeType,
  symbolTabs,
  activeSymbolTabId,
  onSelectSymbolTab,
  onCloseSymbolTab,
  browsableSymbols,
  isBrowsableSymbolsLoading,
  onPickSymbol,
}: RiseFallViewProps) {
  const isMobile = useIsMobile();
  const contractMarkers = useContractMarkers(openPositions, activeSymbol?.underlying_symbol, isMobile);
  const [tradeMode, setTradeMode] = useState<'manual' | 'automated'>('manual');
  const [isBotLibraryOpen, setIsBotLibraryOpen] = useState(false);
  const isAuthenticated = authState === 'authenticated';

  const automation = useMartingaleAutomation({
    isConnected,
    isAuthenticated,
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

  // Buy purchase-result toasts — previously lived inside TradeControls
  // alongside the Buy button; moved here with the button itself, same
  // pattern as Accumulators and Digits.
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

  if (error) {
    return (
      <main className="flex flex-col bg-background items-center justify-center px-4 min-h-dvh">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Connection Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <>
      <main
        className="flex flex-col bg-background h-dvh overflow-hidden"
        style={{
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }}
      >
        <Header
          authState={authState}
          accounts={accounts}
          activeAccount={activeAccount}
          onLogin={onLogin}
          onSignUp={onSignUp}
          onLogout={onLogout}
          onSwitchAccount={onSwitchAccount}
          logoSrc={logoSrc}
          appName={appName}
          activeTradeType={activeTradeType}
          onSelectTradeType={onSelectTradeType}
          symbolTabs={symbolTabs}
          activeSymbolTabId={activeSymbolTabId}
          onSelectSymbolTab={onSelectSymbolTab}
          onCloseSymbolTab={onCloseSymbolTab}
          browsableSymbols={browsableSymbols}
          isBrowsableSymbolsLoading={isBrowsableSymbolsLoading}
          onPickSymbol={onPickSymbol}
        />
        <div className={authState === 'authenticated' ? 'h-[40px] shrink-0' : 'h-[36px] shrink-0'} />

        {/* Page content — fills all remaining viewport height and scrolls
            internally only if content overflows. Bottom padding on mobile
            reserves space so the fixed Buy button and footer never cover the
            last elements (e.g. "View your positions" link). */}
        <div className="flex w-full max-w-7xl mx-auto flex-col px-3 py-2 sm:px-4 sm:py-4 gap-4 sm:gap-3 max-lg:pb-8 lg:pb-2 flex-1 min-h-0 overflow-y-auto">
          {/* FIX: added `gap-3` so there is breathing room between the chart
              and the trade-controls card on mobile. Previously this only had
              `lg:gap-4`, meaning phones got a 0px gap — the trade panel sat
              flush against the chart's bottom axis labels, causing the
              crowded/overlapping look reported on mobile. */}
          <div className="flex flex-col gap-3 flex-1 min-h-0 lg:grid lg:grid-cols-[1fr_240px] lg:gap-4 lg:h-full">

            {/* Column 1: Chart — touch-action:pan-y lets vertical swipes scroll the page */}
            <div className="flex flex-col gap-2 px-0 pt-2 lg:py-0 flex-1 min-h-0 lg:h-full">
              <div
                className="flex-1 min-h-[420px] lg:h-full lg:min-h-[384px] overflow-hidden relative"
                style={{ touchAction: 'pan-y' }}
              >
                {chartData ? (
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
                )}
              </div>
            </div>

            {/* Column 2: Trade controls — the Manual/Automated/Bot-library
                icons now render inline at the top of the card via
                TradeModeToggle, so this column no longer shares width with a
                separate rail column. */}
            <div className="flex flex-col gap-3 pt-3 lg:pt-0 border-t border-border lg:border-0 lg:h-full lg:min-h-0">
              {isLoading ? (
                <Skeleton className="lg:h-full lg:min-h-[384px] h-48 w-full rounded-xl" />
              ) : (
                <Card className="lg:h-full lg:min-h-[384px] lg:overflow-y-auto">
                  <CardContent className="px-3 pt-4 pb-6 lg:px-6">
                    <TradeModeToggle
                      mode={tradeMode}
                      onModeChange={handleModeChange}
                      onOpenBotLibrary={() => setIsBotLibraryOpen(true)}
                      activeTradeType={activeTradeType}
                      onSelectTradeType={onSelectTradeType}
                    />

                    {/* Buy button — moved here so it sits right after
                        Market contracts / the mode row, before the rest of
                        the trade settings, matching Accumulators/Digits.
                        Manual mode only — the automated panel manages its
                        own start/stop via the automation hook. */}
                    {tradeMode === 'manual' && (
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
                    )}

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

        {/* Footer — fixed on mobile so it never gets pushed off-screen by the
            fixed Buy button; the pb-16 above keeps content clear of both. */}
        <div className="max-lg:fixed max-lg:bottom-0 max-lg:left-0 max-lg:right-0 py-1 text-center bg-background/80 backdrop-blur-sm lg:bg-transparent lg:static lg:py-0.5">
          <Footer />
        </div>
      </main>

      <BotLibraryPanel
        open={isBotLibraryOpen}
        onClose={() => setIsBotLibraryOpen(false)}
        onSelectBot={handleSelectBot}
      />
    </>
  );
}
