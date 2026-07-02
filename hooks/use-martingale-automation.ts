'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProposalInfo, BuyResult } from '@deriv/core';
import type { OpenPosition } from '../lib/types';

interface UseMartingaleAutomationProps {
  proposal: ProposalInfo | null;
  buyContract: () => Promise<void>;
  openPositions: OpenPosition[];
  stake: string;
  setStake: (value: string) => void;
  isAuthenticated: boolean;
  isConnected: boolean;
}

interface UseMartingaleAutomationReturn {
  isRunning: boolean;
  start: () => void;
  stop: () => void;
  currentStake: number;
  tradeCount: number;
  totalProfit: number;
  lastResult: 'win' | 'loss' | null;
}

export function useMartingaleAutomation({
  proposal,
  buyContract,
  openPositions,
  stake,
  setStake,
  isAuthenticated,
  isConnected,
}: UseMartingaleAutomationProps): UseMartingaleAutomationReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [tradeCount, setTradeCount] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [lastResult, setLastResult] = useState<'win' | 'loss' | null>(null);

  const intendedStakeRef = useRef(Number(stake) || 1);
  const roundActiveRef = useRef(false);
  const lastContractIdRef = useRef<number | null>(null);
  const prevPositionsRef = useRef<OpenPosition[]>([]);

  // Reset when stopped
  const stop = useCallback(() => {
    setIsRunning(false);
    roundActiveRef.current = false;
    lastContractIdRef.current = null;
  }, []);

  // Start automation
  const start = useCallback(() => {
    if (!isAuthenticated || !isConnected) return;
    setIsRunning(true);
    setTradeCount(0);
    setTotalProfit(0);
    setLastResult(null);
    intendedStakeRef.current = Number(stake) || 1;
    roundActiveRef.current = false;
    lastContractIdRef.current = null;
    prevPositionsRef.current = [...openPositions];
  }, [isAuthenticated, isConnected, stake, openPositions]);

  // Main automation loop
  useEffect(() => {
    if (!isRunning) return;

    const runLoop = async () => {
      // Don't fire if a round is already active
      if (roundActiveRef.current) return;

      // Check if any open position just closed (settled)
      const settled = openPositions.find(p => {
        const wasOpen = prevPositionsRef.current.some(prev => prev.contract_id === p.contract_id);
        return wasOpen && p.is_settled;
      });

      if (settled) {
        roundActiveRef.current = false;
        const profit = Number(settled.profit) || 0;
        const isWin = profit >= 0;

        setTotalProfit(prev => prev + profit);
        setLastResult(isWin ? 'win' : 'loss');
        setTradeCount(prev => prev + 1);

        if (isWin) {
          // Reset to initial stake on win
          intendedStakeRef.current = Number(stake) || 1;
        } else {
          // Double stake on loss (Martingale)
          intendedStakeRef.current = Math.round(intendedStakeRef.current * 2 * 100) / 100;
        }

        lastContractIdRef.current = null;
      }

      // Fire next trade if no active position and proposal matches intended stake
      const hasActivePosition = openPositions.some(p => !p.is_settled);
      if (!hasActivePosition && !roundActiveRef.current) {
        const currentAsk = proposal?.askPrice ?? 0;
        const intended = Math.round(intendedStakeRef.current * 100) / 100;

        // Only buy when proposal reflects the intended stake
        if (currentAsk > 0 && Math.abs(currentAsk - intended) < 0.01) {
          roundActiveRef.current = true;
          try {
            await buyContract();
            setStake(intended.toFixed(2));
          } catch {
            roundActiveRef.current = false;
          }
        }
      }

      prevPositionsRef.current = [...openPositions];
    };

    const interval = setInterval(runLoop, 500);
    return () => clearInterval(interval);
  }, [isRunning, proposal, buyContract, openPositions, stake, setStake]);

  return {
    isRunning,
    start,
    stop,
    currentStake: intendedStakeRef.current,
    tradeCount,
    totalProfit,
    lastResult,
  };
}
