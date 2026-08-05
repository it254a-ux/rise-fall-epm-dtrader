'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { BuyResult, OpenPosition } from '../lib/types';
import type { Tick } from '@deriv/core';
import type { AccumulatorProposalInfo } from './use-accumulator-proposal';
import type { AccumulatorAutomationSettings } from '@/lib/accumulator-types';
import { DEFAULT_ACCUMULATOR_AUTOMATION_SETTINGS } from '@/lib/accumulator-types';

export type { AccumulatorAutomationSettings };
export { DEFAULT_ACCUMULATOR_AUTOMATION_SETTINGS };

interface UseAccumulatorAutomationParams {
  isConnected: boolean;
  isAuthenticated: boolean;
  stake: string;
  setStake: (value: string) => void;
  proposal: AccumulatorProposalInfo | null;
  buyContract: () => Promise<void>;
  isBuying: boolean;
  buyResult: BuyResult | null;
  buyError: string | null;
  clearBuyResult: () => void;
  /** Live market tick stream — used to count ticks after each buy. */
  currentTick: Tick | null;
  openPositions: OpenPosition[];
  sellContract: (contractId: number, bidPrice: string) => Promise<void>;
  sellingId: number | null;
  sellError: string | null;
  clearSellError: () => void;
}

export interface UseAccumulatorAutomationReturn {
  settings: AccumulatorAutomationSettings;
  setSettings: (settings: AccumulatorAutomationSettings) => void;
  isRunning: boolean;
  start: () => void;
  stop: (reason?: string) => void;
  netProfit: number;
  tradeCount: number;
  stopReason: string | null;
}

