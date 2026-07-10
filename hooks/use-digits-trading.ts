'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  useProposal,
  useBuy,
} from '@deriv/core';
import type {
  ActiveSymbol,
  Tick,
  ProposalInfo,
  ProposalParams,
  DurationLimits,
  BuyResult,
} from '@deriv/core';
import { useBaseTrading } from '@/hooks/use-base-trading';
import type { UseBaseTradingParams } from '@/hooks/use-base-trading';
import { computeDigitStats, getLastDigit } from '@/lib/digit-stats';
import type { ContractMode, TradeType, DigitStats } from '@/lib/digit-types';
import type { OpenPosition, ClosedPosition } from '../lib/types';

const CONTRACT_TYPES = ['DIGITMATCH', 'DIGITDIFF', 'DIGITOVER', 'DIGITUNDER', 'DIGITEVEN', 'DIGITODD'];
const MAX_PRICES = 1000;

interface UseDigitsTradingReturn {
  ws: ReturnType<typeof useBaseTrading>['ws'];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  symbols: ActiveSymbol[];
  activeSymbol: ActiveSymbol | null;
  selectSymbol: (symbol: string) => void;
  currentTick: Tick | null;
  lastDigit: number | null;
  digitStats: DigitStats;
  prices: number[];
  tradeType: TradeType;
  setTradeType: (type: TradeType) => void;
  contractMode: ContractMode;
  setContractMode: (mode: ContractMode) => void;
  selectedDigit: number;
  setSelectedDigit: (digit: number) => void;
  contractsAvailable: boolean;
  pipSize: number;
  stake: string;
  setStake: (value: string) => void;
  duration: number;
  setDuration: (value: number) => void;
  durationLimits: DurationLimits;
  defaultStake: number;
  proposal: ProposalInfo | null;
  isProposalLoading: boolean;
  buyContract: () => Promise<void>;
  isBuying: boolean;
  buyResult: BuyResult | null;
  buyError: string | null;
  clearBuyResult: () => void;
  openPositions: OpenPosition[];
  closedPositions: ClosedPosition[];
  sellContract: (contractId: number, bidPrice: string) => Promise<void>;
  sellingId: number | null;
  sellError: string | null;
  clearSellError: () => void;
}

export type UseDigitsTradingParams = Pick<UseBaseTradingParams, 'ws' | 'isConnected' | 'isExhausted' | 'isAuthenticated' | 'onAuthWSFailed'>;

