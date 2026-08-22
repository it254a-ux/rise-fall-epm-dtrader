'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRiseFallTrading } from '../../hooks/use-rise-fall-trading';
import { useSymbolTabs } from '@/hooks/use-symbol-tabs';
import { useDerivWSContext } from '@/components/custom/deriv-ws-provider';
import { useLogoSrc } from '@/components/custom/logo-src-provider';
import { Header } from '@/components/custom/header';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import { Footer } from '@/components/custom/footer';
import Link from 'next/link';
import { PositionsTable } from '@/components/custom/positions-table';
const RISE_FALL_CONTRACT_LABELS: Record<string, string> = {
  CALL: 'Rise',
  PUT: 'Fall',
  CALLE: 'Rise (Equal)',
  PUTE: 'Fall (Equal)',
};
export default function ReportsPage() {
  const logoSrc = useLogoSrc();
  const router = useRouter();
  const { ws, isConnected, isExhausted, auth } = useDerivWSContext();
  const { authState, accounts, activeAccount, login, signUp, logout, switchAccount } = auth;
  const trading = useRiseFallTrading({ ws, isConnected, isExhausted, isAuthenticated: !!auth.wsUrl, onAuthWSFailed: logout });

  // This page only ever deals with the Rise/Fall trade type (its positions
  // table is filtered to Rise/Fall contract types below), so the symbol
  // tabs here are simpler than app/page.tsx — one trade type, one family
  // (`trading`) to keep in sync with the active tab.
  const { tabs, activeTabId, openTab, closeTab, selectTab, renameTab } = useSymbolTabs({
    initialTradeType: 'rise-fall',
    initialSymbol: trading.activeSymbol?.underlying_symbol ?? '',
    initialDisplayName:
      trading.activeSymbol?.underlying_symbol_name ??
      trading.activeSymbol?.underlying_symbol ??
      'Loading...',
    onActivate: ({ symbol }) => {
      trading.selectSymbol(symbol);
    },
  });

  // Fixes the tab label once real symbol data loads in, same as on the
  // main trading page — a tab may be opened optimistically before
  // active_symbols has resolved the human-readable name.
  useEffect(() => {
    const currentActiveSymbol = trading.activeSymbol;
    if (!currentActiveSymbol) return;
    renameTab(
      'rise-fall',
      currentActiveSymbol.underlying_symbol,
      currentActiveSymbol.underlying_symbol_name ?? currentActiveSymbol.underlying_symbol
    );
  }, [trading.activeSymbol, renameTab]);

  const onPickSymbol = (symbol: string, displayName: string) => {
    openTab('rise-fall', symbol, displayName);
  };

  useEffect(() => {
    if (authState === 'unauthenticated' || authState === 'error') {
      router.replace('/');
    }
  }, [authState, router]);
  if (authState !== 'authenticated') {
    return (
      <main className="flex flex-col bg-background items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }
  return (
    <main className="flex flex-col bg-background max-lg:h-dvh max-lg:overflow-y-auto lg:min-h-dvh">
      <Header
        authState={authState}
        accounts={accounts}
        activeAccount={activeAccount}
        onLogin={login}
        onSignUp={signUp}
        onLogout={logout}
        onSwitchAccount={switchAccount}
        logoSrc={logoSrc}
        symbolTabs={tabs}
        activeSymbolTabId={activeTabId}
        onSelectSymbolTab={selectTab}
        onCloseSymbolTab={closeTab}
        browsableSymbols={trading.symbols}
        isBrowsableSymbolsLoading={trading.isLoading}
        onPickSymbol={onPickSymbol}
      />
      {/* Spacer to push content below fixed header — authenticated users have a taller header */}
      <div className="h-[76px] shrink-0" />
      <div className="flex-1 w-full max-w-7xl mx-auto px-3 py-4 sm:px-4 sm:py-6 max-lg:pb-20 lg:pb-14 overflow-x-hidden">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <span className="text-base leading-none">←</span>
          <span>Back</span>
        </Link>
        <PositionsTable
          openPositions={trading.openPositions.filter(p => Object.keys(RISE_FALL_CONTRACT_LABELS).includes(p.contract_type))}
          closedPositions={trading.closedPositions.filter(p => Object.keys(RISE_FALL_CONTRACT_LABELS).includes(p.contract_type))}
          onSell={trading.sellContract}
          sellingId={trading.sellingId}
          sellError={trading.sellError}
          onClearSellError={trading.clearSellError}
          contractTypeLabels={RISE_FALL_CONTRACT_LABELS}
          className="mt-0"
        />
      </div>
      {/* Fixed footer — the pb-20 above reserves enough space so it never
          overlaps the last row of the positions table on mobile. */}
      <div className="fixed bottom-0 left-0 right-0 py-2 text-center bg-background/80 backdrop-blur-sm">
        <Footer />
      </div>
    </main>
  );
}
