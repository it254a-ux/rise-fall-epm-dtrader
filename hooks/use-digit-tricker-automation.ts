'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { BuyResult, ProposalInfo, ActiveSymbol } from '@deriv/core';
import type { OpenPosition } from '../lib/types';
import type { ContractMode } from '@/lib/digit-types';
import { getSymbolDisplayName } from '@/lib/active-symbols-display-names';

export type TrickerEntryPhase = 'idle' | 'watching' | 'entered' | 'settled';

export interface TrickerEntryResult {
  contractId: number;
  profit: number;
  won: boolean;
  /** The stake this specific round was placed at (base stake, or elevated after a loss). */
  stake: number;
  selectedDigit?: number;
  /** Which volatility symbol this round was placed on. */
  symbol?: string;
}

/**
 * NEW — "Tricker" bot for Matches/Differs. Same entry-watcher mechanics as
 * "Watcher" (use-digits-match-diff-entry-automation.ts, untouched by this
 * file — Tricker is a separate hook, not a modification of it): watches
 * for the selected digit itself, fires one buy, lets it settle, same
 * Boost-multiplier / Stop-loss / Rounds / Mode (Hold/Swing/Flex) feature
 * set for the DIGIT.
 *
 * On top of that, Tricker rotates the TRADED SYMBOL through a fixed list
 * of seven Volatility (1s) indices after every N rounds (N = "rounds per
 * volatility", default 1, user-configurable). The rotation alternates
 * direction each full pass through the list — forward through all seven,
 * then backward, then forward again — the same bounce pattern Watcher
 * already uses for its own Swing digit mode, just applied to the symbol
 * list instead of to a digit.
 */
export type DigitShiftMode = 'fixed' | 'bounce' | 'random';

/**
 * Rotation order as specified: Volatility 90, 25, 100, 75, 30, 50, 15, 10
 * (all "(1s) Index" variants). '1HZ15V' and '1HZ90V' and '1HZ30V' were not
 * found in lib/active-symbols-display-names.ts (that file only had 10/25/
 * 50/75/100) — they are still valid Deriv symbol codes following the same
 * '1HZ{n}V' convention as the confirmed ones, but display names for them
 * will fall back to the raw code unless added to that file. Availability
 * on your specific account is checked at runtime — see availableSymbols
 * below.
 */
export const TRICKER_ROTATION_SYMBOLS = [
  '1HZ90V',
  '1HZ25V',
  '1HZ100V',
  '1HZ75V',
  '1HZ30V',
  '1HZ50V',
  '1HZ15V',
  '1HZ10V',
] as const;

export interface TrickerAutomationSettings {
  /** Same as Watcher — multiplier applied to base stake, held for 3 rounds after a loss at base stake. */
  multiplier: number;
  /** Hard cap on the number of rounds a single run will place before stopping on its own. */
  maxRounds: number;
  /** Stop the run once cumulative loss reaches this amount. Null = no limit. */
  lossThreshold: number | null;
  /** How the watched DIGIT moves between rounds — identical semantics to Watcher's Mode. */
  digitShiftMode: DigitShiftMode;
  /** How many rounds to stay on each volatility before rotating to the next one. Default 1. */
  roundsPerVolatility: number;
}

export const DEFAULT_TRICKER_SETTINGS: TrickerAutomationSettings = {
  multiplier: 10,
  maxRounds: 5,
  lossThreshold: 10,
  digitShiftMode: 'fixed',
  roundsPerVolatility: 1,
};

const ELEVATED_STAKE_ROUND_COUNT = 3;

interface UseDigitTrickerAutomationParams {
  isConnected: boolean;
  isAuthenticated: boolean;
  contractMode: ContractMode;
  selectedDigit: number;
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
  setSelectedDigit?: (digit: number) => void;
  /** Currently active chart symbol. */
  activeSymbol: ActiveSymbol | null;
  /** Switches the traded/charted symbol — same function DigitsBody already passes to the chart. */
  selectSymbol: (symbol: string) => void;
  /**
   * Optional — the account's actual tradable symbol list (digits.symbols
   * in DigitsBody). When provided, Tricker's rotation is filtered to only
   * symbols confirmed available, skipping any of the seven that aren't
   * offered rather than switching to an invalid symbol. If omitted,
   * Tricker uses the full rotation list as-is.
   */
  availableSymbols?: ActiveSymbol[];
}

export interface UseDigitTrickerAutomationReturn {
  isRunning: boolean;
  phase: TrickerEntryPhase;
  triggerDigit: number | null;
  isValidSetup: boolean;
  start: () => void;
  stop: (reason?: string) => void;
  activePosition: OpenPosition | null;
  lastResult: TrickerEntryResult | null;
  results: TrickerEntryResult[];
  lastError: string | null;
  statusMessage: string;
  settings: TrickerAutomationSettings;
  setSettings: (settings: TrickerAutomationSettings) => void;
  roundCount: number;
  netProfit: number;
  stopReason: string | null;
  /** The volatility symbol Tricker is currently trading / about to trade on. */
  currentSymbol: string;
  /** Human-readable name for currentSymbol (e.g. "Volatility 90 (1s) Index"). */
  currentSymbolDisplayName: string;
}

