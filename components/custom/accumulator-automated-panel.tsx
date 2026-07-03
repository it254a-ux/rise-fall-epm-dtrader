'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AutomationControls, NumberField } from '@/components/custom/automation-controls';
import type { UseMartingaleAutomationReturn } from '@/hooks/use-martingale-automation';
import type { GrowthRate } from '@/lib/accumulator-types';

interface AccumulatorAutomatedPanelProps {
  growthRate: GrowthRate;
  onGrowthRateChange: (rate: GrowthRate) => void;
  growthRateOptions: { value: number; label: string }[];
  takeProfit: string;
  onTakeProfitChange: (value: string) => void;
  isConnected: boolean;
  isAuthenticated: boolean;
  automation: UseMartingaleAutomationReturn;
}

/**
 * Automated panel for Accumulators. Growth rate + take profit are round
 * setup fields (same role as the contract-mode toggle in digit automation);
 * everything from Initial stake down is the same AutomationControls block
 * used by Rise/Fall and Digits.
 */
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
  const { settings, setSettings, isRunning, start, stop, netProfit, tradeCount, currentStake, stopReason } = automation;

  const updateBaseStake = (value: number | null) => {
    setSettings({ ...settings, baseStake: value ?? 0 });
  };

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
        onChange={updateBaseStake}
        suffix="USD"
        disabled={isRunning}
        step={0.01}
      />

      <AutomationControls
        settings={settings}
        setSettings={setSettings}
        isRunning={isRunning}
        start={start}
        stop={stop}
        netProfit={netProfit}
        tradeCount={tradeCount}
        currentStake={currentStake}
        stopReason={stopReason}
        isConnected={isConnected}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}
