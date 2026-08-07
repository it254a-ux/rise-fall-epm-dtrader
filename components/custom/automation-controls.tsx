'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  STRATEGIES,
  type MartingaleSettings,
  type StrategyId,
} from '@/hooks/use-martingale-automation';

export interface AutomationControlsProps {
  settings: MartingaleSettings;
  setSettings: (settings: MartingaleSettings) => void;
  isRunning: boolean;
  start: () => void;
  stop: () => void;
  netProfit: number;
  tradeCount: number;
  currentStake: number;
  stopReason: string | null;
  isConnected: boolean;
  isAuthenticated: boolean;
}

export function NumberField({
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
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
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

/** Dropdown for picking the strategy — click to open, list of options, click to select. */
function StrategySelect({
  value,
  onChange,
  disabled,
}: {
  value: StrategyId;
  onChange: (id: StrategyId) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const active = STRATEGIES.find((s) => s.id === value) ?? STRATEGIES[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapRef} className="relative space-y-1.5">
      <Label className="text-[10px] text-muted-foreground">Strategy</Label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full rounded-md border border-input bg-background px-3 py-2 text-[10px] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {active.label}
        <span className="text-muted-foreground">›</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full rounded-md border border-border bg-popover shadow-lg z-20 overflow-hidden">
          {STRATEGIES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onChange(s.id);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-3 text-[10px] font-medium transition-colors ${
                s.id === value ? 'bg-foreground text-background' : 'hover:bg-foreground/5 text-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Small hover/click info bubble, used next to the strategy name to explain what it does. */
function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Strategy info"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M8 7.5v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="8" cy="5.2" r="0.9" fill="currentColor" />
        </svg>
      </button>
      {show && (
        <div className="absolute bottom-full right-0 mb-2 w-48 rounded-lg bg-neutral-800 text-white text-[10px] px-3 py-2 shadow-lg z-20">
          {text}
        </div>
      )}
    </span>
  );
}

/**
 * Shared strategy-parameters / risk-management / run-stop block used by both
 * the Rise/Fall AutomatedPanel and the digit contracts' automated panel.
 * Callers render their own mode-specific toggle (direction / contract mode)
 * and the "Initial stake" field above this component.
 */
export function AutomationControls({
  settings,
  setSettings,
  isRunning,
  start,
  stop,
  netProfit,
  tradeCount,
  currentStake,
  stopReason,
  isConnected,
  isAuthenticated,
}: AutomationControlsProps) {
  const updateSetting = <K extends keyof MartingaleSettings>(key: K, value: MartingaleSettings[K]) => {
    setSettings({ ...settings, [key]: value });
  };

  const activeStrategy = STRATEGIES.find((s) => s.id === settings.strategyId) ?? STRATEGIES[0];
  const canStart = isConnected && isAuthenticated && settings.baseStake > 0 && !isRunning;

  return (
    <>
      <div className="pt-1 border-t border-border" />

      <p className="text-[10px] font-semibold text-foreground">Strategy parameters</p>

      <StrategySelect
        value={settings.strategyId}
        onChange={(id) => updateSetting('strategyId', id)}
        disabled={isRunning}
      />

      {settings.strategyId === 'martingale' ? (
        <NumberField
          label="Stake multiplier"
          value={settings.multiplier}
          onChange={(v) => updateSetting('multiplier', v ?? 1)}
          suffix="×"
          disabled={isRunning}
          step={0.1}
        />
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label className="text-[10px] text-muted-foreground">Stake increment</Label>
            <InfoTooltip text={activeStrategy.description} />
          </div>
          <Input
            type="number"
            value={settings.stakeIncrement}
            disabled={isRunning}
            step={0.01}
            min={0}
            onChange={(e) => updateSetting('stakeIncrement', parseFloat(e.target.value) || 0)}
            labelRight="unit"
          />
        </div>
      )}

      <NumberField
        label="Max. stake"
        value={settings.maxStake}
        onChange={(v) => updateSetting('maxStake', v)}
        suffix="USD"
        disabled={isRunning}
        step={0.01}
      />

      <p className="text-[10px] font-semibold text-foreground pt-1">Risk management</p>

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

      {(isRunning || tradeCount > 0) && (
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 space-y-1 text-[10px]">
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
        <p className="text-[10px] text-muted-foreground">{stopReason}</p>
      )}

      {!isAuthenticated && (
        <p className="text-[10px] text-muted-foreground">Log in to run automated trading.</p>
      )}

      <div className="w-full">
        {isRunning ? (
          <Button className="w-full rounded-full" size="lg" variant="destructive" onClick={() => stop()}>
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
    </>
  );
}