export function useAccumulatorAutomation({
  isConnected,
  isAuthenticated,
  stake,
  setStake,
  proposal,
  buyContract,
  isBuying,
  buyResult,
  buyError,
  clearBuyResult,
  currentTick,
  openPositions,
  sellContract,
  sellingId,
  sellError,
  clearSellError,
}: UseAccumulatorAutomationParams): UseAccumulatorAutomationReturn {
  const [settings, setSettings] = useState<AccumulatorAutomationSettings>(
    DEFAULT_ACCUMULATOR_AUTOMATION_SETTINGS
  );
  const [isRunning, setIsRunning] = useState(false);
  const [netProfit, setNetProfit] = useState(0);
  const [tradeCount, setTradeCount] = useState(0);
  const [stopReason, setStopReason] = useState<string | null>(null);

  const roundActive = useRef(false);
  const pendingContractId = useRef<number | null>(null);
  const sellInitiated = useRef(false);
  const intendedStake = useRef<number>(DEFAULT_ACCUMULATOR_AUTOMATION_SETTINGS.baseStake);
  const netProfitRef = useRef(0);
  const tradeCountRef = useRef(0);

  // Tick counting — incremented on each new currentTick epoch after a buy.
  const ticksSinceBuy = useRef(0);
  const lastTickEpoch = useRef<number | null>(null);

  // Profit captured at the moment we trigger a sell (bid_price − stake).
  const capturedProfit = useRef(0);

  const stop = useCallback((reason?: string) => {
    setIsRunning(false);
    roundActive.current = false;
    pendingContractId.current = null;
    sellInitiated.current = false;
    ticksSinceBuy.current = 0;
    lastTickEpoch.current = null;
    if (reason) setStopReason(reason);
  }, []);

  const start = useCallback(() => {
    setStopReason(null);
    setNetProfit(0);
    setTradeCount(0);
    netProfitRef.current = 0;
    tradeCountRef.current = 0;
    roundActive.current = false;
    pendingContractId.current = null;
    sellInitiated.current = false;
    ticksSinceBuy.current = 0;
    lastTickEpoch.current = null;
    intendedStake.current = settings.baseStake;
    setStake(String(settings.baseStake));
    setIsRunning(true);
  }, [settings.baseStake, setStake]);

  // Stop if connection drops mid-run.
  useEffect(() => {
    if (isRunning && (!isConnected || !isAuthenticated)) {
      stop('Connection lost — automation stopped.');
    }
  }, [isConnected, isAuthenticated, isRunning, stop]);

  // Trigger a new buy only when no round is active.
  useEffect(() => {
    if (!isRunning) return;
    if (roundActive.current) return;
    if (isBuying) return;
    if (!proposal) return;
    if (Math.abs(proposal.askPrice - intendedStake.current) > 0.01) return;

    roundActive.current = true;
    buyContract();
  }, [isRunning, proposal, isBuying, buyContract]);

  // Record contract ID and reset tick counter after a successful buy.
  useEffect(() => {
    if (!isRunning || !buyResult) return;
    pendingContractId.current = buyResult.contractId;
    sellInitiated.current = false;
    ticksSinceBuy.current = 0;
    lastTickEpoch.current = null;
    tradeCountRef.current += 1;
    setTradeCount(tradeCountRef.current);
    clearBuyResult();
  }, [buyResult, isRunning, clearBuyResult]);

  useEffect(() => {
    if (!isRunning || !buyError) return;
    stop(`Trade failed: ${buyError}`);
    clearBuyResult();
  }, [buyError, isRunning, stop, clearBuyResult]);

  useEffect(() => {
    if (!isRunning || !sellError) return;
    stop(`Sell failed: ${sellError}`);
    clearSellError();
  }, [sellError, isRunning, stop, clearSellError]);

  // PHASE 1 — Count live market ticks and sell when threshold is reached.
  // We use currentTick (the real-time price stream) instead of openPositions
  // because the portfolio subscription does not stream per-tick updates for
  // accumulator contracts, so tick_count on openPositions is always stale.
  useEffect(() => {
    if (!isRunning || pendingContractId.current === null) return;
    if (sellInitiated.current) return;
    if (!currentTick) return;

    // Ignore duplicate ticks (same epoch = same server event).
    const epoch = (currentTick as { epoch?: number }).epoch ?? null;
    if (epoch !== null && epoch === lastTickEpoch.current) return;
    lastTickEpoch.current = epoch;

    ticksSinceBuy.current += 1;

    console.log('[accumulator-bot] tick', ticksSinceBuy.current, '/ target', settings.ticksToHold);

    if (ticksSinceBuy.current < settings.ticksToHold) return;

    // Threshold reached — find the open position and sell.
    const contractId = pendingContractId.current;
    const position = openPositions.find((p) => p.contract_id === contractId);

    if (!position || !!position.is_sold || !!position.is_expired) {
      // Position already closed (knocked out) — record 0 profit and continue.
      capturedProfit.current = 0;
      sellInitiated.current = true; // skip sell, go straight to settlement
      return;
    }

    // Capture profit at sell time: sell price (bid_price) minus what we staked.
    capturedProfit.current =
      parseFloat(position.bid_price) - intendedStake.current;

    console.log('[accumulator-bot] selling — estimated profit', capturedProfit.current.toFixed(2));
    sellInitiated.current = true;
    sellContract(contractId, position.bid_price);
  }, [currentTick, isRunning, openPositions, settings.ticksToHold, sellContract]);

  // PHASE 2 — Wait for the sold position to leave openPositions, then
  // record profit, check stop conditions, and start the next round.
  useEffect(() => {
    if (!isRunning || !sellInitiated.current || pendingContractId.current === null) return;

    const contractId = pendingContractId.current;
    const position = openPositions.find((p) => p.contract_id === contractId);

    // Still in openPositions and not yet marked sold — keep waiting.
    if (position && !position.is_sold && !position.is_expired) return;

    const profit = capturedProfit.current;
    pendingContractId.current = null;
    sellInitiated.current = false;
    ticksSinceBuy.current = 0;
    lastTickEpoch.current = null;

    const nextNet = netProfitRef.current + profit;
    netProfitRef.current = nextNet;
    setNetProfit(nextNet);

    if (nextNet >= settings.targetProfit) {
      stop(`Profit target reached: +${nextNet.toFixed(2)} USD`);
      return;
    }
    if (tradeCountRef.current >= settings.maxTrades) {
      stop(`Max trades (${settings.maxTrades}) reached`);
      return;
    }

    // Ready for next round.
    roundActive.current = false;
  }, [openPositions, isRunning, settings, stop]);

  return {
    settings,
    setSettings,
    isRunning,
    start,
    stop,
    netProfit,
    tradeCount,
    stopReason,
  };
}
