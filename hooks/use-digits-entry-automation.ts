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
  /** The stake this specific round was placed at (base stake, or doubled after a loss). */
  stake: number;
  /** The barrier setup this round actually ran at. Only meaningful for readouts — the
   * hook itself always drives off contractMode/selectedDigit at fire time. */
  contractMode?: ContractMode;
  selectedDigit?: number;
}

/**
 * The fixed Over/Under pair that Hybrid Mode alternates between. Barrier
 * digits are intentionally fixed at 1 and 8 (Over 1 / Under 8) rather than
 * derived from whatever digit happens to be selected in the manual
 * controls — the trader picks which SIDE to start on, not the digit.
 */
const HYBRID_PAIR: { contractMode: ContractMode; digit: number }[] = [
  { contractMode: 'DIGITOVER', digit: 1 },
  { contractMode: 'DIGITUNDER', digit: 8 },
];

/**
 * Adjustable run controls for the Over/Under entry watcher — mirrors the
 * Martingale settings pattern already used for Matches/Differs and Even/Odd
 * (see use-martingale-automation.ts), scoped to what this bot needs: a
 * stake multiplier applied after a loss, a hard cap on how many rounds a
 * single run will place, and a cumulative stop-loss.
 *
 * Stake behavior is intentionally NOT full Martingale: the stake doubles
 * only once after a loss. If that doubled-stake round also loses, the run
 * stops instead of doubling again — it never reaches a third stake level.
 * A win at any point resets to the base stake and the run continues (if
 * still within maxRounds / lossThreshold).
 */
export interface EntryAutomationSettings {
  /** Multiplier applied to the stake after the FIRST loss in a row (e.g. 2 = double on loss). A second consecutive loss stops the run instead of multiplying again. Resets to the run's starting stake after a win. */
  multiplier: number;
  /** Hard cap on the number of rounds a single run will place before stopping on its own, win or lose. */
  maxRounds: number;
  /** Stop the run once cumulative loss reaches this amount. Null = no limit. */
  lossThreshold: number | null;
  /**
   * ADDITIVE — off by default, does not change existing behavior. When
   * true, the bot alternates the barrier every round (win or lose)
   * between Over 1 and Under 8, starting on whichever side is selected
   * in the manual controls at Start. When false, behaves exactly as
   * before: locked on whatever barrier is selected.
   */
  hybridMode: boolean;
}

