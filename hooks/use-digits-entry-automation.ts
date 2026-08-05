'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { BuyResult, ProposalInfo } from '@deriv/core';
import type { OpenPosition } from '../lib/types';
import type { ContractMode } from '@/lib/digit-types';

export type DigitEntryPhase = 'idle' | 'watching' | 'entered' | 'settled';

export interface DigitEntryResult {
  contractId: number;
  profit: number;
  won: boolean;
}

interface UseDigitsEntryAutomationParams {
  isConnected: boolean;
  isAuthenticated: boolean;
  /** Only DIGITOVER / DIGITUNDER are supported — the watcher is a no-op for other modes. */
  contractMode: ContractMode;
  /** The barrier digit currently selected in the manual controls (e.g. 1 for "Over 1", 8 for "Under 8"). */
  selectedDigit: number;
  /** Live last-digit of the current tick, already computed elsewhere. */
  lastDigit: number | null;
  proposal: ProposalInfo | null;
  buyContract: () => Promise<void>;
  isBuying: boolean;
  buyResult: BuyResult | null;
  buyError: string | null;
  clearBuyResult: () => void;
  openPositions: OpenPosition[];
}

export interface UseDigitsEntryAutomationReturn {
  isRunning: boolean;
  phase: DigitEntryPhase;
  /** The digit the bot is currently waiting for, or null if the mode isn't Over/Under or the barrier has no valid trigger. */
  triggerDigit: number | null;
  /** False when the current barrier is a degenerate value with no valid trigger digit (e.g. Over 0, Under 9). */
  isValidSetup: boolean;
  start: () => void;
  stop: (reason?: string) => void;
  activePosition: OpenPosition | null;
  lastResult: DigitEntryResult | null;
  lastError: string | null;
  statusMessage: string;
}

function computeTriggerDigit(contractMode: ContractMode, selectedDigit: number): number | null {
  if (contractMode === 'DIGITOVER') {
    const trigger = selectedDigit - 1;
    return trigger >= 0 && trigger <= 9 ? trigger : null;
  }
  if (contractMode === 'DIGITUNDER') {
    const trigger = selectedDigit + 1;
    return trigger >= 0 && trigger <= 9 ? trigger : null;
  }
  return null;
}

export function useDigitsEntryAutomation({
  isConnected,
  isAuthenticated,
  contractMode,
  selectedDigit,
  lastDigit,
  proposal,
  buyContract,
  isBuying,
  buyResult,
  buyError,
  clearBuyResult,
  openPositions,
}: UseDigitsEntryAutomationParams): UseDigitsEntryAutomationReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<DigitEntryPhase>('idle');
  const [activeContractId, setActiveContractId] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<DigitEntryResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // True from the moment we actually dispatch a buy until that contract is
  // confirmed settled. Distinct from `phase === 'entered'` so stop() can
  // check it synchronously without waiting for a state update.
  const hasFired = useRef(false);
  const pendingContractId = useRef<number | null>(null);

  const triggerDigit = computeTriggerDigit(contractMode, selectedDigit);
  const isValidSetup = triggerDigit !== null;

  const start = useCallback(() => {
    hasFired.current = false;
    pendingContractId.current = null;
    setActiveContractId(null);
    setLastResult(null);
    setLastError(null);
    setPhase('watching');
    setIsRunning(true);
  }, []);

  const stop = useCallback((reason?: string) => {
    setIsRunning(false);
    if (!hasFired.current) {
      // Nothing has been placed yet — fully safe to cancel the watch.
      setPhase('idle');
      pendingContractId.current = null;
    }
    // If a trade is already live (hasFired === true), leave phase as
    // 'entered' and pendingContractId set — the settlement watcher below
    // keeps tracking it in the background so the result still gets
    // recorded, even though the bot is no longer "running".
    if (reason) setLastError(reason);
  }, []);

  // Drop the automation if the connection goes away mid-watch.
  useEffect(() => {
    if (isRunning && (!isConnected || !isAuthenticated)) {
      stop('Connection lost — automation stopped.');
    }
  }, [isConnected, isAuthenticated, isRunning, stop]);

  // WATCH — fire the single buy the instant the trigger digit lands, but
  // only if a proposal is actually available at that exact moment. If the
  // proposal isn't ready on this tick, we simply keep watching for the next
  // occurrence rather than silently doing nothing and calling it "fired".
  useEffect(() => {
    if (!isRunning || phase !== 'watching') return;
    if (hasFired.current) return;
    if (!isValidSetup || triggerDigit === null) return;
    if (lastDigit === null || lastDigit !== triggerDigit) return;
    if (isBuying) return;
    if (!proposal) return;

    hasFired.current = true;
    buyContract();
  }, [isRunning, phase, lastDigit, triggerDigit, isValidSetup, isBuying, proposal, buyContract]);

  // Buy confirmed — start tracking the contract to settlement.
  useEffect(() => {
    if (!hasFired.current || phase !== 'watching' || !buyResult) return;
    pendingContractId.current = buyResult.contractId;
    setActiveContractId(buyResult.contractId);
    setPhase('entered');
    clearBuyResult();
  }, [buyResult, phase, clearBuyResult]);

  // Buy failed — nothing was placed, so resume watching for the next
  // occurrence of the trigger digit instead of stopping the whole run.
  useEffect(() => {
    if (!hasFired.current || phase !== 'watching' || !buyError) return;
    hasFired.current = false;
    setLastError(buyError);
    clearBuyResult();
  }, [buyError, phase, clearBuyResult]);

  // SETTLE — Digit contracts close on their own; we just watch for that.
  // Absence from openPositions is never treated as "closed" here, so there's
  // no risk of mistaking subscription lag for settlement.
  useEffect(() => {
    if (phase !== 'entered') return;
    const contractId = pendingContractId.current;
    if (contractId === null) return;

    const position = openPositions.find((p) => p.contract_id === contractId);
    if (!position) return; // still waiting for the feed to catch up

    const isClosed = !!position.is_sold || !!position.is_expired || position.status !== 'open';
    if (!isClosed) return; // still running — it'll settle itself

    const profit = parseFloat(position.profit);
    setLastResult({ contractId, profit, won: profit >= 0 });
    pendingContractId.current = null;
    setActiveContractId(null);
    hasFired.current = false;
    setPhase('idle');
    setIsRunning(false); // one trade per Start — done after settling
  }, [openPositions, phase]);

  const activePosition =
    activeContractId !== null
      ? (openPositions.find((p) => p.contract_id === activeContractId) ?? null)
      : null;

  const statusMessage = !isValidSetup
    ? contractMode === 'DIGITOVER'
      ? 'Pick a barrier above 0 to get a valid trigger digit.'
      : contractMode === 'DIGITUNDER'
      ? 'Pick a barrier below 9 to get a valid trigger digit.'
      : 'Entry watching only supports Over/Under.'
    : phase === 'watching'
    ? `Watching — will enter the instant a ${triggerDigit} lands.`
    : phase === 'entered'
    ? 'Trade placed — waiting for it to settle.'
    : 'Idle';

  return {
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
  };
}
