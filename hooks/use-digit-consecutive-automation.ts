'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ProposalInfo, BuyResult } from '@deriv/core';
import type { OpenPosition } from '../lib/types';
import type { ContractMode } from '@/lib/digit-types';

export type ConsecutivePhase = 'idle' | 'collecting' | 'ready' | 'entered';

export interface ConsecutiveResult {
  contractId: number;
  profit: number;
  won: boolean;
  stake: number;
  predictedDigit: number;
}

/**
 * NEW — third automation option for Matches/Differs, alongside Watcher
 * (use-digits-match-diff-entry-automation.ts) and Frequency
 * (use-digit-frequency-automation.ts), neither of which this file touches.
 *
 * Entrance strategy: watches consecutive ticks. The moment the SAME digit
 * lands twice in a row, fires a trade on that digit immediately. Any tick
 * that doesn't match the immediately preceding one simply becomes the new
 * "pending" digit and the wait continues — there is no window, no count,
 * no tie-break; only the last two ticks ever matter.
 *   Examples:
 *     2, 2          -> fires on 2 the instant the second 2 lands
 *     1, 2, 1, 3     -> never fires; each tick breaks the previous one's
 *                       streak, so it just keeps waiting
 * The live display mirrors this exactly: while a digit is "pending" (seen
 * once, waiting to see if it repeats) it shows at 50%; the instant it
 * repeats it jumps to 100% and the trade fires; then it resets to empty
 * and starts waiting for the next candidate digit.
 *
 * Otherwise carries the same feature set as the Watcher bot (Stake,
 * Duration, Rounds, Start/Stop, results ledger) — no boost-after-loss,
 * stop-loss, or take-profit settings, matching what Watcher's own panel
 * exposes. No "which digit to watch" setting either (Watcher's Hold/
 * Swing/Flex), since this bot never pre-selects a digit — it's decided
 * entirely by which digit repeats.
 *
 * Architecture note: same async proposal/buyContract purchase flow as the
 * other two Matches/Differs bots — once a repeat is detected, this hook
 * waits for a fresh proposal priced for that digit + stake before firing.
 */
export interface ConsecutiveAutomationSettings {
  /** Hard cap on rounds placed before the run stops on its own. */
  maxRounds: number;
}

export const DEFAULT_CONSECUTIVE_SETTINGS: ConsecutiveAutomationSettings = {
  maxRounds: 5,
};

interface UseDigitConsecutiveAutomationParams {
  isConnected: boolean;
  isAuthenticated: boolean;
  contractMode: ContractMode;
  lastDigit: number | null;
  proposal: ProposalInfo | null;
  buyContract: () => Promise<void>;
  isBuying: boolean;
  buyResult: BuyResult | null;
  buyError: string | null;
  clearBuyResult: () => void;
  openPositions: OpenPosition[];
  stake: string;
  setStake: (value: string) => void;
  selectedDigit: number;
  setSelectedDigit: (digit: number) => void;
}

export interface UseDigitConsecutiveAutomationReturn {
  isRunning: boolean;
  phase: ConsecutivePhase;
  isValidSetup: boolean;
  start: () => void;
  stop: (reason?: string) => void;
  activePosition: OpenPosition | null;
  lastResult: ConsecutiveResult | null;
  results: ConsecutiveResult[];
  lastError: string | null;
  statusMessage: string;
  settings: ConsecutiveAutomationSettings;
  setSettings: (settings: ConsecutiveAutomationSettings) => void;
  roundCount: number;
  netProfit: number;
  stopReason: string | null;
  /** Live 2-slot display: the pending digit's slot is 1 (50%, waiting for
   *  a repeat) or 2 (100%, just matched) out of a fixed denominator of 2.
   *  Every other digit's slot is 0. Index = digit. */
  freqCounts: number[];
  /** Fixed at 2 once a cycle has started (denominator for the percentage
   *  display), 0 before the first tick of a fresh cycle. */
  ticksCollected: number;
  predictedDigit: number | null;
}

function emptyCounts(): number[] {
  return new Array(10).fill(0);
}

