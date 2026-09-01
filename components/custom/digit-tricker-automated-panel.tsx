'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { NumberField } from '@/components/custom/automation-controls';
import type {
  UseDigitTrickerAutomationReturn,
  DigitShiftMode,
} from '@/hooks/use-digit-tricker-automation';
import type { ContractMode, DigitStats } from '@/lib/digit-types';
import type { DurationLimits } from '@deriv/core';

interface DigitTrickerAutomatedPanelProps {
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
  automation: UseDigitTrickerAutomationReturn;
}

const MODE_OPTIONS: { value: ContractMode; label: string }[] = [
  { value: 'DIGITMATCH', label: 'Matches' },
  { value: 'DIGITDIFF', label: 'Differs' },
];

const ROUND_OPTIONS = [3, 5, 10, 20, 50, 100];

const SHIFT_MODE_OPTIONS: { value: DigitShiftMode; label: string }[] = [
  { value: 'fixed', label: 'Hold' },
  { value: 'bounce', label: 'Swing' },
  { value: 'random', label: 'Flex' },
];

/**
 * "Tricker" panel — same layout and fields as Watcher's panel
 * (digit-match-diff-entry-automated-panel.tsx, untouched by this file),
 * plus one added section: Volatility rotation, showing the symbol Tricker
 * is currently trading on and a "Rounds per volatility" stepper (default
 * 1). Everything else — Stake/Duration/Boost/Stop-loss/Rounds/Mode — is
 * identical in behavior to Watcher.
 */
