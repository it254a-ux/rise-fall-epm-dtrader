'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { DurationLimits, ProposalInfo, BuyResult } from '@deriv/core';
import type { ContractMode, TradeType } from '@/lib/digit-types';

interface DigitTradeControlsProps {
  tradeType: TradeType;
  contractMode: ContractMode;
  onContractModeChange: (mode: ContractMode) => void;
  selectedDigit: number;
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
  isAuthenticated?: boolean;
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

function showDigitInPrediction(contractMode: ContractMode): boolean {
  return contractMode !== 'DIGITEVEN' && contractMode !== 'DIGITODD';
}

export function DigitTradeControls({
  tradeType,
  contractMode,
  onContractModeChange,
  selectedDigit,
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
  isAuthenticated,
}: DigitTradeControlsProps) {
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
    <div className="space-y-2 sm:space-y-4">
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
