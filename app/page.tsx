'use client';

import { useState, useEffect } from 'react';
import { useSmartChartsApi } from '@/hooks/use-smartcharts-api';
import { useSmartChartChartData } from '@/hooks/use-smartchart-chart-data';
import { useRiseFallTrading } from '../hooks/use-rise-fall-trading';
import { useDigitsTrading } from '../hooks/use-digits-trading';
import { useAccumulatorTrading } from '../hooks/use-accumulator-trading';
import { useDerivWSContext } from '@/components/custom/deriv-ws-provider';
import { useLogoSrc } from '@/components/custom/logo-src-provider';
import { RiseFallView } from '../components/rise-fall-view';
import { DigitsBody } from '../components/digits-body';
import { AccumulatorsBody } from '../components/accumulators-body';
import { Header } from '@/components/custom/header';
import { Footer } from '@/components/custom/footer';

export default function RiseFallPage() {
  const logoSrc = useLogoSrc();
  const { ws, isConnected, isExhausted, auth } = useDerivWSContext();
  const { authState, accounts, activeAccount, login, signUp, logout, switchAccount } = auth;
  const isAuthenticated = !!auth.wsUrl;

  const [activeTradeType, setActiveTradeType] = useState<string>('rise-fall');

  // Which trade-type "family" is currently selected. Computed before the
  // trading hooks below so each hook can be told whether it's the active
  // one — this is what lets us skip loading data for modes the user hasn't
  // opened yet.
  const isDigitsTab =
    activeTradeType === 'matches-differs' ||
    activeTradeType === 'over-under' ||
    activeTradeType === 'even-odd';
  const isAccumulatorsTab = activeTradeType === 'accumulators';
  const isRiseFallTab = !isDigitsTab && !isAccumulatorsTab;

  // Once a mode has been activated (the user switched to it at least once
  // this session), it stays "warm" — we never flip it back off, so
  // switching away and back doesn't re-trigger a fresh load. Rise/Fall
  // starts warm since it's the default landing tab.
  const [activatedTabs, setActivatedTabs] = useState({
    riseFall: true,
    digits: false,
    accumulators: false,
  });

  useEffect(() => {
    setActivatedTabs((prev) => {
      if (isDigitsTab && !prev.digits) return { ...prev, digits: true };
      if (isAccumulatorsTab && !prev.accumulators) return { ...prev, accumulators: true };
      if (isRiseFallTab && !prev.riseFall) return { ...prev, riseFall: true };
      return prev;
    });
  }, [isDigitsTab, isAccumulatorsTab, isRiseFallTab]);

  const trading = useRiseFallTrading({
    ws,
    isConnected,
    isExhausted,
    isAuthenticated,
    onAuthWSFailed: logout,
    enabled: activatedTabs.riseFall,
  });
  const { chartData } = useSmartChartChartData(trading.ws, trading.isConnected, trading.symbols);
  const { getQuotes, subscribeQuotes, unsubscribeQuotes } = useSmartChartsApi(trading.ws);

  const digits = useDigitsTrading({
    ws,
    isConnected,
    isExhausted,
    isAuthenticated,
    onAuthWSFailed: logout,
    enabled: activatedTabs.digits,
  });
  const { chartData: digitsChartData } = useSmartChartChartData(digits.ws, digits.isConnected, digits.symbols);
  const {
    getQuotes: digitsGetQuotes,
    subscribeQuotes: digitsSubscribeQuotes,
    unsubscribeQuotes: digitsUnsubscribeQuotes,
  } = useSmartChartsApi(digits.ws);

  const accumulators = useAccumulatorTrading({
    ws,
    isConnected,
    isExhausted,
    isAuthenticated,
    onAuthWSFailed: logout,
    enabled: activatedTabs.accumulators,
  });
  const { chartData: accumulatorsChartData } = useSmartChartChartData(accumulators.ws, accumulators.isConnected, accumulators.symbols);
  const {
    getQuotes: accumulatorsGetQuotes,
    subscribeQuotes: accumulatorsSubscribeQuotes,
    unsubscribeQuotes: accumulatorsUnsubscribeQuotes,
  } = useSmartChartsApi(accumulators.ws);

  if (isDigitsTab && digits.tradeType !== activeTradeType) {
    digits.setTradeType(activeTradeType as typeof digits.tradeType);
  }

  if (activeTradeType === 'accumulators') {
    return (
      <main
        className="flex flex-col bg-background max-lg:h-dvh max-lg:overflow-y-auto lg:h-dvh lg:overflow-hidden"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
      >
        <Header
          authState={authState}
          accounts={accounts}
          activeAccount={activeAccount}
          onLogin={login}
          onSignUp={signUp}
          onLogout={logout}
          onSwitchAccount={switchAccount}
          logoSrc={logoSrc}
          activeTradeType={activeTradeType}
          onSelectTradeType={setActiveTradeType}
        />
        <div className={authState === 'authenticated' ? 'h-[40px] shrink-0' : 'h-[36px] shrink-0'} />
        <AccumulatorsBody
          ws={accumulators.ws}
          isConnected={accumulators.isConnected}
          isLoading={accumulators.isLoading}
          activeSymbol={accumulators.activeSymbol}
          selectSymbol={accumulators.selectSymbol}
          growthRate={accumulators.growthRate}
          setGrowthRate={accumulators.setGrowthRate}
          growthRateOptions={accumulators.growthRateOptions}
          stake={accumulators.stake}
          setStake={accumulators.setStake}
          takeProfit={accumulators.takeProfit}
          setTakeProfit={accumulators.setTakeProfit}
          proposal={accumulators.proposal}
          buyContract={accumulators.buyContract}
          isBuying={accumulators.isBuying}
          buyResult={accumulators.buyResult}
          buyError={accumulators.buyError}
          clearBuyResult={accumulators.clearBuyResult}
          currentTick={accumulators.currentTick}
          openPositions={accumulators.openPositions}
          sellContract={accumulators.sellContract}
          sellingId={accumulators.sellingId}
          sellError={accumulators.sellError}
          clearSellError={accumulators.clearSellError}
          isAuthenticated={authState === 'authenticated'}
          chartData={accumulatorsChartData}
          getQuotes={accumulatorsGetQuotes}
          subscribeQuotes={accumulatorsSubscribeQuotes}
          unsubscribeQuotes={accumulatorsUnsubscribeQuotes}
          activeTradeType={activeTradeType}
          onSelectTradeType={setActiveTradeType}
        />
        <div className="max-lg:fixed max-lg:bottom-0 max-lg:left-0 max-lg:right-0 py-1 text-center bg-background/80 backdrop-blur-sm lg:bg-transparent lg:static lg:py-0.5 lg:shrink-0">
          <Footer />
        </div>
      </main>
    );
  }

  if (isDigitsTab) {
    return (
      <main
        className="flex flex-col bg-background max-lg:h-dvh max-lg:overflow-y-auto lg:h-dvh lg:overflow-hidden"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
      >
        <Header
          authState={authState}
          accounts={accounts}
          activeAccount={activeAccount}
          onLogin={login}
          onSignUp={signUp}
          onLogout={logout}
          onSwitchAccount={switchAccount}
          logoSrc={logoSrc}
          activeTradeType={activeTradeType}
          onSelectTradeType={setActiveTradeType}
        />
        <div className={authState === 'authenticated' ? 'h-[40px] shrink-0' : 'h-[36px] shrink-0'} />
        <DigitsBody
          authState={authState}
          isConnected={digits.isConnected}
          isLoading={digits.isLoading}
          ws={digits.ws}
          activeSymbol={digits.activeSymbol}
          selectSymbol={digits.selectSymbol}
          digitStats={digits.digitStats}
          lastDigit={digits.lastDigit}
          tradeType={digits.tradeType}
          setTradeType={digits.setTradeType}
          contractMode={digits.contractMode}
          setContractMode={digits.setContractMode}
          selectedDigit={digits.selectedDigit}
          setSelectedDigit={digits.setSelectedDigit}
          stake={digits.stake}
          setStake={digits.setStake}
          duration={digits.duration}
          setDuration={digits.setDuration}
          durationLimits={digits.durationLimits}
          proposal={digits.proposal}
          isProposalLoading={digits.isProposalLoading}
          buyContract={digits.buyContract}
          isBuying={digits.isBuying}
          buyResult={digits.buyResult}
          buyError={digits.buyError}
          clearBuyResult={digits.clearBuyResult}
          openPositions={digits.openPositions}
          chartData={digitsChartData}
          getQuotes={digitsGetQuotes}
          subscribeQuotes={digitsSubscribeQuotes}
          unsubscribeQuotes={digitsUnsubscribeQuotes}
          onSelectTradeType={setActiveTradeType}
        />
        <div className="max-lg:fixed max-lg:bottom-0 max-lg:left-0 max-lg:right-0 py-1 text-center bg-background/80 backdrop-blur-sm lg:bg-transparent lg:static lg:py-0.5 lg:shrink-0">
          <Footer />
        </div>
      </main>
    );
  }

  return (
    <RiseFallView
      authState={authState}
      accounts={accounts}
      activeAccount={activeAccount}
      onLogin={login}
      onSignUp={signUp}
      onLogout={logout}
      onSwitchAccount={switchAccount}
      logoSrc={logoSrc}
      ws={trading.ws}
      isConnected={trading.isConnected}
      isLoading={trading.isLoading}
      error={trading.error}
      activeSymbol={trading.activeSymbol}
      selectSymbol={trading.selectSymbol}
      direction={trading.direction}
      setDirection={trading.setDirection}
      allowEquals={trading.allowEquals}
      setAllowEquals={trading.setAllowEquals}
      stake={trading.stake}
      onStakeChange={trading.setStake}
      duration={trading.duration}
      setDuration={trading.setDuration}
      durationOptions={trading.durationOptions}
      durationUnit={trading.durationUnit}
      setDurationUnit={trading.setDurationUnit}
      endDate={trading.endDate}
      setEndDate={trading.setEndDate}
      endTime={trading.endTime}
      setEndTime={trading.setEndTime}
      proposal={trading.proposal}
      buyContract={trading.buyContract}
      isBuying={trading.isBuying}
      buyResult={trading.buyResult}
      buyError={trading.buyError}
      clearBuyResult={trading.clearBuyResult}
      openPositions={trading.openPositions}
      sellContract={trading.sellContract}
      sellingId={trading.sellingId}
      chartData={chartData}
      getQuotes={getQuotes}
      subscribeQuotes={subscribeQuotes}
      unsubscribeQuotes={unsubscribeQuotes}
      activeTradeType={activeTradeType}
      onSelectTradeType={setActiveTradeType}
    />
  );
}
