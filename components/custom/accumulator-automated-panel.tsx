'use client';

import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NumberField } from '@/components/custom/automation-controls';
import type { UseAccumulatorAutomationReturn } from '@/hooks/use-accumulator-automation';
import type { GrowthRate } from '@/lib/accumulator-types';

interface AccumulatorAutomatedPanelProps {
  growthRate: GrowthRate;
  onGrowthRateChange: (rate: GrowthRate) => void;
  growthRateOptions: { value: number; label: string }[];
  takeProfit: string;
  onTakeProfitChange: (value: string) => void;
  isConnected: boolean;
  isAuthenticated: boolean;
  automation: UseAccumulatorAutomationReturn;
}

export function AccumulatorAutomatedPanel({
  growthRate,
  onGrowthRateChange,
  growthRateOptions,
  takeProfit,
  onTakeProfitChange,
  isConnected,
  isAuthenticated,
  automation,
}: AccumulatorAutomatedPanelProps) {
  const {
    settings,
    setSettings,
    isRunning,
    start,
    stop,
    netProfit,
    tradeCount,
    stopReason,
    activePosition,
  } = automation;

  const canStart = isConnected && isAuthenticated && !isRunning;

  const updateSetting = <K extends keyof typeof settings>(
    key: K,
    value: (typeof settings)[K]
  ) => {
    setSettings({ ...settings, [key]: value });
  };

  const liveValue = activePosition ? parseFloat(activePosition.bid_price) : null;
  const liveProfit = liveValue !== null ? liveValue - settings.baseStake : null;

  return (
    <div className="w-full space-y-3 lg:max-w-[400px] lg:space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Growth rate</Label>
        <Select
          value={String(growthRate)}
          disabled={isRunning}
          onValueChange={(value) => onGrowthRateChange(parseFloat(value))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {growthRateOptions.map((opt) => (
              <SelectItem key={opt.value} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="accu-auto-take-profit" className="text-xs text-muted-foreground">
          Take profit (per round)
        </Label>
        <input
          id="accu-auto-take-profit"
          type="number"
          value={takeProfit}
          disabled={isRunning}
          onChange={(e) => onTakeProfitChange(e.target.value)}
          onKeyDown={(e) => {
            if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
          }}
          min={0}
          step="0.01"
          placeholder="-"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <NumberField
        label="Initial stake"
        value={settings.baseStake}
        onChange={(value) => updateSetting('baseStake', value ?? 1.5)}
        suffix="USD"
        disabled={isRunning}
        step={0.01}
      />

      <NumberField
        label="Ticks to hold"
        value={settings.ticksToHold}
        onChange={(value) => updateSetting('ticksToHold', Math.max(1, Math.round(value ?? 2)))}
        disabled={isRunning}
        step={1}
      />

      <NumberField
        label="Max trades"
        value={settings.maxTrades}
        onChange={(value) => updateSetting('maxTrades', Math.max(1, Math.round(value ?? 3)))}
        disabled={isRunning}
        step={1}
      />

      <NumberField
        label="Profit target"
        value={settings.targetProfit}
        onChange={(value) => updateSetting('targetProfit', value ?? 5)}
        suffix="USD"
        disabled={isRunning}
        step={0.01}
      />

      <div className="pt-1">
        {isRunning ? (
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => stop('Stopped manually')}
          >
            Stop
          </Button>
        ) : (
          <Button className="w-full" disabled={!canStart} onClick={start}>
            {!isAuthenticated ? 'Log in to trade' : !isConnected ? 'Connecting…' : 'Start'}
          </Button>
        )}
      </div>

      {/* Live contract card — visible while a contract is growing */}
      {isRunning && activePosition && liveProfit !== null && (
        <div className="rounded-md border border-blue-500/30 bg-blue-500/5 px-3 py-2 space-y-1 text-sm">
          <p className="text-xs font-medium text-blue-500 dark:text-blue-400 mb-1">
            Contract running…
          </p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current value</span>
            <span className="tabular-nums font-medium">{liveValue!.toFixed(2)} USD</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Unrealized profit</span>
            <span className={`tabular-nums font-medium ${liveProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
              {liveProfit >= 0 ? '+' : ''}{liveProfit.toFixed(2)} USD
            </span>
          </div>
        </div>
      )}

      {/* Session stats — shown once at least one trade has completed */}
      {tradeCount > 0 && (
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Trades completed</span>
            <span className="tabular-nums font-medium">{tradeCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Net profit</span>
            <span className={`tabular-nums font-medium ${netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
              {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(2)} USD
            </span>
          </div>
        </div>
      )}

      {stopReason && !isRunning && (
        <p className="text-xs text-muted-foreground rounded-md border border-border bg-muted/20 px-3 py-2">
          {stopReason}
        </p>
      )}
    </div>
  );
}
