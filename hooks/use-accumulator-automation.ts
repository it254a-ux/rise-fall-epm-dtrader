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
  /** Set when a run ends on its own. Null while idle or running. */
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

  useEffect(() => {
    if (!isRunning || pendingContractId.current === null) return;
    const contractId = pendingContractId.current;
    const position = openPositions.find((p) => p.contract_id === contractId);
    if (!position) return;

    const isClosed =
      !!position.is_sold || !!position.is_expired || position.status !== 'open';

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
      const tickCount = (position as OpenPosition & { tick_count?: number }).tick_count;
      const isValidToSell = (position as OpenPosition & { is_valid_to_sell?: boolean }).is_valid_to_sell;

      if (
        typeof tickCount === 'number' &&
        tickCount >= settings.ticksToHold &&
        isValidToSell === true
      ) {
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