export const DEFAULT_ENTRY_AUTOMATION_SETTINGS: EntryAutomationSettings = {
  multiplier: 2,
  maxRounds: 5,
  lossThreshold: 10,
  hybridMode: false,
};

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
  /** Stake field (string, matches the rest of the app's controlled inputs) and its setter. Read as the run's starting/base stake at Start, then driven by this hook itself — doubled once on a loss, reset to the start value on a win — as rounds progress. */
  stake: string;
  setStake: (value: string) => void;
  /**
   * ADDITIVE — optional. Only required if you want Hybrid Mode to work.
   * Lets the hook flip the barrier itself between rounds. If omitted,
   * hybridMode is silently ignored and behavior is unchanged.
   */
  setContractMode?: (mode: ContractMode) => void;
  setSelectedDigit?: (digit: number) => void;
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
  /** Every round settled so far in the current (or most recently finished) run, in order — R1 first. Cleared on start(). */
  results: DigitEntryResult[];
  lastError: string | null;
  statusMessage: string;
  settings: EntryAutomationSettings;
  setSettings: (settings: EntryAutomationSettings) => void;
  /** Rounds completed so far in the current (or most recently finished) run. */
  roundCount: number;
  /** Cumulative profit/loss across the current (or most recently finished) run. */
  netProfit: number;
  /** Set when a run ends on its own — max rounds reached, stop-loss hit, or two losses in a row. Null while idle/watching/entered, or after a manual stop. */
  stopReason: string | null;
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
  stake,
  setStake,
  setContractMode,
  setSelectedDigit,
}: UseDigitsEntryAutomationParams): UseDigitsEntryAutomationReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<DigitEntryPhase>('idle');
  const [activeContractId, setActiveContractId] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<DigitEntryResult | null>(null);
  const [results, setResults] = useState<DigitEntryResult[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [settings, setSettings] = useState<EntryAutomationSettings>(DEFAULT_ENTRY_AUTOMATION_SETTINGS);
  const [roundCount, setRoundCount] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [stopReason, setStopReason] = useState<string | null>(null);

  // True from the moment we actually dispatch a buy until that contract is
  // confirmed settled. Distinct from `phase === 'entered'` so stop() can
  // check it synchronously without waiting for a state update.
  const hasFired = useRef(false);
  const pendingContractId = useRef<number | null>(null);
  // Mirrors isRunning synchronously so the settle effect can tell whether a
  // manual stop happened while the last-fired trade was still in flight,
  // without depending on a possibly-stale closure over `isRunning`.
  const isRunningRef = useRef(false);
  // Starting stake for the current run, and the stake the round in flight
  // is actually using — the round loop multiplies off these directly
  // rather than re-parsing the (disabled-while-running) Stake field, so
  // there's never any ambiguity about which value is authoritative.
  const baseStakeRef = useRef(0);
  const currentStakeRef = useRef(0);

  // ADDITIVE — Hybrid Mode state. Only used when settings.hybridMode is true.
  // slotIndexRef tracks which side of HYBRID_PAIR the run is currently on.
  const slotIndexRef = useRef(0);
  // Always mirrors the latest proposal, so effects that fire on other
  // triggers (like the settle effect) can read the current proposal id
  // without adding `proposal` to their dependency array.
  const latestProposalRef = useRef<ProposalInfo | null>(null);
  useEffect(() => {
    latestProposalRef.current = proposal;
  }, [proposal]);
  // When set, the WATCH effect below refuses to fire until it sees a
  // proposal whose id differs from this one — i.e. a fresh quote that
  // actually reflects the barrier we just shifted to. Prevents firing a
  // buy against a stale price left over from the previous barrier.
  const staleProposalId = useRef<string | null>(null);

  const triggerDigit = computeTriggerDigit(contractMode, selectedDigit);
  const isValidSetup = triggerDigit !== null;

  const start = useCallback(() => {
    const parsedStake = parseFloat(stake);
    const startingStake = Number.isFinite(parsedStake) && parsedStake > 0 ? parsedStake : 0;

    hasFired.current = false;
    pendingContractId.current = null;
    isRunningRef.current = true;
    baseStakeRef.current = startingStake;
    currentStakeRef.current = startingStake;
    staleProposalId.current = null;

    // ADDITIVE — Hybrid Mode: lock the starting slot to whichever side
    // (Over/Under) is currently selected, snapping the digit to the fixed
    // pair value (1 for Over, 8 for Under) if it isn't already there.
    if (settings.hybridMode && setContractMode && setSelectedDigit) {
      const startIndex = contractMode === 'DIGITUNDER' ? 1 : 0;
      slotIndexRef.current = startIndex;
      const startSetup = HYBRID_PAIR[startIndex];
      if (contractMode !== startSetup.contractMode || selectedDigit !== startSetup.digit) {
        staleProposalId.current = latestProposalRef.current?.id ?? null;
        setContractMode(startSetup.contractMode);
        setSelectedDigit(startSetup.digit);
      }
    }

    setActiveContractId(null);
    setLastResult(null);
    setResults([]);
    setLastError(null);
    setStopReason(null);
    setRoundCount(0);
    setNetProfit(0);
    setStake(String(startingStake));
    setPhase('watching');
    setIsRunning(true);
  }, [stake, setStake, settings.hybridMode, setContractMode, setSelectedDigit, contractMode, selectedDigit]);

  const stop = useCallback((reason?: string) => {
    isRunningRef.current = false;
    setIsRunning(false);
    if (!hasFired.current) {
      // Nothing has been placed yet — fully safe to cancel the watch.
      setPhase('idle');
      pendingContractId.current = null;
    }
    // If a trade is already live (hasFired === true), leave phase as
    // 'entered' and pendingContractId set — the settlement watcher below
    // keeps tracking it in the background so the result still gets
    // recorded, even though the bot is no longer "running" (and, per
    // isRunningRef being false, it will not start another round after).
    if (reason) {
      setLastError(reason);
      setStopReason(reason);
    }
  }, []);

  // Drop the automation if the connection goes away mid-watch.
  useEffect(() => {
    if (isRunning && (!isConnected || !isAuthenticated)) {
      stop('Connection lost — automation stopped.');
    }
  }, [isConnected, isAuthenticated, isRunning, stop]);

  // WATCH — fire the buy the instant the trigger digit lands, but only if a
  // proposal is actually available at that exact moment, and only once its
  // price reflects the stake this round is supposed to use. That second
  // check matters specifically after a loss doubles the stake — without it,
  // a stale-priced proposal from just before the stake changed could get
  // bought at the wrong size.
  //
  // ADDITIVE — also refuses to fire if the current proposal id matches
  // staleProposalId (a leftover quote from the barrier we just shifted off
  // of in Hybrid Mode). Only ever set when hybridMode is on, so this is a
  // no-op otherwise.
  useEffect(() => {
    if (!isRunning || phase !== 'watching') return;
    if (hasFired.current) return;
    if (!isValidSetup || triggerDigit === null) return;
    if (lastDigit === null || lastDigit !== triggerDigit) return;
    if (isBuying) return;
    if (!proposal) return;
    if (staleProposalId.current !== null && proposal.id === staleProposalId.current) return;
    if (Math.abs(proposal.askPrice - currentStakeRef.current) > 0.01) return;

    staleProposalId.current = null;
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
  // Absence from openPositions is never treated as "closed" here, so
  // there's no risk of mistaking subscription lag for settlement. Once
  // settled: record the round, then either stop (max rounds reached,
  // stop-loss hit, two losses in a row, or a manual stop happened while
  // this trade was in flight) or continue — doubling the stake once on a
  // loss, resetting to the run's starting stake on a win.
  useEffect(() => {
    if (phase !== 'entered') return;
    const contractId = pendingContractId.current;
    if (contractId === null) return;

    const position = openPositions.find((p) => p.contract_id === contractId);
    if (!position) return; // still waiting for the feed to catch up

    const isClosed = !!position.is_sold || !!position.is_expired || position.status !== 'open';
    if (!isClosed) return; // still running — it'll settle itself

    const profit = parseFloat(position.profit);
    const won = profit >= 0;
    const nextRoundCount = roundCount + 1;
    const nextNet = netProfit + profit;
    // The stake this round was actually placed at — captured before it's
    // possibly updated below for the next round.
    const roundStake = currentStakeRef.current;
    // Was the round that just settled already running at the doubled
    // stake (i.e. not the base stake)? Used below to decide whether a
    // loss should double again or stop the run.
    const wasAtDoubledStake = currentStakeRef.current > baseStakeRef.current + 0.01;

    const result: DigitEntryResult = {
      contractId,
      profit,
      won,
      stake: roundStake,
      contractMode,
      selectedDigit,
    };
    setLastResult(result);
    setResults((prev) => [...prev, result]);
    setRoundCount(nextRoundCount);
    setNetProfit(nextNet);
    pendingContractId.current = null;
    setActiveContractId(null);
    hasFired.current = false;

    if (!isRunningRef.current) {
      // Stopped manually while this trade was in flight — result is
      // recorded above, but do not start another round.
      setPhase('idle');
      setIsRunning(false);
      return;
    }

    if (nextRoundCount >= settings.maxRounds) {
      isRunningRef.current = false;
      setIsRunning(false);
      setPhase('idle');
      setStopReason(`Reached max rounds (${settings.maxRounds}).`);
      return;
    }

    if (settings.lossThreshold !== null && nextNet <= -settings.lossThreshold) {
      isRunningRef.current = false;
      setIsRunning(false);
      setPhase('idle');
      setStopReason(`Stop-loss reached: ${nextNet.toFixed(2)} USD.`);
      return;
    }

    if (!won && wasAtDoubledStake) {
      // Second loss in a row: the doubled-stake round also lost. Stop
      // instead of doubling to a third level.
      isRunningRef.current = false;
      setIsRunning(false);
      setPhase('idle');
      setStopReason('Two losses in a row — stopping.');
      return;
    }

    const nextStake = won ? baseStakeRef.current : currentStakeRef.current * settings.multiplier;
    currentStakeRef.current = nextStake;
    setStake(String(nextStake));

    // ADDITIVE — Hybrid Mode: flip to the other side of the fixed pair
    // every round, win or lose, and mark the current proposal as stale so
    // the WATCH effect waits for a fresh quote priced for the new barrier
    // before it's allowed to fire again.
    if (settings.hybridMode && setContractMode && setSelectedDigit) {
      const nextSlot = (slotIndexRef.current + 1) % HYBRID_PAIR.length;
      slotIndexRef.current = nextSlot;
      const nextSetup = HYBRID_PAIR[nextSlot];
      staleProposalId.current = latestProposalRef.current?.id ?? null;
      setContractMode(nextSetup.contractMode);
      setSelectedDigit(nextSetup.digit);
    }

    setPhase('watching');
  }, [openPositions, phase, roundCount, netProfit, settings, setStake, contractMode, selectedDigit, setContractMode, setSelectedDigit]);

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
    ? `Watching — round ${Math.min(roundCount + 1, settings.maxRounds)} of ${settings.maxRounds}${
        settings.hybridMode ? ` (hybrid: ${contractMode === 'DIGITOVER' ? 'Over 1' : 'Under 8'})` : ''
      }.`
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
    results,
    lastError,
    statusMessage,
    settings,
    setSettings,
    roundCount,
    netProfit,
    stopReason,
  };
}
