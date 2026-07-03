'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CurrentTickDisplay } from '@/components/custom/current-tick-display';
import { DigitStatsBar } from '@/components/custom/digit-stats-bar';
import { DigitTradeControls } from '@/components/custom/digit-trade-controls';
import { TradeTypeChips } from '@/components/custom/digit-trade-type-chips';
import type {
  ActiveSymbol,
  Tick,
  ProposalInfo,
  DurationLimits,
  BuyResult,
} from '@deriv/core';
import type { ContractMode, TradeType, DigitStats } from '@/lib/digit-types';

const DIGIT_TRADE_TYPE_OPTIONS: { value: TradeType; label: string }[] = [
  { value: 'matches-differs', label: 'Matches/Differs' },
  { value: 'over-under', label: 'Over/Under' },
  { value: 'even-odd', label: 'Even/Odd' },
];

export interface DigitsBodyProps {
  isConnected: boolean;
  isLoading: boolean;
  symbols: ActiveSymbol[];
  activeSymbol: ActiveSymbol | null;
  selectSymbol: (symbol: string) => void;
  currentTick: Tick | null;
  lastDigit: number | null;
  digitStats: DigitStats;
  pipSize: number;
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
  isAuthenticated: boolean;
}

export function DigitsBody({
  isConnected,
  isLoading,
  symbols,
  activeSymbol,
  selectSymbol,
  currentTick,
  lastDigit,
  digitStats,
  pipSize,
  tradeType,
  setTradeType,
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
  isAuthenticated,
}: DigitsBodyProps) {
  return (
    <div className="flex w-full max-w-7xl mx-auto flex-col px-3 py-2 sm:px-4 sm:py-4 gap-2 sm:gap-3 pb-10">
      {isLoading ? (
        <>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-32 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
          <Skeleton className="w-full h-[420px] rounded-xl" />
        </>
      ) : (
        <>
          <div className="shrink-0 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <TradeTypeChips
              value={tradeType}
              options={DIGIT_TRADE_TYPE_OPTIONS}
              onValueChange={setTradeType}
            />
          </div>

          <Card className="shrink-0 border shadow-sm mb-12">
            <CardContent className="flex flex-col p-3 pt-3 sm:p-6 sm:pt-4 pb-2 sm:pb-6">
              <div
                className={`lg:grid lg:overflow-visible ${tradeType !== 'even-odd' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}
              >
                <div className="flex flex-col pb-4 pt-1 sm:pb-6 sm:pt-2 lg:py-0 lg:pr-6">
                  <div className="flex items-center justify-center min-h-24 sm:min-h-32 lg:flex-1">
                    <CurrentTickDisplay
                      tick={currentTick}
                      lastDigit={lastDigit}
                      activeSymbol={activeSymbol}
                      pipSize={pipSize}
                    />
                  </div>
                </div>

                <div className="max-lg:border-t max-lg:divide-y divide-border lg:contents">
                  {tradeType !== 'even-odd' && (
                    <div className="py-4 sm:py-6 lg:py-0 lg:px-6 lg:border-l lg:border-border">
                      <DigitStatsBar
                        digitStats={digitStats}
                        selectedDigit={selectedDigit}
                        onDigitSelect={setSelectedDigit}
                      />
                    </div>
                  )}

                  <div className="pt-4 sm:pt-6 lg:pt-0 lg:pl-6 lg:border-l lg:border-border">
                    <DigitTradeControls
                      tradeType={tradeType}
                      contractMode={contractMode}
                      onContractModeChange={setContractMode}
                      selectedDigit={selectedDigit}
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
                      isAuthenticated={isAuthenticated}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