/** Steps an index by 1 within [0, length-1], reversing direction at either boundary instead of overshooting. */
function nextBounceIndex(
  current: number,
  direction: 1 | -1,
  length: number
): { next: number; direction: 1 | -1 } {
  const candidate = current + direction;
  if (candidate > length - 1 || candidate < 0) {
    const reversed: 1 | -1 = direction === 1 ? -1 : 1;
    return { next: current + reversed, direction: reversed };
  }
  return { next: candidate, direction };
}

/** Steps a digit by 1 in the given direction, reversing direction at the 0/9 boundary. Identical to Watcher's helper. */
function nextBounceDigit(current: number, direction: 1 | -1): { next: number; direction: 1 | -1 } {
  const candidate = current + direction;
  if (candidate > 9 || candidate < 0) {
    const reversed: 1 | -1 = direction === 1 ? -1 : 1;
    return { next: current + reversed, direction: reversed };
  }
  return { next: candidate, direction };
}

function randomDigit(): number {
  return Math.floor(Math.random() * 10);
}

export function useDigitTrickerAutomation({
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
  setSelectedDigit,
  activeSymbol,
  selectSymbol,
  availableSymbols,
}: UseDigitTrickerAutomationParams): UseDigitTrickerAutomationReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<TrickerEntryPhase>('idle');
  const [activeContractId, setActiveContractId] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<TrickerEntryResult | null>(null);
  const [results, setResults] = useState<TrickerEntryResult[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [settings, setSettings] = useState<TrickerAutomationSettings>(DEFAULT_TRICKER_SETTINGS);
  const [roundCount, setRoundCount] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [stopReason, setStopReason] = useState<string | null>(null);
  const [currentSymbol, setCurrentSymbol] = useState<string>(TRICKER_ROTATION_SYMBOLS[0]);

  const hasFired = useRef(false);
  const pendingContractId = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const baseStakeRef = useRef(0);
  const currentStakeRef = useRef(0);
  const elevatedRoundsLeftRef = useRef(0);

  const bounceDirectionRef = useRef<1 | -1>(1);
  const latestProposalRef = useRef<ProposalInfo | null>(null);
  useEffect(() => {
    latestProposalRef.current = proposal;
  }, [proposal]);
  const staleProposalId = useRef<string | null>(null);

  // Rotation state — separate from the digit-shift state above.
  const rotationListRef = useRef<string[]>([...TRICKER_ROTATION_SYMBOLS]);
  const rotationIndexRef = useRef(0);
  const rotationDirectionRef = useRef<1 | -1>(1);
  const roundsOnVolatilityRef = useRef(0);

  const triggerDigit = selectedDigit;
  const isValidSetup = contractMode === 'DIGITMATCH' || contractMode === 'DIGITDIFF';

  const start = useCallback(() => {
    const parsedStake = parseFloat(stake);
    const startingStake = Number.isFinite(parsedStake) && parsedStake > 0 ? parsedStake : 0;

    // Filter rotation to symbols confirmed available on this account, if
    // the caller supplied the real symbol list. Falls back to the full
    // list if nothing could be confirmed, rather than blocking the run.
    const filtered =
      availableSymbols && availableSymbols.length > 0
        ? TRICKER_ROTATION_SYMBOLS.filter((sym) => availableSymbols.some((s) => s.underlying_symbol === sym))
        : [...TRICKER_ROTATION_SYMBOLS];
    rotationListRef.current = filtered.length > 0 ? filtered : [...TRICKER_ROTATION_SYMBOLS];

    hasFired.current = false;
    pendingContractId.current = null;
    isRunningRef.current = true;
    baseStakeRef.current = startingStake;
    currentStakeRef.current = startingStake;
    staleProposalId.current = null;
    bounceDirectionRef.current = 1;
    elevatedRoundsLeftRef.current = 0;

    rotationIndexRef.current = 0;
    rotationDirectionRef.current = 1;
    roundsOnVolatilityRef.current = 0;
    const firstSymbol = rotationListRef.current[0];
    setCurrentSymbol(firstSymbol);
    if (activeSymbol?.underlying_symbol !== firstSymbol) {
      staleProposalId.current = latestProposalRef.current?.id ?? null;
      selectSymbol(firstSymbol);
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
  }, [stake, setStake, activeSymbol, selectSymbol, availableSymbols]);

  const stop = useCallback((reason?: string) => {
    isRunningRef.current = false;
    setIsRunning(false);
    if (!hasFired.current) {
      setPhase('idle');
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

  // WATCH — fire the buy the instant the selected digit lands on the
  // currently active symbol, once a fresh, correctly priced proposal is available.
  useEffect(() => {
    if (!isRunning || phase !== 'watching') return;
    if (hasFired.current) return;
    if (!isValidSetup || triggerDigit === null) return;
    if (lastDigit === null || lastDigit !== triggerDigit) return;
    if (isBuying) return;
    if (!proposal) return;
    if (staleProposalId.current !== null && proposal.id === staleProposalId.current) return;
    if (Math.abs(proposal.askPrice - currentStakeRef.current) > 0.01) return;
    // Defensive guard: don't fire if the chart's active symbol hasn't
    // caught up to the symbol Tricker intends to trade on yet.
    if (activeSymbol && activeSymbol.underlying_symbol !== currentSymbol) return;

    staleProposalId.current = null;
    hasFired.current = true;
    buyContract();
  }, [
    isRunning,
    phase,
    lastDigit,
    triggerDigit,
    isValidSetup,
    isBuying,
    proposal,
    buyContract,
    activeSymbol,
    currentSymbol,
  ]);

  useEffect(() => {
    if (!hasFired.current || phase !== 'watching' || !buyResult) return;
    pendingContractId.current = buyResult.contractId;
    setActiveContractId(buyResult.contractId);
    setPhase('entered');
    clearBuyResult();
  }, [buyResult, phase, clearBuyResult]);

  useEffect(() => {
    if (!hasFired.current || phase !== 'watching' || !buyError) return;
    hasFired.current = false;
    setLastError(buyError);
    clearBuyResult();
  }, [buyError, phase, clearBuyResult]);

  // SETTLE
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

    const result: TrickerEntryResult = {
      contractId,
      profit,
      won,
      stake: roundStake,
      selectedDigit,
      symbol: currentSymbol,
    };
    setLastResult(result);
    setResults((prev) => [...prev, result]);
    setRoundCount(nextRoundCount);
    setNetProfit(nextNet);
    pendingContractId.current = null;
    setActiveContractId(null);
    hasFired.current = false;

    if (!isRunningRef.current) {
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

    // Elevated stake — identical rule to Watcher.
    let nextStake: number;
    if (elevatedRoundsLeftRef.current > 0) {
      elevatedRoundsLeftRef.current -= 1;
      nextStake =
        elevatedRoundsLeftRef.current > 0 ? baseStakeRef.current * settings.multiplier : baseStakeRef.current;
    } else if (!won) {
      elevatedRoundsLeftRef.current = ELEVATED_STAKE_ROUND_COUNT;
      nextStake = baseStakeRef.current * settings.multiplier;
    } else {
      nextStake = baseStakeRef.current;
    }
    currentStakeRef.current = nextStake;
    setStake(String(nextStake));

    // Digit shift — identical rule to Watcher's Mode (Hold/Swing/Flex).
    let digitChanged = false;
    if (settings.digitShiftMode !== 'fixed' && setSelectedDigit) {
      let nextDigit: number;
      if (settings.digitShiftMode === 'random') {
        nextDigit = randomDigit();
      } else {
        const { next, direction } = nextBounceDigit(selectedDigit, bounceDirectionRef.current);
        bounceDirectionRef.current = direction;
        nextDigit = next;
      }
      if (nextDigit !== selectedDigit) {
        digitChanged = true;
        setSelectedDigit(nextDigit);
      }
    }

    // Volatility rotation — after every settings.roundsPerVolatility
    // rounds, move to the next symbol in the rotation list. Direction
    // alternates each full pass through the list (forward, then
    // backward, then forward again…), the same bounce pattern as Swing
    // mode, applied to the symbol list instead of a digit.
    roundsOnVolatilityRef.current += 1;
    let symbolChanged = false;
    if (roundsOnVolatilityRef.current >= Math.max(1, settings.roundsPerVolatility)) {
      roundsOnVolatilityRef.current = 0;
      const list = rotationListRef.current;
      const { next, direction } = nextBounceIndex(
        rotationIndexRef.current,
        rotationDirectionRef.current,
        list.length
      );
      rotationIndexRef.current = next;
      rotationDirectionRef.current = direction;
      const nextSymbol = list[next];
      if (nextSymbol !== currentSymbol) {
        symbolChanged = true;
        setCurrentSymbol(nextSymbol);
        selectSymbol(nextSymbol);
      }
    }

    // Mark the current proposal stale whenever the digit and/or symbol
    // actually changed, so WATCH waits for a fresh quote priced for the
    // new digit/symbol before firing again — same guard Watcher already
    // uses for digit shifts, extended here to also cover symbol switches.
    if (digitChanged || symbolChanged) {
      staleProposalId.current = latestProposalRef.current?.id ?? null;
    }

    setPhase('watching');
  }, [
    openPositions,
    phase,
    roundCount,
    netProfit,
    settings,
    setStake,
    selectedDigit,
    setSelectedDigit,
    currentSymbol,
    selectSymbol,
  ]);

  const activePosition =
    activeContractId !== null ? (openPositions.find((p) => p.contract_id === activeContractId) ?? null) : null;

  const currentSymbolDisplayName = getSymbolDisplayName(currentSymbol);

  const statusMessage = !isValidSetup
    ? 'Entry watching only supports Matches/Differs.'
    : phase === 'watching'
    ? `Watching ${currentSymbolDisplayName} — round ${Math.min(roundCount + 1, settings.maxRounds)} of ${settings.maxRounds}.`
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
    currentSymbol,
    currentSymbolDisplayName,
  };
}
