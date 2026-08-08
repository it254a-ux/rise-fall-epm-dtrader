'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { BuyResult } from '@deriv/core';
import type { AccumulatorProposalInfo } from '@/hooks/use-accumulator-proposal';
import type { GrowthRate } from '@/lib/accumulator-types';
import type { OpenPosition } from '@/lib/types';

interface AccumulatorTradePanelProps {
  growthRate: GrowthRate;
  onGrowthRateChange: (rate: GrowthRate) => void;
  growthRateOptions: { value: number; label: string }[];
  isConnected: boolean;
  stake: string;
  onStakeChange: (value: string) => void;
  takeProfit: string;
  onTakeProfitChange: (value: string) => void;
  proposal: AccumulatorProposalInfo | null;
  onBuy: () => void;
  isBuying: boolean;
  buyResult: BuyResult | null;
  buyError: string | null;
  onClearBuyResult: () => void;
  activePosition?: OpenPosition | null;
  onClose?: (contractId: number, bidPrice: string) => void;
  isClosing?: boolean;
  isAuthenticated?: boolean;
}

export function AccumulatorTradePanel({
  growthRate,
  onGrowthRateChange,
  growthRateOptions,
  isConnected,
  stake,
  onStakeChange,
  takeProfit,
  onTakeProfitChange,
  proposal,
  onBuy,
  isBuying,
  buyResult,
  buyError,
  onClearBuyResult,
  activePosition,
  onClose,
  isClosing,
  isAuthenticated,
}: AccumulatorTradePanelProps) {
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

  return (
    <div className="w-full space-y-1.5 lg:max-w-[240px] lg:space-y-2">

      {/* Growth Rate selector */}
      <div className="space-y-0.5">
        <div className="flex items-center gap-1">
          <Label className="text-[10px] text-muted-foreground">Growth rate</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex h-3 w-3 cursor-help items-center justify-center rounded-full border border-muted-foreground/40 text-[9px] text-muted-foreground">
                  i
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                <p className="text-xs">
                  Your stake grows by the selected percentage for each tick that stays within the barrier range.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Select
          value={String(growthRate)}
          onValueChange={(value) => {
            onGrowthRateChange(parseFloat(value));
          }}
        >
          <SelectTrigger className="h-7 text-xs px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {growthRateOptions.map((opt) => (
              <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stake */}
      <div className="space-y-0.5">
        <Label htmlFor="accu-stake" className="text-[10px] text-muted-foreground">Stake</Label>
        <Input
          id="accu-stake"
          type="number"
          value={stake}
          onChange={(e) => onStakeChange(e.target.value)}
          onKeyDown={(e) => {
            if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
          }}
          min={0}
          step="0.01"
          labelRight="USD"
          className="h-7 text-xs px-2"
        />
      </div>

      {/* Take Profit */}
      <div className="space-y-0.5">
        <Label htmlFor="accu-take-profit" className="text-[10px] text-muted-foreground">Take profit</Label>
        <Input
          id="accu-take-profit"
          type="number"
          value={takeProfit}
          onChange={(e) => onTakeProfitChange(e.target.value)}
          onKeyDown={(e) => {
            if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
          }}
          min={0}
          step="0.01"
          placeholder="-"
          labelRight="USD"
          className="h-7 text-xs px-2"
        />
      </div>

      {/* Proposal info */}
      {proposal && !activePosition && (
        <div className="rounded-lg bg-muted/50 px-2 py-1 space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Max payout</span>
            <span className="font-medium">{proposal.maxPayout.toFixed(2)} USD</span>
          </div>
        </div>
      )}

      {/* Active position info */}
      {activePosition && (
        <div className="rounded-lg bg-muted/50 px-2 py-1 space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current value</span>
            <span className="font-medium">
              {(parseFloat(activePosition.buy_price) + parseFloat(activePosition.profit)).toFixed(2)} {activePosition.currency}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Profit / Loss</span>
            <span className={parseFloat(activePosition.profit) >= 0 ? 'font-medium text-green-600' : 'font-medium text-destructive'}>
              {parseFloat(activePosition.profit) >= 0 ? '+' : ''}{parseFloat(activePosition.profit).toFixed(2)} {activePosition.currency}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total return</span>
            <span className="font-semibold">
              {(parseFloat(activePosition.buy_price) + parseFloat(activePosition.profit)).toFixed(2)} {activePosition.currency}
            </span>
          </div>
        </div>
      )}

      {/* Buy / Close button — always inline in the normal page flow on all
          screen sizes so it never floats over the "View your positions" link
          or any other content below it on mobile. */}
      <div className="w-full">
        {!activePosition && (
          <Button
            className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs"
            disabled={!isConnected || !proposal || isBuying}
            onClick={onBuy}
          >
            {isBuying ? 'Purchasing...' : 'Buy'}
          </Button>
        )}

        {activePosition && onClose && (
          <Button
            variant="outline"
            className="w-full rounded-full border-black bg-white text-black hover:bg-white hover:text-black dark:border-white dark:bg-transparent dark:text-white dark:hover:bg-white/10 h-8 text-xs"
            disabled={!isConnected || isClosing || !activePosition.is_valid_to_sell}
            onClick={() => onClose(activePosition.contract_id, activePosition.bid_price)}
          >
            {isClosing ? 'Closing...' : (
              <span className="flex flex-col items-center leading-tight gap-0.5">
                <span>Close</span>
                <span className="text-[10px] font-normal opacity-90">
                  {(parseFloat(activePosition.buy_price) + parseFloat(activePosition.profit)).toFixed(2)} {activePosition.currency}
                </span>
              </span>
            )}
          </Button>
        )}
      </div>

      {/* View your positions — shown when authenticated */}
      {isAuthenticated && (
        <Button
          asChild
          variant="ghost"
          className="w-full text-[10px] text-muted-foreground hover:text-foreground h-6"
        >
          <Link href="/reports">View your positions →</Link>
        </Button>
      )}

    </div>
  );
}
