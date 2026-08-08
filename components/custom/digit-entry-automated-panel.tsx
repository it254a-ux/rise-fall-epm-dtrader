'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { NumberField } from '@/components/custom/automation-controls';
import { DigitStatsBar } from '@/components/custom/digit-stats-bar';
import type { UseDigitsEntryAutomationReturn } from '@/hooks/use-digits-entry-automation';
import type { ContractMode, DigitStats } from '@/lib/digit-types';
import type { DurationLimits } from '@deriv/core';

interface DigitEntryAutomatedPanelProps {
  contractMode: ContractMode;
  onContractModeChange: (mode: ContractMode) => void;
  digitStats: DigitStats;
  lastDigit: number | null;
  selectedDigit: number;
  onSelectedDigitChange: (digit: number) => void;
  stake: string;
  onStakeChange: (value: string) => void;
  duration: number;
  onDurationChange: (value: number) => void;
  durationLimits: DurationLimits;
  isConnected: boolean;
  isAuthenticated: boolean;
  automation: UseDigitsEntryAutomationReturn;
}

const MODE_OPTIONS: { value: ContractMode; label: string }[] = [
  { value: 'DIGITOVER', label: 'Over' },
  { value: 'DIGITUNDER', label: 'Under' },
];

/**
 * Automated panel for Digit Over/Under only. Unlike the martingale-based
 * DigitAutomatedPanel used by Matches/Differs and Even/Odd, this bot places
 * no trade at all when Start is clicked — it arms itself and watches the
 * live digit stream, firing exactly one buy the instant the trigger digit
 * appears (barrier − 1 for Over, barrier + 1 for Under), then lets the
 * contract settle on its own like any other digit contract.
 */
export function DigitEntryAutomatedPanel({
  contractMode,
  onContractModeChange,
  digitStats,
  lastDigit,
  selectedDigit,
  onSelectedDigitChange,
  stake,
  onStakeChange,
  duration,
  onDurationChange,
  isConnected,
  isAuthenticated,
  automation,
}: DigitEntryAutomatedPanelProps) {
  const {
    isRunning,
    phase,
    triggerDigit,
    isValidSetup,
    start,
    stop,
    activePosition,
    lastResult,
    lastError,
    statusMessage,
  } = automation;

  const stakeNum = parseFloat(stake);
  const canStart =
    isConnected && isAuthenticated && !isRunning && isValidSetup && !!stakeNum && stakeNum > 0;

  return (
    <div className="w-full space-y-1.5 lg:max-w-[240px] lg:space-y-2">
      <ToggleGroup
        type="single"
        value={contractMode}
        disabled={isRunning}
        onValueChange={(value) => {
          if (value) onContractModeChange(value as ContractMode);
        }}
        className="w-full gap-0 rounded-full bg-muted p-0.5"
      >
        {MODE_OPTIONS.map((opt) => (
          <ToggleGroupItem
            key={opt.value}
            value={opt.value}
            className="flex-1 h-6 rounded-full text-[10px] font-medium text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:font-bold data-[state=on]:shadow-sm hover:text-foreground"
          >
            {opt.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="h-40 sm:h-48">
        <DigitStatsBar
          digitStats={digitStats}
          selectedDigit={selectedDigit}
          onDigitSelect={onSelectedDigitChange}
          lastDigit={lastDigit}
        />
      </div>

      <NumberField
        label="Stake"
        value={stakeNum || 0}
        onChange={(value) => onStakeChange(String(value ?? 0))}
        suffix="USD"
        disabled={isRunning}
        step={0.01}
      />
      <NumberField
        label="Duration"
        value={duration}
        onChange={(value) => onDurationChange(Math.max(1, Math.round(value ?? 1)))}
        suffix="ticks"
        disabled={isRunning}
        step={1}
      />

      {/* Trigger-digit readout — updates live as the barrier changes */}
      <div className="rounded-md border border-border bg-muted/30 px-2 py-1 text-[10px]">
        {isValidSetup ? (
          <span className="text-muted-foreground">
            Will enter the instant a{' '}
            <span className="font-semibold text-foreground">{triggerDigit}</span> lands.
          </span>
        ) : (
          <span className="text-amber-600 dark:text-amber-400">{statusMessage}</span>
        )}
      </div>

      <div className="pt-0.5">
        {isRunning || phase === 'entered' ? (
          <Button variant="destructive" className="w-full h-8 text-xs" onClick={() => stop('Stopped manually')}>
            Stop
          </Button>
        ) : (
          <Button className="w-full h-8 text-xs" disabled={!canStart} onClick={start}>
            {!isAuthenticated
              ? 'Log in to trade'
              : !isConnected
              ? 'Connecting…'
              : !isValidSetup
              ? 'Pick a valid barrier'
              : 'Start'}
          </Button>
        )}
      </div>

      {/* Live status while watching or holding a placed trade */}
      {(isRunning || phase === 'entered') && (
        <div className="rounded-md border border-blue-500/30 bg-blue-500/5 px-2 py-1 space-y-0.5 text-[10px]">
          <p className="text-[10px] font-medium text-blue-500 dark:text-blue-400">
            {phase === 'entered' ? 'Trade placed — waiting to settle…' : `Watching for ${triggerDigit}…`}
          </p>
          {activePosition && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current value</span>
              <span className="tabular-nums font-medium">
                {parseFloat(activePosition.bid_price).toFixed(2)} USD
              </span>
            </div>
          )}
        </div>
      )}

      {/* Result of the last completed trade */}
      {lastResult && (
        <div className="rounded-md border border-border bg-muted/30 px-2 py-1 space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last trade</span>
            <span className={`tabular-nums font-medium ${lastResult.won ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
              {lastResult.won ? '+' : ''}
              {lastResult.profit.toFixed(2)} USD
            </span>
          </div>
        </div>
      )}

      {lastError && !isRunning && phase !== 'entered' && (
        <p className="text-[10px] text-muted-foreground rounded-md border border-border bg-muted/20 px-2 py-1">
          {lastError}
        </p>
      )}
    </div>
  );
}
