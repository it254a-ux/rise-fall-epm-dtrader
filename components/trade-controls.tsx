'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { FileText, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EndTimePicker } from '@/components/custom/end-time-picker';
import type { DerivWS, ActiveSymbol, ProposalInfo, BuyResult } from '@deriv/core';
import type { Direction, DurationSelectUnit, DurationOption } from '../lib/types';

interface TradeControlsProps {
  direction: Direction;
  onDirectionChange: (direction: Direction) => void;
  allowEquals: boolean;
  onAllowEqualsChange: (value: boolean) => void;
  isConnected: boolean;
  stake: string;
  onStakeChange: (value: string) => void;
  duration: number;
  onDurationChange: (value: number) => void;
  durationOptions: DurationOption[];
  durationUnit: DurationSelectUnit;
  onDurationUnitChange: (unit: DurationSelectUnit) => void;
  endDate: Date | undefined;
  onEndDateChange: (date: Date | undefined) => void;
  endTime: string;
  onEndTimeChange: (time: string) => void;
  ws: DerivWS | null;
  activeSymbol: ActiveSymbol | null;
  proposal: ProposalInfo | null;

  onBuy: () => void;
  isBuying: boolean;
  buyResult: BuyResult | null;
  buyError: string | null;
  onClearBuyResult: () => void;
  /** Whether the user is authenticated — shows the View reports link when true. */
  isAuthenticated?: boolean;
  /** Currently selected trade type, for the "Market contracts" upward menu. */
  activeTradeType?: string;
  /** Called when the user picks a trade type from the "Market contracts" menu. */
  onSelectTradeType?: (type: string) => void;
}

/** Same trade-type list as the top TradeTypesFlyout tabs — duplicated here
 * (rather than imported) since that file doesn't currently export it, to
 * avoid touching an unrelated component for this change. */
const MARKET_CONTRACT_TYPES = [
  { label: 'Accumulators', value: 'accumulators' },
  { label: 'Directional Rise/Fall', value: 'rise-fall' },
  { label: 'Digit based Matches/Differs', value: 'matches-differs' },
  { label: 'Over/Under', value: 'over-under' },
  { label: 'Even/Odd', value: 'even-odd' },
];

