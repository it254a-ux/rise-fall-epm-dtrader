'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DigitTradePanel } from '@/components/custom/digit-trade-panel';
import { DigitAutomatedPanel } from '@/components/custom/digit-automated-panel';
import { DigitEntryAutomatedPanel } from '@/components/custom/digit-entry-automated-panel';
import { DigitMatchDiffEntryAutomatedPanel } from '@/components/custom/digit-match-diff-entry-automated-panel';
import { DigitFrequencyAutomatedPanel } from '@/components/custom/digit-frequency-automated-panel';
import { TradeBody } from '@/components/trade-body';
import { useMartingaleAutomation } from '@/hooks/use-martingale-automation';
import { useDigitsEntryAutomation } from '@/hooks/use-digits-entry-automation';
import { useDigitsMatchDiffEntryAutomation } from '@/hooks/use-digits-match-diff-entry-automation';
import { useDigitFrequencyAutomation } from '@/hooks/use-digit-frequency-automation';
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

/** Which Matches/Differs automated bot is active. Watcher = original
 * entry-watcher bot (fires instantly the moment the selected digit lands).
 * Frequency = NEW, ported from the uploaded DBot XML strategy (predicts
 * the digit off a rolling 5-tick frequency window, boosts stake after a
 * loss). Defaults to Watcher — no change to existing behavior unless the
 * user explicitly switches. */
type MatchDiffBotType = 'watcher' | 'frequency';

const MATCH_DIFF_BOT_OPTIONS: { value: MatchDiffBotType; label: string }[] = [
  { value: 'watcher', label: 'Watcher' },
  { value: 'frequency', label: 'Frequency' },
];

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
  const [matchDiffBotType, setMatchDiffBotType] = useState<MatchDiffBotType>('watcher');
  const isAuthenticated = authState === 'authenticated';
  const isMobile = useIsMobile();

  // Martingale automation — used for Even/Odd only now, unchanged.
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
  // setContractMode/setSelectedDigit are passed in so that, when Hybrid
  // Mode is turned on in the panel, the hook can flip the barrier itself
  // between rounds. Off by default — no change to existing behavior unless
  // explicitly enabled.
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

  // Entry-watcher automation for Matches/Differs ("Watcher" bot), completely
  // separate hook from the Over/Under one above (which is untouched).
  // Watches for the selected digit itself (no offset), with an optional
  // Bounce/Random Mode that moves the digit each round instead of staying
  // fixed.
  const matchDiffAutomation = useDigitsMatchDiffEntryAutomation({
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
    setSelectedDigit,
  });

  // NEW — "Frequency" bot for Matches/Differs, ported from the uploaded
  // DBot XML strategy. Predicts the digit off a rolling stats window
  // instead of waiting for a specific digit to land, and boosts stake for
  // a fixed number of rounds after a loss. Selectable alongside the
  // Watcher bot via the toggle rendered below; Watcher remains the default
  // so nothing changes unless this is explicitly picked.
  const frequencyAutomation = useDigitFrequencyAutomation({
    isConnected,
    isAuthenticated,
    contractMode,
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
    selectedDigit,
    setSelectedDigit,
  });

  const isOverUnder = tradeType === 'over-under';
  const isMatchesDiffers = tradeType === 'matches-differs';
  const isMatchDiffWatcher = isMatchesDiffers && matchDiffBotType === 'watcher';
  const isMatchDiffFrequency = isMatchesDiffers && matchDiffBotType === 'frequency';

  const activeIsRunning = isOverUnder
    ? overUnderAutomation.isRunning
    : isMatchDiffWatcher
    ? matchDiffAutomation.isRunning
    : isMatchDiffFrequency
    ? frequencyAutomation.isRunning
    : martingaleAutomation.isRunning;

  const handleModeChange = (mode: 'manual' | 'automated') => {
    if (mode === 'manual' && activeIsRunning) {
      if (isOverUnder) {
        overUnderAutomation.stop('Stopped manually');
      } else if (isMatchDiffWatcher) {
        matchDiffAutomation.stop('Stopped manually');
      } else if (isMatchDiffFrequency) {
        frequencyAutomation.stop('Stopped manually');
      } else {
        martingaleAutomation.stop();
      }
    }
    setTradeMode(mode);
  };

  // Switching bot type mid-run would leave the previous bot's automation
  // dangling in a running state with no visible controls, so stop it first.
  const handleMatchDiffBotTypeChange = (next: MatchDiffBotType) => {
    if (next === matchDiffBotType) return;
    if (matchDiffAutomation.isRunning) matchDiffAutomation.stop('Switched bot');
    if (frequencyAutomation.isRunning) frequencyAutomation.stop('Switched bot');
    setMatchDiffBotType(next);
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

  // Bot-type toggle — only shown for Matches/Differs while in automated
  // mode, so Over/Under, Even/Odd, and manual trading are all unaffected.
  const matchDiffBotToggle = isMatchesDiffers && tradeMode === 'automated' && (
    <ToggleGroup
      type="single"
      value={matchDiffBotType}
      onValueChange={(value) => {
        if (value) handleMatchDiffBotTypeChange(value as MatchDiffBotType);
      }}
      className="w-full gap-0 rounded-full bg-muted p-0.5 lg:max-w-[240px]"
    >
      {MATCH_DIFF_BOT_OPTIONS.map((opt) => (
        <ToggleGroupItem
          key={opt.value}
          value={opt.value}
          className="flex-1 h-6 rounded-full text-[10px] font-medium text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:font-bold data-[state=on]:shadow-sm hover:text-foreground"
        >
          {opt.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
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
      ) : isMatchesDiffers ? (
        <div className="w-full space-y-1.5 lg:max-w-[240px] lg:space-y-2">
          {matchDiffBotToggle}
          {matchDiffBotType === 'watcher' ? (
            <DigitMatchDiffEntryAutomatedPanel
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
              automation={matchDiffAutomation}
            />
          ) : (
            <DigitFrequencyAutomatedPanel
              contractMode={contractMode}
              onContractModeChange={setContractMode}
              stake={stake}
              onStakeChange={setStake}
              duration={duration}
              onDurationChange={setDuration}
              isConnected={isConnected}
              isAuthenticated={isAuthenticated}
              automation={frequencyAutomation}
            />
          )}
        </div>
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
