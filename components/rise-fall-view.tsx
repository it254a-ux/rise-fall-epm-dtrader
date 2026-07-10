'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Footer } from '@/components/custom/footer';
import { Header } from '@/components/custom/header';
import { ModeRail } from '@/components/custom/mode-rail';
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
        className="flex flex-col bg-background max-lg:h-dvh max-lg:overflow-y-auto lg:min-h-dvh lg:overflow-visible"
        style={{ overflowX: 'hidden' }}
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
        />
        <div className={authState === 'authenticated' ? 'h-[76px] shrink-0' : 'h-[66px] shrink-0'} />

        {/* Page content — scrolls naturally on mobile. Bottom padding on mobile
            reserves space so the fixed Buy button and footer never cover the
            last elements (e.g. "View your positions" link). */}
        <div className="flex w-full max-w-7xl mx-auto flex-col px-3 py-2 sm:px-4 sm:py-4 gap-4 sm:gap-3 max-lg:pb-32 lg:pb-6">
          <div className="flex flex-col lg:grid lg:grid-cols-[1fr_400px_auto] lg:gap-4">

            {/* Column 1: Chart — touch-action:pan-y lets vertical swipes scroll the page */}
            <div className="flex flex-col gap-2 px-0 pt-2 lg:py-0">
              <div
                className="h-[70vh] min-h-[420px] max-h-[640px] lg:h-[min(33.6rem,66vh)] lg:min-h-[384px] lg:max-h-none"
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

            {/* Column 2: Trade controls */}
            <div className="flex flex-col gap-3 pt-3 lg:pt-0 border-t border-border lg:border-0">
              {isLoading ? (
                <Skeleton className="lg:h-[min(33.6rem,66vh)] lg:min-h-[384px] h-48 w-full rounded-xl" />
              ) : (
                <Card className="lg:h-[min(33.6rem,66vh)] lg:min-h-[384px] lg:overflow-y-auto">
                  <CardContent className="pt-4 pb-6">
                    <TradeModeToggle mode={tradeMode} onModeChange={handleModeChange} />
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
                        onBuy={buyContract}
                        isBuying={isBuying}
                        buyResult={buyResult}
                        buyError={buyError}
                        onClearBuyResult={clearBuyResult}
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

            {/* Column 3: mode rail (desktop only) */}
            <ModeRail
              mode={tradeMode}
              onModeChange={handleModeChange}
              onOpenBotLibrary={() => setIsBotLibraryOpen(true)}
            />
          </div>
        </div>

        {/* Footer — fixed on mobile so it never gets pushed off-screen by the
            fixed Buy button; the pb-32 above keeps content clear of both. */}
        <div className="max-lg:fixed max-lg:bottom-0 max-lg:left-0 max-lg:right-0 py-3 text-center bg-background/80 backdrop-blur-sm lg:bg-transparent lg:static">
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
