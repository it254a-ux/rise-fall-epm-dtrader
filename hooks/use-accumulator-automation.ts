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
  activePosition: OpenPosition | null;
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
  const [activeContractId, setActiveContractId] = useState<number | null>(null);

  const roundActive = useRef(false);
  const pendingContractId = useRef<number | null>(null);
  const sellInitiated = useRef(false);
  const intendedStake = useRef<number>(DEFAULT_ACCUMULATOR_AUTOMATION_SETTINGS.baseStake);
  const netProfitRef = useRef(0);
  const tradeCountRef = useRef(0);
  const ticksSinceBuy = useRef(0);
  const lastTickEpoch = useRef<number | null>(null);
  const capturedProfit = useRef(0);

  // Must have seen the position in openPositions at least once before Phase 2
  // can treat its absence as "closed". Prevents double-buy race condition.
  const positionEverSeen = useRef(false);

  const sellContractRef = useRef(sellContract);
  const openPositionsRef = useRef(openPositions);
  useEffect(() => { sellContractRef.current = sellContract; });
  useEffect(() => { openPositionsRef.current = openPositions; });

  const resetRoundState = () => {
    pendingContractId.current = null;
    sellInitiated.current = false;
    ticksSinceBuy.current = 0;
    lastTickEpoch.current = null;
    positionEverSeen.current = false;
  };

  const stop = useCallback((reason?: string) => {
    const contractId = pendingContractId.current;
    if (contractId !== null && !sellInitiated.current) {
      const position = openPositionsRef.current.find((p) => p.contract_id === contractId);
      if (position && !position.is_sold && !position.is_expired) {
        sellInitiated.current = true;
        sellContractRef.current(contractId, position.bid_price);
      }
    }
    setIsRunning(false);
    roundActive.current = false;
    resetRoundState();
    setActiveContractId(null);
    if (reason) setStopReason(reason);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback(() => {
    setStopReason(null);
    setNetProfit(0);
    setTradeCount(0);
    netProfitRef.current = 0;
    tradeCountRef.current = 0;
    roundActive.current = false;
    resetRoundState();
    setActiveContractId(null);
    intendedStake.current = settings.baseStake;
    setStake(String(settings.baseStake));
    setIsRunning(true);
  }, [settings.baseStake, setStake]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isRunning && (!isConnected || !isAuthenticated)) {
      stop('Connection lost — automation stopped.');
    }
  }, [isConnected, isAuthenticated, isRunning, stop]);

  useEffect(() => {
    if (!isRunning) return;
    if (roundActive.current) return;
    if (isBuying) return;
    if (!proposal) return;
    if (Math.abs(proposal.askPrice - intendedStake.current) > 0.01) return;
    roundActive.current = true;
    buyContract();
  }, [isRunning, proposal, isBuying, buyContract]);

  useEffect(() => {
    if (!isRunning || !buyResult) return;
    pendingContractId.current = buyResult.contractId;
    setActiveContractId(buyResult.contractId);
    sellInitiated.current = false;
    ticksSinceBuy.current = 0;
    lastTickEpoch.current = null;
    positionEverSeen.current = false;
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
  useEffect(() => {
    if (!isRunning || pendingContractId.current === null) return;
    if (sellInitiated.current) return;
    if (!currentTick) return;

    const epoch = (currentTick as { epoch?: number }).epoch ?? null;
    if (epoch !== null && epoch === lastTickEpoch.current) return;
    lastTickEpoch.current = epoch;
    ticksSinceBuy.current += 1;

    console.log('[accumulator-bot] tick', ticksSinceBuy.current, '/ target', settings.ticksToHold);

    if (ticksSinceBuy.current < settings.ticksToHold) return;

    const contractId = pendingContractId.current;
    const position = openPositions.find((p) => p.contract_id === contractId);

    if (!position || !!position.is_sold || !!position.is_expired) {
      capturedProfit.current = 0;
      sellInitiated.current = true;
      return;
    }

    capturedProfit.current = parseFloat(position.bid_price) - intendedStake.current;
    console.log('[accumulator-bot] selling — estimated profit', capturedProfit.current.toFixed(2));
    sellInitiated.current = true;
    sellContract(contractId, position.bid_price);
  }, [currentTick, isRunning, openPositions, settings.ticksToHold, sellContract]);

  // PHASE 2 — Wait for position to close, then settle the round.
  // Guard 1 (positionEverSeen): do not treat a missing position as "closed"
  // until we have confirmed it appeared in openPositions at least once.
  // This prevents Phase 2 from instantly settling before Deriv's portfolio
  // subscription has registered the newly bought contract, which was causing
  // the bot to attempt a second buy while the first was still open.
  // Guard 2 (sellingId): do not settle while the sell API call is in flight.
  useEffect(() => {
    if (!isRunning || !sellInitiated.current || pendingContractId.current === null) return;

    const contractId = pendingContractId.current;
    const position = openPositions.find((p) => p.contract_id === contractId);

    if (position) positionEverSeen.current = true;
    if (!positionEverSeen.current) return;
    if (sellingId === contractId) return;
    if (position && !position.is_sold && !position.is_expired) return;

    const profit = capturedProfit.current;
    resetRoundState();
    setActiveContractId(null);

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

    roundActive.current = false;
  }, [openPositions, sellingId, isRunning, settings, stop]);

  const activePosition =
    activeContractId !== null
      ? (openPositions.find((p) => p.contract_id === activeContractId) ?? null)
      : null;

  return {
    settings,
    setSettings,
    isRunning,
    start,
    stop,
    netProfit,
    tradeCount,
    stopReason,
    activePosition,
  };
}
