'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DigitTradePanel } from '@/components/custom/digit-trade-panel';
import { DigitAutomatedPanel } from '@/components/custom/digit-automated-panel';
import { DigitEntryAutomatedPanel } from '@/components/custom/digit-entry-automated-panel';
import { TradeBody } from '@/components/trade-body';
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
  // selected bot — once digit bots exist — force the tab to match the bot).
  // Also passed down to TradeModeToggle to power the "Market contracts" menu.
  activeTradeType?: string;
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
  activeTradeType,
  onSelectTradeType,
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
  // lands, then lets the contract settle on its own. Needs stake/setStake
  // itself (not just proposal/buyContract) because it drives the stake
  // between rounds — doubling once on a loss, resetting on a win.
  //
  // ADDITIVE: setContractMode/setSelectedDigit are now also passed in so
  // that, when Hybrid Mode is turned on in the panel, the hook can flip the
  // barrier itself between rounds. Passing these does not change any
  // existing behavior — the hook only touches them when settings.hybridMode
  // is explicitly enabled (off by default).
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
    stake,
    setStake,
    setContractMode,
    setSelectedDigit,
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

  // Buy purchase-result toasts — previously lived inside DigitTradePanel
  // alongside the Buy button; moved here with the button itself.
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

  const chart = chartData ? (
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
  );

  const buyButton = (
    <div className="w-full mb-3 max-lg:relative max-lg:z-[9999]">
      <Button
        className="w-full h-8 rounded-full px-4 text-xs"
        disabled={!isConnected || !proposal || isBuying}
        onClick={buyContract}
      >
        {isBuying
          ? 'Purchasing...'
          : proposal
            ? `Buy @ ${proposal.askPrice.toFixed(2)} USD`
            : 'Buy Contract'}
      </Button>
    </div>
  );

  return (
    <TradeBody
      chart={chart}
      isLoading={isLoading}
      tradeMode={tradeMode}
      onModeChange={handleModeChange}
      onOpenBotLibrary={handleOpenBotLibrary}
      label={TRADE_TYPE_LABELS[tradeType]}
      activeTradeType={activeTradeType}
      onSelectTradeType={onSelectTradeType}
      buyButton={buyButton}
    >
      {tradeMode === 'manual' ? (
        <DigitTradePanel
          tradeType={tradeType}
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
          proposal={proposal}
          isProposalLoading={isProposalLoading}
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
    </TradeBody>
  );
}
