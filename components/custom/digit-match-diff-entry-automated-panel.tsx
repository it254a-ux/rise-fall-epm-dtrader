'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { NumberField } from '@/components/custom/automation-controls';
import type {
  UseDigitsMatchDiffEntryAutomationReturn,
  DigitShiftMode,
} from '@/hooks/use-digits-match-diff-entry-automation';
import type { ContractMode, DigitStats } from '@/lib/digit-types';
import type { DurationLimits } from '@deriv/core';

interface DigitMatchDiffEntryAutomatedPanelProps {
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
  automation: UseDigitsMatchDiffEntryAutomationReturn;
}

const MODE_OPTIONS: { value: ContractMode; label: string }[] = [
  { value: 'DIGITMATCH', label: 'Matches' },
  { value: 'DIGITDIFF', label: 'Differs' },
];

/** Preset round counts offered in the Rounds selector, matching the other automated bots in the app. */
const ROUND_OPTIONS = [3, 5, 10, 20, 50, 100];

/**
 * How the watched digit moves between rounds — see DigitShiftMode in the
 * hook. Labels are intentionally generic (Hold/Swing/Flex) rather than
 * descriptive of the underlying mechanism (fixed/bounce/random) — the
 * underlying values are unchanged, only what's shown on screen.
 */
const SHIFT_MODE_OPTIONS: { value: DigitShiftMode; label: string }[] = [
  { value: 'fixed', label: 'Hold' },
  { value: 'bounce', label: 'Swing' },
  { value: 'random', label: 'Flex' },
];

/**
 * Entry-watcher panel for Digit Matches/Differs, separate from the
 * classic martingale-based DigitAutomatedPanel (still used, untouched, for
 * Even/Odd). Places no trade on Start — arms and watches the live digit
 * stream, firing exactly one buy the instant the selected digit appears,
 * then lets the contract settle on its own.
 *
 * Mode (Hold by default — original behavior): optionally the watched
 * digit can move every round instead of staying fixed — either Swing
 * (predictable 0→9→0 step) or Flex (fresh random digit each round, no
 * detectable pattern). Results ledger intentionally does not show which
 * digit each round watched, same privacy policy as the Over/Under panel.
 *
 * LAYOUT FIX: removed lg:max-w-[240px] so content stretches to fill the
 * full width of the parent Card, matching the left-edge alignment on the
 * right side too. No other spacing or font sizes changed.
 */
export function DigitMatchDiffEntryAutomatedPanel({
  contractMode,
  onContractModeChange,
  lastDigit,
  selectedDigit,
  stake,
  onStakeChange,
  duration,
  onDurationChange,
  isConnected,
  isAuthenticated,
  automation,
}: DigitMatchDiffEntryAutomatedPanelProps) {
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
  } = automation;

  const stakeNum = parseFloat(stake);
  const canStart =
    isConnected && isAuthenticated && !isRunning && isValidSetup && !!stakeNum && stakeNum > 0;
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

      {/* Prediction summary. While a non-Hold mode is running, this updates
          on its own each round since selectedDigit is driven by the hook. */}
      <div className="rounded-md border border-border bg-muted/30 px-2 py-0.5 space-y-0.5">
        <p className="text-[10px] text-muted-foreground">Prediction</p>
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-foreground">
            Last digit of the price will{' '}
            <span className={isMatch ? 'font-bold text-green-600 dark:text-green-400' : 'font-bold text-red-500'}>
              {isMatch ? 'match' : 'differ from'}
            </span>
          </p>
          <span
            className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
              isMatch ? 'bg-green-600' : 'bg-red-500'
            }`}
          >
            {selectedDigit}
          </span>
        </div>
      </div>

      {/* Stake + Duration paired two-per-row, matching the other three
          digit panels. Unconditional grid — same on mobile and desktop. */}
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

      <div className="space-y-0.5">
        <p className="text-[10px] text-muted-foreground">Rounds</p>
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
              className="flex-1 h-5 rounded-md border border-border text-[9px] font-medium text-muted-foreground data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary data-[state=on]:font-bold hover:text-foreground"
            >
              {n}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Mode selector — Hold (original behavior) / Swing (predictable
          0→9→0 step) / Flex (fresh random digit every round, win or lose,
          so there's no detectable pattern). Defaults to Hold. Disabled
          while running, same as the other Start-time settings above.
          Section title kept generic on purpose — see file header note. */}
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
          <span className="text-muted-foreground">Armed — watching the tick stream for your entry signal…</span>
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
              <span className="tabular-nums font-medium">
                {parseFloat(activePosition.bid_price).toFixed(2)} USD
              </span>
            </div>
          )}
        </div>
      )}

      {/* Results ledger — no per-round digit tag here, same as the
          Over/Under panel, so the running mode/pattern isn't visible on
          screen to anyone glancing at it. */}
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