export function useDigitConsecutiveAutomation({
  isConnected,
  isAuthenticated,
  contractMode,
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
  selectedDigit,
  setSelectedDigit,
}: UseDigitConsecutiveAutomationParams): UseDigitConsecutiveAutomationReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<ConsecutivePhase>('idle');
  const [activeContractId, setActiveContractId] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<ConsecutiveResult | null>(null);
  const [results, setResults] = useState<ConsecutiveResult[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [settings, setSettings] = useState<ConsecutiveAutomationSettings>(DEFAULT_CONSECUTIVE_SETTINGS);
  const [roundCount, setRoundCount] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [stopReason, setStopReason] = useState<string | null>(null);
  const [freqCounts, setFreqCounts] = useState<number[]>(emptyCounts());
  const [ticksCollected, setTicksCollected] = useState(0);
  const [predictedDigit, setPredictedDigit] = useState<number | null>(null);

  const isRunningRef = useRef(false);
  const phaseRef = useRef<ConsecutivePhase>('idle');
  const settingsRef = useRef<ConsecutiveAutomationSettings>(DEFAULT_CONSECUTIVE_SETTINGS);
  const hasFired = useRef(false);
  const pendingContractId = useRef<number | null>(null);
  const currentStakeRef = useRef(0);
  // The digit currently "pending" — seen on the previous tick, waiting to
  // see whether the next tick repeats it. Null = nothing pending yet.
  const pendingDigitRef = useRef<number | null>(null);
  const latestProposalRef = useRef<ProposalInfo | null>(null);
  const staleProposalId = useRef<string | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    latestProposalRef.current = proposal;
  }, [proposal]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const isValidSetup = contractMode === 'DIGITMATCH' || contractMode === 'DIGITDIFF';

  const setPhaseBoth = (next: ConsecutivePhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const start = useCallback(() => {
    const parsedStake = parseFloat(stake);
    const startingStake = Number.isFinite(parsedStake) && parsedStake > 0 ? parsedStake : 0;

    hasFired.current = false;
    pendingContractId.current = null;
    isRunningRef.current = true;
    currentStakeRef.current = startingStake;
    pendingDigitRef.current = null;
    staleProposalId.current = null;

    setActiveContractId(null);
    setLastResult(null);
    setResults([]);
    setLastError(null);
    setStopReason(null);
    setRoundCount(0);
    setNetProfit(0);
    setFreqCounts(emptyCounts());
    setTicksCollected(0);
    setPredictedDigit(null);
    setPhaseBoth('collecting');
    setIsRunning(true);
  }, [stake]);

  const stop = useCallback((reason?: string) => {
    isRunningRef.current = false;
    setIsRunning(false);
    if (!hasFired.current) {
      setPhaseBoth('idle');
      pendingContractId.current = null;
    }
    if (reason) {
      setLastError(reason);
      setStopReason(reason);
    }
  }, []);

  useEffect(() => {
    if (isRunning && (!isConnected || !isAuthenticated)) {
      stop('Connection lost — automation stopped.');
    }
  }, [isConnected, isAuthenticated, isRunning, stop]);

  // COLLECT — consecutive-match detector. Every tick either confirms a
  // repeat of the pending digit (fire) or becomes the new pending digit
  // (keep waiting). No window, no tally across many digits — only the
  // immediately preceding tick ever matters.
  useEffect(() => {
    if (!isRunningRef.current) return;
    if (lastDigit === null) return;

    if (pendingDigitRef.current === null) {
      // First tick of a fresh cycle — nothing to compare against yet.
      pendingDigitRef.current = lastDigit;
      const counts = emptyCounts();
      counts[lastDigit] = 1;
      setFreqCounts(counts);
      setTicksCollected(2);
      return;
    }

    if (lastDigit === pendingDigitRef.current) {
      // Match — two in a row. Fire.
      const counts = emptyCounts();
      counts[lastDigit] = 2;
      setFreqCounts(counts);
      setTicksCollected(2);
      setPredictedDigit(lastDigit);

      if (lastDigit !== selectedDigit) {
        staleProposalId.current = latestProposalRef.current?.id ?? null;
        setSelectedDigit(lastDigit);
      }

      if (phaseRef.current === 'collecting') {
        setPhaseBoth('ready');
      }
      pendingDigitRef.current = null;
    } else {
      // Streak broken — restart with this tick as the new pending digit.
      pendingDigitRef.current = lastDigit;
      const counts = emptyCounts();
      counts[lastDigit] = 1;
      setFreqCounts(counts);
      setTicksCollected(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastDigit]);

  // BUY — fires once a live proposal reflects the predicted digit + intended stake.
  useEffect(() => {
    if (!isRunning || phase !== 'ready') return;
    if (hasFired.current) return;
    if (isBuying) return;
    if (!proposal) return;
    if (staleProposalId.current !== null && proposal.id === staleProposalId.current) return;
    if (Math.abs(proposal.askPrice - currentStakeRef.current) > 0.01) return;

    staleProposalId.current = null;
    hasFired.current = true;
    buyContract();
  }, [isRunning, phase, proposal, isBuying, buyContract]);

  useEffect(() => {
    if (!hasFired.current || phase !== 'ready' || !buyResult) return;
    pendingContractId.current = buyResult.contractId;
    setActiveContractId(buyResult.contractId);
    setPhaseBoth('entered');
    clearBuyResult();
  }, [buyResult, phase, clearBuyResult]);

  useEffect(() => {
    if (!hasFired.current || phase !== 'ready' || !buyError) return;
    hasFired.current = false;
    setLastError(buyError);
    clearBuyResult();
  }, [buyError, phase, clearBuyResult]);

  // SETTLE — round count, then the single stop check (max rounds). No
  // boost/stop-loss/take-profit — this bot keeps a flat stake, matching
  // what Watcher's panel exposes.
  useEffect(() => {
    if (phase !== 'entered') return;
    const contractId = pendingContractId.current;
    if (contractId === null) return;

    const position = openPositions.find((p) => p.contract_id === contractId);
    if (!position) return;

    const isClosed = !!position.is_sold || !!position.is_expired || position.status !== 'open';
    if (!isClosed) return;

    const profit = parseFloat(position.profit);
    const won = profit >= 0;
    const nextRoundCount = roundCount + 1;
    const nextNet = netProfit + profit;
    const roundStake = currentStakeRef.current;

    const result: ConsecutiveResult = {
      contractId,
      profit,
      won,
      stake: roundStake,
      predictedDigit: selectedDigit,
    };
    setLastResult(result);
    setResults((prev) => [...prev, result]);
    setRoundCount(nextRoundCount);
    setNetProfit(nextNet);
    pendingContractId.current = null;
    setActiveContractId(null);
    hasFired.current = false;

    if (!isRunningRef.current) {
      setPhaseBoth('idle');
      setIsRunning(false);
      return;
    }

    if (nextRoundCount >= settings.maxRounds) {
      isRunningRef.current = false;
      setIsRunning(false);
      setPhaseBoth('idle');
      setStopReason(`Reached max rounds (${settings.maxRounds}).`);
      return;
    }

    // Reset and start waiting for the next candidate digit.
    pendingDigitRef.current = null;
    setFreqCounts(emptyCounts());
    setTicksCollected(0);
    setPredictedDigit(null);

    if (phaseRef.current !== 'ready') {
      setPhaseBoth('collecting');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPositions, phase, roundCount, netProfit, settings, selectedDigit]);

  const activePosition =
    activeContractId !== null
      ? (openPositions.find((p) => p.contract_id === activeContractId) ?? null)
      : null;

  const statusMessage = !isValidSetup
    ? 'This bot only supports Matches/Differs.'
    : phase === 'collecting'
    ? `Waiting for a repeat — round ${Math.min(roundCount + 1, settings.maxRounds)} of ${settings.maxRounds}.`
    : phase === 'ready'
    ? `Ready — round ${Math.min(roundCount + 1, settings.maxRounds)} of ${settings.maxRounds}.`
    : phase === 'entered'
    ? 'Trade placed — waiting for it to settle.'
    : 'Idle';

  return {
    isRunning,
    phase,
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
    freqCounts,
    ticksCollected,
    predictedDigit,
  };
}