export function TradeControls({
  direction,
  onDirectionChange,
  allowEquals,
  onAllowEqualsChange,
  isConnected,
  stake,
  onStakeChange,
  duration,
  onDurationChange,
  durationOptions,
  durationUnit,
  onDurationUnitChange,
  endDate,
  onEndDateChange,
  endTime,
  onEndTimeChange,
  ws,
  activeSymbol,
  proposal,
  onBuy,
  isBuying,
  buyResult,
  buyError,
  onClearBuyResult,
  isAuthenticated,
  activeTradeType,
  onSelectTradeType,
}: TradeControlsProps) {
  const [isMarketMenuOpen, setIsMarketMenuOpen] = useState(false);

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

  const activeOption = durationOptions.find(o => o.unit === durationUnit);

  const endTimeOption = durationOptions.find(o => o.unit === 'end-time');
  const { endTimeMinDate, endTimeMaxDate } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      endTimeMinDate: today,
      endTimeMaxDate: endTimeOption
        ? new Date(today.getTime() + endTimeOption.max * 86400000)
        : new Date(today.getTime() + 365 * 86400000),
    };
  }, [endTimeOption]);

  return (
    <div className="w-full max-w-full lg:max-w-[200px] mx-auto space-y-1.5 lg:space-y-2">
      {/* Rise / Fall direction segmented control */}
      <ToggleGroup
        type="single"
        value={direction}
        onValueChange={(value) => {
          if (value === 'CALL' || value === 'PUT') onDirectionChange(value);
        }}
        className="w-full gap-0 rounded-full bg-muted p-0.5"
      >
        <ToggleGroupItem
          value="CALL"
          className="flex-1 h-6 rounded-full text-[9px] font-medium text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-green-600 data-[state=on]:font-bold data-[state=on]:shadow-sm hover:text-foreground"
        >
          Rise
        </ToggleGroupItem>
        <ToggleGroupItem
          value="PUT"
          className="flex-1 h-6 rounded-full text-[9px] font-medium text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-destructive data-[state=on]:font-bold data-[state=on]:shadow-sm hover:text-foreground"
        >
          Fall
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Allow equals */}
      <div className="flex items-center justify-between">
        <Label htmlFor="allow-equals" className="text-[9px] cursor-pointer">Allow equals</Label>
        <Switch
          id="allow-equals"
          checked={allowEquals}
          onCheckedChange={onAllowEqualsChange}
        />
      </div>

      {/* Three-column row: Duration | Stake | Payout.
          Each column is independently scrollable (max-h + overflow-y-auto)
          so a column's content never pushes the others out of alignment,
          per the requested mobile layout. Thin dividers separate columns. */}
      <div className="grid grid-cols-3 divide-x divide-border rounded-md border border-border overflow-hidden">
        {/* Column 1: Duration */}
        <div className="flex flex-col items-center gap-1 px-1 py-1.5 max-h-28 overflow-y-auto">
          <Select
            value={durationUnit}
            onValueChange={(v) => {
              const opt = durationOptions.find(o => o.unit === v);
              if (opt) onDurationUnitChange(opt.unit);
            }}
          >
            <SelectTrigger className="h-5 w-full border-0 shadow-none bg-transparent px-1 text-[9px] justify-center gap-1 text-muted-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {durationOptions.map(opt => (
                <SelectItem key={opt.unit} value={opt.unit} className="text-[11px]">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {durationUnit !== 'end-time' && (
            <Input
              type="number"
              value={duration}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) onDurationChange(val);
              }}
              min={activeOption?.min}
              max={activeOption?.max}
              step={1}
              className="h-7 w-full text-[11px] text-center px-1"
            />
          )}

          {durationUnit === 'end-time' && (
            <EndTimePicker
              ws={ws}
              isConnected={isConnected}
              activeSymbol={activeSymbol}
              endDate={endDate}
              onEndDateChange={onEndDateChange}
              endTime={endTime}
              onEndTimeChange={onEndTimeChange}
              minDate={endTimeMinDate}
              maxDate={endTimeMaxDate}
            />
          )}
        </div>

        {/* Column 2: Stake */}
        <div className="flex flex-col items-center gap-1 px-1 py-1.5 max-h-28 overflow-y-auto">
          <Label htmlFor="stake" className="text-[9px] text-muted-foreground text-center leading-tight">
            Stake (USD)
          </Label>
          <Input
            id="stake"
            type="number"
            value={stake}
            onChange={(e) => onStakeChange(e.target.value)}
            onKeyDown={(e) => {
              if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
            }}
            min={0}
            step="0.01"
            className="h-7 w-full text-[11px] text-center px-1"
          />
        </div>

        {/* Column 3: Payout (read-only) — new display, previously payout
            was only shown as small text inside the Buy button. */}
        <div className="flex flex-col items-center gap-1 px-1 py-1.5 max-h-28 overflow-y-auto">
          <Label className="text-[9px] text-muted-foreground text-center leading-tight">
            Payout
          </Label>
          <div className="flex h-7 w-full items-center justify-center rounded-md border border-input bg-transparent px-1 text-[11px] font-semibold text-green-600">
            {proposal ? `${proposal.payout.toFixed(2)}` : '-'}
          </div>
        </div>
      </div>

      {/* Bottom action row: Market contracts + View reports on the left,
          Buy on the right, separated from the columns above by a thin
          divider — matches the requested mobile layout. */}
      <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
        <div className="flex items-center gap-3">
          {/* Market contracts — opens an upward menu of trade types
              (Accumulators, Rise/Fall, Digits, etc). Selecting one calls
              onSelectTradeType and the menu closes itself automatically. */}
          <Popover open={isMarketMenuOpen} onOpenChange={setIsMarketMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <LayoutGrid size={12} strokeWidth={1.75} />
                Market contracts
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-56 p-1">
              {MARKET_CONTRACT_TYPES.map(item => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    onSelectTradeType?.(item.value);
                    setIsMarketMenuOpen(false);
                  }}
                  className={`w-full rounded-md px-2 py-1.5 text-left text-[11px] transition-colors ${
                    activeTradeType === item.value
                      ? 'bg-foreground/10 text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* View reports — shown when authenticated */}
          {isAuthenticated && (
            <Link
              href="/reports"
              className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <FileText size={12} strokeWidth={1.75} />
              View reports
            </Link>
          )}
        </div>

        <Button
          className="shrink-0 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-4 text-[11px]"
          disabled={!isConnected || !proposal || isBuying}
          onClick={onBuy}
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
    </div>
  );
}
