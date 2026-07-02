// components/custom/automated-panel.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

interface AutomatedPanelProps {
  stake: string;
  onStakeChange: (value: string) => void;
  proposal: { askPrice: number } | null;
  isRunning: boolean;
  onRun: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export function AutomatedPanel({
  stake,
  onStakeChange,
  proposal,
  isRunning,
  onRun,
  onStop,
  disabled,
}: AutomatedPanelProps) {
  const [strategy, setStrategy] = useState<'martingale'>('martingale');
  const [multiplier, setMultiplier] = useState(2);
  const [maxStake, setMaxStake] = useState('500');
  const [profitThreshold, setProfitThreshold] = useState('100');
  const [lossThreshold, setLossThreshold] = useState('50');
  const [allowEquals, setAllowEquals] = useState(false);

  const currentStake = (proposal?.askPrice ?? Number(stake)) || 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Strategy selector */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs font-medium text-muted-foreground">Strategy</Label>
        <button
          className="flex items-center justify-between w-full rounded-lg border border-border bg-background px-4 py-3 text-left hover:bg-accent/50 transition-colors"
        >
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground capitalize">{strategy}</span>
            <span className="text-xs text-muted-foreground">Double stake after loss</span>
          </div>
          <span className="text-muted-foreground">›</span>
        </button>
      </div>

      {/* Stake multiplier */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs font-medium text-muted-foreground">Stake multiplier</Label>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setMultiplier(m => Math.max(1.5, m - 0.5))}
            disabled={isRunning}
          >−</Button>
          <span className="flex-1 text-center text-sm font-semibold">x{multiplier}</span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setMultiplier(m => Math.min(10, m + 0.5))}
            disabled={isRunning}
          >+</Button>
        </div>
      </div>

      {/* Max stake */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1">
          <Label className="text-xs font-medium text-muted-foreground">Max. stake</Label>
          <div className="group relative">
            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 rounded-lg bg-neutral-800 text-white text-xs px-3 py-2 shadow-lg z-10">
              Maximum amount the bot will stake on any single trade
            </div>
          </div>
        </div>
        <Input
          type="number"
          value={maxStake}
          onChange={e => setMaxStake(e.target.value)}
          disabled={isRunning}
          className="h-10"
        />
      </div>

      {/* Duration & Initial stake (reused from manual) */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs font-medium text-muted-foreground">Initial stake</Label>
        <Input
          type="number"
          value={stake}
          onChange={e => onStakeChange(e.target.value)}
          disabled={isRunning}
          className="h-10"
        />
        <p className="text-xs text-muted-foreground">
          Current: {currentStake.toFixed(2)} USD
        </p>
      </div>

      {/* Allow equals */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-foreground">Allow equals</Label>
        <Switch
          checked={allowEquals}
          onCheckedChange={setAllowEquals}
          disabled={isRunning}
        />
      </div>

      {/* Risk management section */}
      <div className="flex flex-col gap-3 pt-2 border-t border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Risk management</p>
        
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-medium text-muted-foreground">Profit threshold</Label>
          <Input
            type="number"
            value={profitThreshold}
            onChange={e => setProfitThreshold(e.target.value)}
            disabled={isRunning}
            className="h-10"
            placeholder="Stop when profit reaches"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs font-medium text-muted-foreground">Loss threshold</Label>
          <Input
            type="number"
            value={lossThreshold}
            onChange={e => setLossThreshold(e.target.value)}
            disabled={isRunning}
            className="h-10"
            placeholder="Stop when loss reaches"
          />
        </div>
      </div>

      {/* Run/Stop button */}
      <Button
        onClick={isRunning ? onStop : onRun}
        disabled={disabled || !stake || Number(stake) <= 0}
        className={cn(
          "w-full h-12 text-base font-semibold gap-2",
          isRunning
            ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            : "bg-emerald-500 hover:bg-emerald-600 text-white"
        )}
      >
        {isRunning ? (
          <>
            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Stop
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <polygon points="4,2 14,8 4,14" />
            </svg>
            Run
          </>
        )}
      </Button>

      {/* Status strip */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-2">
          <span className={cn(
            "h-2 w-2 rounded-full",
            isRunning ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"
          )} />
          <span>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          <span>{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).replace('GMT', 'GMT')}</span>
        </div>
        <button className="hover:text-foreground transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
