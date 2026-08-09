'use client';

import { useState } from 'react';
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

  const trading = useRiseFallTrading({ ws, isConnected, isExhausted, isAuthenticated, onAuthWSFailed: logout });
  const { chartData } = useSmartChartChartData(trading.ws, trading.isConnected, trading.symbols);
  const { getQuotes, subscribeQuotes, unsubscribeQuotes } = useSmartChartsApi(trading.ws);

  const digits = useDigitsTrading({ ws, isConnected, isExhausted, isAuthenticated, onAuthWSFailed: logout });
  const { chartData: digitsChartData } = useSmartChartChartData(digits.ws, digits.isConnected, digits.symbols);
  const {
    getQuotes: digitsGetQuotes,
    subscribeQuotes: digitsSubscribeQuotes,
    unsubscribeQuotes: digitsUnsubscribeQuotes,
  } = useSmartChartsApi(digits.ws);

  const accumulators = useAccumulatorTrading({ ws, isConnected, isExhausted, isAuthenticated, onAuthWSFailed: logout });
  const { chartData: accumulatorsChartData } = useSmartChartChartData(accumulators.ws, accumulators.isConnected, accumulators.symbols);
  const {
    getQuotes: accumulatorsGetQuotes,
    subscribeQuotes: accumulatorsSubscribeQuotes,
    unsubscribeQuotes: accumulatorsUnsubscribeQuotes,
  } = useSmartChartsApi(accumulators.ws);

  const isDigitsTab =
    activeTradeType === 'matches-differs' ||
    activeTradeType === 'over-under' ||
    activeTradeType === 'even-odd';
  const isAccumulatorsTab = activeTradeType === 'accumulators';
  const isRiseFallTab = !isDigitsTab && !isAccumulatorsTab;

  if (isDigitsTab && digits.tradeType !== activeTradeType) {
    digits.setTradeType(activeTradeType as typeof digits.tradeType);
  }

  // FIX (trade-type switch delay): previously each of the three branches
  // below was returned early from this component, so switching
  // activeTradeType unmounted the whole inactive tree — including its
  // <SmartChart>, a Flutter/WebAssembly-backed widget that must fully
  // re-boot its engine on every mount. That cold boot is what caused the
  // reported 1-2 minute delay after selecting a new trade type.
  //
  // All three trading hooks above (useRiseFallTrading / useDigitsTrading /
  // useAccumulatorTrading) already run unconditionally on every render
  // regardless of activeTradeType, so all three are already fully
  // connected/subscribed at all times today — the chart mount/unmount was
  // the only piece of the page that didn't match that. To fix this, all
  // three trees are now always rendered (so each SmartChart only ever boots
  // once) and the inactive ones are hidden with `display: none` via a
  // `display: contents` wrapper, instead of being removed from the DOM.
  // No other component or hook below this point has been changed.
  return (
    <>
      <div style={{ display: isAccumulatorsTab ? 'contents' : 'none' }}>
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
          />
          <div className="max-lg:fixed max-lg:bottom-0 max-lg:left-0 max-lg:right-0 py-1 text-center bg-background/80 backdrop-blur-sm lg:bg-transparent lg:static lg:py-0.5 lg:shrink-0">
            <Footer />
          </div>
        </main>
      </div>

      <div style={{ display: isDigitsTab ? 'contents' : 'none' }}>
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
      </div>

      <div style={{ display: isRiseFallTab ? 'contents' : 'none' }}>
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
      </div>
    </>
  );
}
