'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { BuyResult, OpenPosition } from '../lib/types';
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

  const stop = useCallback((reason?: string) => {
    setIsRunning(false);
    roundActive.current = false;
    pendingContractId.current = null;
    sellInitiated.current = false;
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
    intendedStake.current = settings.baseStake;
    setStake(String(settings.baseStake));
    setIsRunning(true);
  }, [settings.baseStake, setStake]);

  // Stop if connection drops mid-run
  useEffect(() => {
    if (isRunning && (!isConnected || !isAuthenticated)) {
      stop('Connection lost — automation stopped.');
    }
  }, [isConnected, isAuthenticated, isRunning, stop]);

  // Trigger a new buy only when no round is active
  useEffect(() => {
    if (!isRunning) return;
    if (roundActive.current) return;
    if (isBuying) return;
    if (!proposal) return;
    if (Math.abs(proposal.askPrice - intendedStake.current) > 0.01) return;

    roundActive.current = true;
    buyContract();
  }, [isRunning, proposal, isBuying, buyContract]);

  // Record the contract ID after a successful buy
  useEffect(() => {
    if (!isRunning || !buyResult) return;
    pendingContractId.current = buyResult.contractId;
    sellInitiated.current = false;
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

  // Watch the live position and auto-sell when tick threshold is reached
  useEffect(() => {
    if (!isRunning || pendingContractId.current === null) return;
    const contractId = pendingContractId.current;
    const position = openPositions.find((p) => p.contract_id === contractId);

    // Contract not yet visible in positions — still waiting
    if (!position) return;

    // FIX: Only use is_sold / is_expired to detect closure.
    // Do NOT use position.status — it may be undefined or a non-'open' string
    // on active accumulators, which would falsely trigger a re-buy while the
    // contract is still running (causes "too many open positions" error).
    const isClosed = !!position.is_sold || !!position.is_expired;

    if (isClosed) {
      const profit = parseFloat(position.profit);
      if (Number.isNaN(profit)) return;

      pendingContractId.current = null;
      sellInitiated.current = false;

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
      return;
    }

    if (!sellInitiated.current && sellingId !== contractId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pos = position as any;

      // Try every field name Deriv uses for "ticks elapsed" across
      // proposal_open_contract vs portfolio vs v3 WebSocket streams.
      const tickCount: number | undefined = (() => {
        for (const key of ['tick_count', 'ticks_stayed_in', 'current_tick', 'ticks']) {
          const v = Number(pos[key]);
          if (!Number.isNaN(v) && pos[key] !== undefined && pos[key] !== null) return v;
        }
        return undefined;
      })();

      console.log('[accumulator-bot] tick check', {
        contractId,
        tickCount,
        target: settings.ticksToHold,
        is_sold: position.is_sold,
        is_expired: position.is_expired,
      });

      // NOTE: is_valid_to_sell intentionally not checked — stays 0 during the
      // accumulation window and would permanently block selling.
      if (typeof tickCount === 'number' && tickCount >= settings.ticksToHold) {
        console.log('[accumulator-bot] SELLING at tick', tickCount, contractId);
        sellInitiated.current = true;
        sellContract(contractId, position.bid_price);
      }
    }
  }, [openPositions, isRunning, settings, sellContract, sellingId, stop]);

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
