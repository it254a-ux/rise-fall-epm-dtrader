'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AutomationControls, NumberField } from '@/components/custom/automation-controls';
import type { UseMartingaleAutomationReturn } from '@/hooks/use-martingale-automation';
import type { ContractMode, TradeType, DigitStats } from '@/lib/digit-types';

interface DigitAutomatedPanelProps {
  tradeType: TradeType;
  contractMode: ContractMode;
  onContractModeChange: (mode: ContractMode) => void;
  digitStats: DigitStats;
  selectedDigit: number;
  onSelectedDigitChange: (digit: number) => void;
  isConnected: boolean;
  isAuthenticated: boolean;
  automation: UseMartingaleAutomationReturn;
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

function showDigitGrid(tradeType: TradeType): boolean {
  return tradeType !== 'even-odd';
}

/**
 * Automated panel for digit contracts (Matches/Differs, Over/Under, Even/Odd).
 * The contract-mode toggle, digit-prediction grid, and Initial stake field are
 * digit-specific; everything from the divider down is the same
 * AutomationControls block used by Rise/Fall's AutomatedPanel.
 */
export function DigitAutomatedPanel({
  tradeType,
  contractMode,
  onContractModeChange,
  digitStats,
  selectedDigit,
  onSelectedDigitChange,
  isConnected,
  isAuthenticated,
  automation,
}: DigitAutomatedPanelProps) {
  const { settings, setSettings, isRunning, start, stop, netProfit, tradeCount, currentStake, stopReason } = automation;

  const updateBaseStake = (value: number | null) => {
    setSettings({ ...settings, baseStake: value ?? 0 });
  };

  const modeOptions = CONTRACT_MODE_OPTIONS[tradeType];
  const maxPct = Math.max(...digitStats.percentages);
  const minPct = Math.min(...digitStats.percentages);

  return (
    <div className="w-full space-y-3 lg:max-w-[400px] lg:space-y-4">
      <ToggleGroup
        type="single"
        value={contractMode}
        disabled={isRunning}
        onValueChange={(value) => {
          if (value) onContractModeChange(value as ContractMode);
        }}
        className="w-full gap-0 rounded-full bg-muted p-1"
      >
        {modeOptions.map((opt) => (
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
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Last digit prediction</span>
          <div className="grid grid-cols-5 gap-1.5">
            {digitStats.percentages.map((pct, digit) => {
              const isSelected = digit === selectedDigit;
              const isHighest = digitStats.totalTicks > 0 && pct === maxPct;
              const isLowest = digitStats.totalTicks > 0 && pct === minPct;
              return (
                <div key={digit} className="flex flex-col items-center gap-1">
                  <Button
                    variant={isSelected ? 'default' : 'outline'}
                    disabled={isRunning}
                    onClick={() => onSelectedDigitChange(digit)}
                    className={cn(
                      'w-10 h-10 text-sm font-semibold rounded-lg p-0',
                      !isSelected && 'bg-muted/50 border-muted-foreground/20'
                    )}
                  >
                    {digit}
                  </Button>
                  <span
                    className={cn(
                      'text-[10px] font-mono',
                      isHighest && 'text-green-500 font-semibold',
                      isLowest && 'text-red-500 font-semibold',
                      !isHighest && !isLowest && 'text-muted-foreground'
                    )}
                  >
                    {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
