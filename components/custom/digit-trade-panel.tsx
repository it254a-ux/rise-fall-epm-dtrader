'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DigitStatsBar } from '@/components/custom/digit-stats-bar';
import type { DurationLimits, ProposalInfo, BuyResult } from '@deriv/core';
import type { ContractMode, TradeType, DigitStats } from '@/lib/digit-types';

interface DigitTradePanelProps {
  tradeType: TradeType;
  contractMode: ContractMode;
  onContractModeChange: (mode: ContractMode) => void;
  digitStats: DigitStats;
  selectedDigit: number;
  onSelectedDigitChange: (digit: number) => void;
  isConnected: boolean;
  stake: string;
  onStakeChange: (value: string) => void;
  duration: number;
  onDurationChange: (value: number) => void;
  durationLimits: DurationLimits;
  proposal: ProposalInfo | null;
  isProposalLoading: boolean;
  onBuy: () => void;
  isBuying: boolean;
  buyResult: BuyResult | null;
  buyError: string | null;
  onClearBuyResult: () => void;
}

const CONTRACT_MODE_OPTIONS: Record<TradeType, { value: ContractMode; label: string }[]> = {
  'matches-differs': [
    { value: 'DIGITMATCH', label: 'Matches' },
    { value: 'DIGITDIFF', label: 'Differs' },
  ],
  'over-under': [
    { value: 'DIGITOVER', label: 'Over' },
    { value: 'DIGITUNDER', label: 'Under' },
  ],
  'even-odd': [
    { value: 'DIGITEVEN', label: 'Even' },
    { value: 'DIGITODD', label: 'Odd' },
  ],
};

function getPredictionText(contractMode: ContractMode): string {
  switch (contractMode) {
    case 'DIGITMATCH':
      return 'match';
    case 'DIGITDIFF':
      return 'differ from';
    case 'DIGITOVER':
      return 'be over';
    case 'DIGITUNDER':
      return 'be under';
    case 'DIGITEVEN':
      return 'be even';
    case 'DIGITODD':
      return 'be odd';
  }
}

function showDigitGrid(tradeType: TradeType): boolean {
  return tradeType !== 'even-odd';
}

function showDigitInPrediction(contractMode: ContractMode): boolean {
  return contractMode !== 'DIGITEVEN' && contractMode !== 'DIGITODD';
}

export function DigitTradePanel({
  tradeType,
  contractMode,
  onContractModeChange,
  digitStats,
  selectedDigit,
  onSelectedDigitChange,
  isConnected,
  stake,
  onStakeChange,
  duration,
  onDurationChange,
  durationLimits,
  proposal,
  isProposalLoading,
  onBuy,
  isBuying,
  buyResult,
  buyError,
  onClearBuyResult,
}: DigitTradePanelProps) {
  useEffect(() => {
    if (buyError) {
      toast.error('Purchase Failed', { description: buyError });
      onClearBuyResult();
    }
  }, [buyError, onClearBuyResult]);

  useEffect(() => {
    if (buyResult) {
      toast.success('Contract Purchased', {
        description: `Buy price: ${buyResult.buyPrice.toFixed(2)} USD | Payout: ${buyResult.payout.toFixed(2)} USD | Balance: ${buyResult.balanceAfter.toFixed(2)} USD`,
      });
      onClearBuyResult();
    }
  }, [buyResult, onClearBuyResult]);

  const modeOptions = CONTRACT_MODE_OPTIONS[tradeType];

  return (
    <div className="w-full space-y-3 lg:max-w-[400px] lg:space-y-4">
      <ToggleGroup
        type="single"
        value={contractMode}
        onValueChange={value => {
          if (value) onContractModeChange(value as ContractMode);
        }}
        className="w-full gap-0 rounded-full bg-muted p-1"
      >
        {modeOptions.map(opt => (
          <ToggleGroupItem
            key={opt.value}
            value={opt.value}
            className="flex-1 rounded-full text-sm font-medium text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:font-bold data-[state=on]:shadow-sm hover:text-foreground"
          >
            {opt.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {showDigitGrid(tradeType) && (
        <div className="h-40 sm:h-48">
          <DigitStatsBar
            digitStats={digitStats}
            selectedDigit={selectedDigit}
            onDigitSelect={onSelectedDigitChange}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="digit-stake" className="text-xs text-muted-foreground">
            Stake
          </Label>
          <Input
            id="digit-stake"
            type="number"
            value={stake}
            onChange={e => onStakeChange(e.target.value)}
            onKeyDown={e => {
              if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
            }}
            min={0}
            step="0.01"
            labelRight="USD"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="digit-duration" className="text-xs text-muted-foreground">
            Duration
          </Label>
          <Input
            id="digit-duration"
            type="number"
            value={duration}
            onChange={e => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) onDurationChange(val);
            }}
            min={durationLimits.min}
            max={durationLimits.max}
            step={1}
            labelRight="Ticks"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border p-2 sm:p-3 bg-muted/20 space-y-1.5 sm:space-y-2">
        <p className="text-[11px] sm:text-xs text-muted-foreground mb-0 sm:mb-1">Prediction</p>
        <p className="text-xs sm:text-sm font-medium">
          Last digit of the price will{' '}
          <span className="text-primary font-bold">{getPredictionText(contractMode)}</span>
          {showDigitInPrediction(contractMode) && (
            <>
              {' '}
              <span className="inline-flex w-5 h-5 rounded-full bg-primary text-primary-foreground items-center justify-center text-xs font-bold">
                {selectedDigit}
              </span>
            </>
          )}
        </p>
        {(proposal || isProposalLoading) && (
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <span className="text-xs text-muted-foreground">Payout</span>
            {isProposalLoading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <span className="text-sm font-bold text-foreground">
                {proposal!.payout.toFixed(2)} USD
              </span>
            )}
          </div>
        )}
      </div>

      <div className="max-lg:fixed max-lg:bottom-[calc(env(safe-area-inset-bottom)+5rem)] max-lg:left-3 max-lg:right-3 lg:static">
        <Button
          className="w-full h-10 rounded-full px-6 sm:h-11 sm:px-8"
          disabled={!isConnected || !proposal || isBuying}
          onClick={onBuy}
        >
          {isBuying
            ? 'Purchasing...'
            : proposal
              ? `Buy @ ${proposal.askPrice.toFixed(2)} USD`
              : 'Buy Contract'}
        </Button>
      </div>
    </div>
  );
}
