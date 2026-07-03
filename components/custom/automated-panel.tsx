'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { Direction } from '@/lib/types';
import type { MartingaleSettings, UseMartingaleAutomationReturn } from '@/hooks/use-martingale-automation';

interface AutomatedPanelProps {
  direction: Direction;
  onDirectionChange: (direction: Direction) => void;
  allowEquals: boolean;
  onAllowEqualsChange: (value: boolean) => void;
  isConnected: boolean;
  isAuthenticated: boolean;
  automation: UseMartingaleAutomationReturn;
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  disabled,
  step = 1,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  suffix?: string;
  disabled?: boolean;
  step?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value ?? ''}
        placeholder={value === null ? 'No limit' : undefined}
        disabled={disabled}
        step={step}
        min={0}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === '' ? null : parseFloat(raw));
        }}
        labelRight={suffix}
      />
    </div>
  );
}

/**
 * Automated Rise/Fall panel — Martingale strategy builder. Renders in place
 * of the old "Coming soon" placeholder when TradeModeToggle is set to
 * 'automated'. Reuses direction/allowEquals from the parent (same as manual
 * mode) and owns its own strategy settings + run state via the
 * useMartingaleAutomation hook passed in as `automation`.
 */
export function AutomatedPanel({
  direction,
  onDirectionChange,
  allowEquals,
  onAllowEqualsChange,
  isConnected,
  isAuthenticated,
  automation,
}: AutomatedPanelProps) {
  const { settings, setSettings, isRunning, start, stop, netProfit, tradeCount, currentStake, stopReason } = automation;

  const updateSetting = <K extends keyof MartingaleSettings>(key: K, value: MartingaleSettings[K]) => {
    setSettings({ ...settings, [key]: value });
  };

  const canStart = isConnected && isAuthenticated && settings.baseStake > 0 && !isRunning;

  return (
    <div className="w-full space-y-3 lg:max-w-[400px] lg:space-y-4">
      {/* Rise / Fall direction — shared with manual mode */}
      <ToggleGroup
        type="single"
        value={direction}
        disabled={isRunning}
        onValueChange={(value) => {
          if (value === 'CALL' || value === 'PUT') onDirectionChange(value);
        }}
        className="w-full gap-0 rounded-full bg-muted p-1"
      >
        <ToggleGroupItem
          value="CALL"
          className="flex-1 rounded-full text-sm font-medium text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-green-600 data-[state=on]:font-bold data-[state=on]:shadow-sm hover:text-foreground"
        >
          Rise
        </ToggleGroupItem>
        <ToggleGroupItem
          value="PUT"
          className="flex-1 rounded-full text-sm font-medium text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-destructive data-[state=on]:font-bold data-[state=on]:shadow-sm hover:text-foreground"
        >
          Fall
        </ToggleGroupItem>
      </ToggleGroup>

      <NumberField
        label="Initial stake"
        value={settings.baseStake}
        onChange={(v) => updateSetting('baseStake', v ?? 0)}
        suffix="USD"
        disabled={isRunning}
        step={0.01}
      />

      <div className="flex items-center justify-between">
        <Label htmlFor="allow-equals-auto" className="text-sm cursor-pointer">Allow equals</Label>
        <Switch
          id="allow-equals-auto"
          checked={allowEquals}
          disabled={isRunning}
          onCheckedChange={onAllowEqualsChange}
        />
      </div>

      <div className="pt-1 border-t border-border" />

      <p className="text-sm font-semibold text-foreground">Strategy parameters</p>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Strategy</Label>
        <div className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm font-medium">
          Martingale
        </div>
      </div>

      <NumberField
        label="Stake multiplier"
        value={settings.multiplier}
        onChange={(v) => updateSetting('multiplier', v ?? 1)}
        suffix="×"
        disabled={isRunning}
        step={0.1}
      />

      <NumberField
        label="Max. stake"
        value={settings.maxStake}
        onChange={(v) => updateSetting('maxStake', v)}
        suffix="USD"
        disabled={isRunning}
        step={0.01}
      />

      <p className="text-sm font-semibold text-foreground pt-1">Risk management</p>

      <NumberField
        label="Profit threshold"
        value={settings.profitThreshold}
        onChange={(v) => updateSetting('profitThreshold', v)}
        suffix="USD"
        disabled={isRunning}
        step={0.01}
      />

      <NumberField
        label="Loss threshold"
        value={settings.lossThreshold}
        onChange={(v) => updateSetting('lossThreshold', v)}
        suffix="USD"
        disabled={isRunning}
        step={0.01}
      />

      {/* Live run status */}
      {(isRunning || tradeCount > 0) && (
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Trades this run</span>
            <span className="font-medium">{tradeCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Net profit</span>
            <span className={`font-medium ${netProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {netProfit >= 0 ? '+' : ''}
              {netProfit.toFixed(2)} USD
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current stake</span>
            <span className="font-medium">{currentStake.toFixed(2)} USD</span>
          </div>
        </div>
      )}

      {stopReason && !isRunning && (
        <p className="text-xs text-muted-foreground">{stopReason}</p>
      )}

      {!isAuthenticated && (
        <p className="text-xs text-muted-foreground">Log in to run automated trading.</p>
      )}

      <div className="max-lg:fixed max-lg:bottom-[calc(env(safe-area-inset-bottom)+2.5rem)] max-lg:left-3 max-lg:right-3 lg:static">
        {isRunning ? (
          <Button
            className="w-full rounded-full"
            size="lg"
            variant="destructive"
            onClick={() => stop()}
          >
            Stop
          </Button>
        ) : (
          <Button
            className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
            disabled={!canStart}
            onClick={start}
          >
            Run
          </Button>
        )}
      </div>
    </div>
  );
}
