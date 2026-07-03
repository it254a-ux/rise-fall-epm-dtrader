'use client';

import { useState } from 'react';
import { useSmartChartsApi } from '@/hooks/use-smartcharts-api';
import { useSmartChartChartData } from '@/hooks/use-smartchart-chart-data';
import { useRiseFallTrading } from '../hooks/use-rise-fall-trading';
import { useDigitsTrading } from '../hooks/use-digits-trading';
import { useDerivWSContext } from '@/components/custom/deriv-ws-provider';
import { useLogoSrc } from '@/components/custom/logo-src-provider';
import { RiseFallView } from '../components/rise-fall-view';
import { DigitsBody } from '../components/digits-body';
import { Header } from '@/components/custom/header';
import { Sidebar } from '@/components/custom/sidebar';
import { Footer } from '@/components/custom/footer';

export default function RiseFallPage() {
  const logoSrc = useLogoSrc();
  const { ws, isConnected, isExhausted, auth } = useDerivWSContext();
  const { authState, accounts, activeAccount, login, signUp, logout, switchAccount } = auth;
  const isAuthenticated = !!auth.wsUrl;

  const [activeTradeType, setActiveTradeType] = useState<string>('rise-fall');

  // Rise/Fall connection — always instantiated so switching back to this tab is instant.
  const trading = useRiseFallTrading({ ws, isConnected, isExhausted, isAuthenticated, onAuthWSFailed: logout });
  const { chartData } = useSmartChartChartData(trading.ws, trading.isConnected, trading.symbols);
  const { getQuotes, subscribeQuotes, unsubscribeQuotes } = useSmartChartsApi(trading.ws);

  // Digits connection (Matches/Differs, Over/Under, Even/Odd) — always instantiated
  // alongside Rise/Fall under the same ws/auth context, so switching tabs never
  // reconnects or reloads.
  const digits = useDigitsTrading({ ws, isConnected, isExhausted, isAuthenticated, onAuthWSFailed: logout });

  const isDigitsTab =
    activeTradeType === 'matches-differs' ||
    activeTradeType === 'over-under' ||
    activeTradeType === 'even-odd';

  // Keep the digits hook's internal tradeType in sync with the top-level tab selection.
  if (isDigitsTab && digits.tradeType !== activeTradeType) {
    digits.setTradeType(activeTradeType as typeof digits.tradeType);
  }

  if (activeTradeType === 'accumulators') {
    return (
      <>
        <Sidebar />
        <main className="flex flex-col bg-background max-lg:h-dvh lg:overflow-visible lg:pl-[72px]">
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
          <div className={authState === 'authenticated' ? 'h-[76px] shrink-0' : 'h-[66px] shrink-0'} />
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Accumulators — coming soon
          </div>
          <div className="fixed bottom-0 left-0 lg:left-[72px] right-0 py-2 text-center bg-background/80 backdrop-blur-sm">
            <Footer />
          </div>
        </main>
      </>
    );
  }

  if (isDigitsTab) {
    return (
      <>
        <Sidebar />
        <main className="flex flex-col bg-background max-lg:h-dvh max-lg:overflow-y-auto lg:overflow-visible lg:pl-[72px]">
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
          <div className={authState === 'authenticated' ? 'h-[76px] shrink-0' : 'h-[66px] shrink-0'} />
          <DigitsBody
            isConnected={digits.isConnected}
            isLoading={digits.isLoading}
            symbols={digits.symbols}
            activeSymbol={digits.activeSymbol}
            selectSymbol={digits.selectSymbol}
            currentTick={digits.currentTick}
            lastDigit={digits.lastDigit}
            digitStats={digits.digitStats}
            pipSize={digits.pipSize}
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
            isAuthenticated={authState === 'authenticated'}
          />
          <div className="fixed bottom-0 left-0 lg:left-[72px] right-0 py-2 text-center bg-background/80 backdrop-blur-sm">
            <Footer />
          </div>
        </main>
      </>
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
    />
  );
}