export function useDigitsTrading({ ws, isConnected, isExhausted, isAuthenticated, onAuthWSFailed }: UseDigitsTradingParams): UseDigitsTradingReturn {
  const {
    ws: tradingWs,
    isConnected: tradingIsConnected,
    isLoading,
    error,
    symbols,
    activeSymbol,
    selectSymbol,
    prices: basePrices,
    pipSize,
    contractsAvailable,
    durationLimits,
    defaultStake,
    openPositions,
    closedPositions,
    sellContract,
    sellingId,
    sellError,
    clearSellError,
  } = useBaseTrading({ ws, isConnected, isExhausted, isAuthenticated, onAuthWSFailed, contractTypes: CONTRACT_TYPES });

  const [tradeType, setTradeTypeRaw] = useState<TradeType>('matches-differs');
  const [contractMode, setContractMode] = useState<ContractMode>('DIGITMATCH');
  const [selectedDigit, setSelectedDigit] = useState<number>(5);
  const [stake, setStake] = useState<string>('10');
  const [duration, setDuration] = useState<number>(5);

  const setTradeType = useCallback((type: TradeType) => {
    setTradeTypeRaw(type);
    switch (type) {
      case 'matches-differs':
        setContractMode('DIGITMATCH');
        break;
      case 'over-under':
        setContractMode('DIGITOVER');
        break;
      case 'even-odd':
        setContractMode('DIGITEVEN');
        break;
    }
  }, []);

  const [ownPrices, setOwnPrices] = useState<number[]>([]);
  const [ownCurrentTick, setOwnCurrentTick] = useState<Tick | null>(null);
  const historySeededRef = useRef(false);

  useEffect(() => {
    if (!historySeededRef.current && basePrices.length > 0) {
      historySeededRef.current = true;
      setOwnPrices(basePrices.slice(-MAX_PRICES));
    }
  }, [basePrices]);

  const activeSymbolKey = activeSymbol?.underlying_symbol ?? null;
  useEffect(() => {
    historySeededRef.current = false;
    setOwnPrices([]);
    setOwnCurrentTick(null);
  }, [activeSymbolKey]);

  useEffect(() => {
    if (!tradingWs || !tradingIsConnected || !activeSymbol) return;
    const symbol = activeSymbol.underlying_symbol;
    return tradingWs.onMessage((data: Record<string, unknown>) => {
      if (data.msg_type !== 'tick') return;
      const raw = data.tick as Record<string, unknown> | undefined;
      if (
        !raw ||
        typeof raw.symbol !== 'string' ||
        typeof raw.quote !== 'number' ||
        !isFinite(raw.quote) ||
        raw.symbol !== symbol
      ) return;
      const newTick = { quote: raw.quote, epoch: raw.epoch as number } as unknown as Tick;
      setOwnCurrentTick(newTick);
      setOwnPrices(prev => {
        const updated = [...prev, raw.quote];
        return updated.length > MAX_PRICES
          ? updated.slice(updated.length - MAX_PRICES)
          : updated;
      });
    });
  }, [tradingWs, tradingIsConnected, activeSymbol]);

  const digitStats: DigitStats = useMemo(
    () => computeDigitStats(ownPrices, pipSize),
    [ownPrices, pipSize]
  );

  const lastDigit = useMemo(() => {
    if (ownCurrentTick != null) return getLastDigit(ownCurrentTick.quote, pipSize);
    if (ownPrices.length > 0) return getLastDigit(ownPrices[ownPrices.length - 1], pipSize);
    return null;
  }, [ownCurrentTick, ownPrices, pipSize]);

  const {
    buyContract: buyWithProposal,
    isBuying,
    buyResult,
    buyError,
    clearBuyResult,
  } = useBuy(tradingWs, tradingIsConnected);

  const proposalParams: ProposalParams | null = useMemo(() => {
    if (isBuying || !activeSymbol) return null;
    const stakeNum = parseFloat(stake);
    if (!stakeNum || stakeNum <= 0) return null;
    const needsBarrier = contractMode !== 'DIGITEVEN' && contractMode !== 'DIGITODD';
    return {
      contractType: contractMode,
      symbol: activeSymbol.underlying_symbol,
      amount: stakeNum,
      duration,
      durationUnit: 't',
      basis: 'stake' as const,
      currency: 'USD',
      ...(needsBarrier ? { barrier: selectedDigit } : {}),
    };
  }, [activeSymbol, contractMode, stake, duration, selectedDigit, isBuying]);

  const { proposal } = useProposal(tradingWs, tradingIsConnected, proposalParams);

  const buyContract = useCallback(async () => {
    if (proposal) {
      await buyWithProposal(proposal);
    }
  }, [proposal, buyWithProposal]);

  return {
    ws: tradingWs,
    isConnected: tradingIsConnected,
    isLoading,
    error,
    symbols,
    activeSymbol,
    selectSymbol,
    currentTick: ownCurrentTick,
    lastDigit,
    digitStats,
    prices: ownPrices,
    pipSize,
    tradeType,
    setTradeType,
    contractMode,
    setContractMode,
    selectedDigit,
    setSelectedDigit,
    contractsAvailable,
    stake,
    setStake,
    duration,
    setDuration,
    durationLimits,
    defaultStake,
    proposal,
    isProposalLoading: tradingIsConnected && proposalParams !== null && proposal === null,
    buyContract,
    isBuying,
    buyResult,
    buyError,
    clearBuyResult,
    openPositions,
    closedPositions,
    sellContract,
    sellingId,
    sellError,
    clearSellError,
  };
}