export function DigitTrickerAutomatedPanel({
  contractMode,
  onContractModeChange,
  selectedDigit,
  stake,
  onStakeChange,
  duration,
  onDurationChange,
  isConnected,
  isAuthenticated,
  automation,
}: DigitTrickerAutomatedPanelProps) {
  const {
    isRunning,
    phase,
    isValidSetup,
    start,
    stop,
    activePosition,
    results,
    netProfit,
    lastError,
    statusMessage,
    settings,
    setSettings,
    currentSymbolDisplayName,
  } = automation;

  const stakeNum = parseFloat(stake);
  const canStart = isConnected && isAuthenticated && !isRunning && isValidSetup && !!stakeNum && stakeNum > 0;
  const isMatch = contractMode === 'DIGITMATCH';

  return (
    <div className="w-full space-y-1 lg:space-y-1">
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

      <div className="rounded-md border border-border bg-muted/30 px-2 py-0.5 space-y-0">
        <p className="text-[9px] text-muted-foreground">Prediction</p>
        <div className="flex items-center gap-1.5">
          <p className="text-[11px] font-medium text-foreground">
            Last digit of the price will{' '}
            <span className={isMatch ? 'font-bold text-green-600 dark:text-green-400' : 'font-bold text-red-500'}>
              {isMatch ? 'match' : 'differ from'}
            </span>
          </p>
          <span
            className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
              isMatch ? 'bg-green-600' : 'bg-red-500'
            }`}
          >
            {selectedDigit}
          </span>
        </div>
      </div>

      {/* Volatility rotation — new section. Shows the symbol Tricker is
          currently on (or will start on) and lets the trader set how many
          rounds to stay on each volatility before switching. */}
      <div className="rounded-md border border-border bg-muted/30 px-2 py-0.5 space-y-0.5">
        <p className="text-[9px] text-muted-foreground">Volatility rotation</p>
        <p className="text-[11px] font-medium text-foreground">{currentSymbolDisplayName}</p>
        <NumberField
          label="Rounds per volatility"
          value={settings.roundsPerVolatility}
          onChange={(value) => setSettings({ ...settings, roundsPerVolatility: Math.max(1, Math.round(value ?? 1)) })}
          disabled={isRunning}
          step={1}
        />
      </div>

      <div className="grid grid-cols-2 gap-1.5">
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
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <NumberField
          label="Boost multiplier"
          value={settings.multiplier}
          onChange={(value) => setSettings({ ...settings, multiplier: Math.max(1, value ?? 10) })}
          suffix="×"
          disabled={isRunning}
          step={0.5}
        />
        <NumberField
          label="Stop-loss"
          value={settings.lossThreshold ?? 0}
          onChange={(value) => setSettings({ ...settings, lossThreshold: value && value > 0 ? value : null })}
          suffix="USD"
          disabled={isRunning}
          step={1}
        />
      </div>

      <div className="space-y-0.5">
        <p className="text-[9px] text-muted-foreground">Rounds</p>
        <ToggleGroup
          type="single"
          value={String(settings.maxRounds)}
          disabled={isRunning}
          onValueChange={(value) => {
            if (value) setSettings({ ...settings, maxRounds: Number(value) });
          }}
          className="w-full gap-0.5"
        >
          {ROUND_OPTIONS.map((n) => (
            <ToggleGroupItem
              key={n}
              value={String(n)}
              className="!w-5 !h-4 !min-w-0 !flex-none !px-0 rounded-md border border-border text-[9px] font-medium text-muted-foreground data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary data-[state=on]:font-bold hover:text-foreground"
            >
              {n}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="space-y-0.5">
        <p className="text-[10px] text-muted-foreground">Mode</p>
        <ToggleGroup
          type="single"
          value={settings.digitShiftMode}
          disabled={isRunning}
          onValueChange={(value) => {
            if (value) setSettings({ ...settings, digitShiftMode: value as DigitShiftMode });
          }}
          className="w-full gap-1"
        >
          {SHIFT_MODE_OPTIONS.map((opt) => (
            <ToggleGroupItem
              key={opt.value}
              value={opt.value}
              className="flex-1 h-6 rounded-md border border-border text-[10px] font-medium text-muted-foreground data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary data-[state=on]:font-bold hover:text-foreground"
            >
              {opt.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="rounded-md border border-border bg-muted/30 px-2 py-0.5 text-[10px]">
        {isValidSetup ? (
          <span className="text-muted-foreground">{statusMessage}</span>
        ) : (
          <span className="text-amber-600 dark:text-amber-400">{statusMessage}</span>
        )}
      </div>

      <div>
        {isRunning || phase === 'entered' ? (
          <Button variant="destructive" className="w-full h-6 text-[10px]" onClick={() => stop('Stopped manually')}>
            Stop
          </Button>
        ) : (
          <Button className="w-full h-6 text-[10px]" disabled={!canStart} onClick={start}>
            {!isAuthenticated
              ? 'Log in to trade'
              : !isConnected
              ? 'Connecting…'
              : !isValidSetup
              ? 'Pick a valid digit'
              : `Start Bot (${settings.maxRounds} rounds)`}
          </Button>
        )}
      </div>

      {(isRunning || phase === 'entered') && (
        <div className="rounded-md border border-blue-500/30 bg-blue-500/5 px-2 py-0.5 space-y-0 text-[10px]">
          <p className="text-[10px] font-medium text-blue-500 dark:text-blue-400">
            {phase === 'entered' ? 'Trade placed — waiting to settle…' : 'Watching for entry signal…'}
          </p>
          {activePosition && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current value</span>
              <span className="tabular-nums font-medium">{parseFloat(activePosition.bid_price).toFixed(2)} USD</span>
            </div>
          )}
        </div>
      )}

      {results.length > 0 && (
        <div className="rounded-md border border-border bg-muted/30 px-2 py-0.5 space-y-0 text-[10px]">
          <div className="flex justify-between items-center border-b border-border pb-0.5">
            <span className="text-muted-foreground">RESULTS</span>
            <span className={`tabular-nums font-bold ${netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
              {netProfit >= 0 ? '+' : ''}
              {netProfit.toFixed(2)} USD
            </span>
          </div>
          {results.map((result, index) => (
            <div key={result.contractId} className="flex justify-between">
              <span className="text-muted-foreground">
                R{index + 1} ${result.stake.toFixed(2)}
              </span>
              <span className={`tabular-nums font-medium ${result.won ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                {result.won ? '+' : ''}
                {result.profit.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {lastError && !isRunning && phase !== 'entered' && (
        <p className="text-[10px] text-muted-foreground rounded-md border border-border bg-muted/20 px-2 py-0.5">
          {lastError}
        </p>
      )}
    </div>
  );
}
