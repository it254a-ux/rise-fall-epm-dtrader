'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TradeTypesFlyout } from './trade-types-flyout';
import type { AuthState, DerivAccount } from '@deriv/core';

interface HeaderProps {
  authState: AuthState;
  accounts: DerivAccount[];
  activeAccount: DerivAccount | null;
  onLogin: () => Promise<void>;
  onLogout: () => void;
  onSwitchAccount: (accountId: string) => Promise<void>;
  onSignUp?: () => Promise<void>;
  logoSrc?: string;
  appName?: string;
  activeTradeType?: string;
  onSelectTradeType?: (type: string) => void;
}

function AccountLabel({ type }: { type: 'demo' | 'real' }) {
  return (
    <span
      className={cn(
        'text-sm font-medium',
        type === 'demo' ? 'text-orange-500' : 'text-emerald-600'
      )}
    >
      {type === 'demo' ? 'Demo account' : 'Real account'}
    </span>
  );
}

function LiveBalanceDisplay({ activeAccount }: { activeAccount: DerivAccount | null }) {
  if (!activeAccount) return null;
  const balance = Number(activeAccount.balance);
  const currency = activeAccount.currency;
  const isReal = activeAccount.account_type === 'real';
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'px-1.5 py-0.5 rounded text-[10px] font-bold',
          isReal ? 'bg-emerald-500/15 text-emerald-600' : 'bg-orange-500/15 text-orange-500'
        )}
      >
        {isReal ? 'REAL' : 'DEMO'}
      </span>
      <span className="text-sm font-medium">
        {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
      </span>
    </div>
  );
}

export function Header({
  authState,
  accounts,
  activeAccount,
  onLogin,
  onLogout,
  onSwitchAccount,
  onSignUp,
  logoSrc,
  appName,
  activeTradeType = 'rise-fall',
  onSelectTradeType,
}: HeaderProps) {
  const [logoError, setLogoError] = useState(false);
  const logoLetter = (appName ?? process.env.NEXT_PUBLIC_DERIV_APP_NAME ?? 'Deriv Trading')
    .trim()
    .charAt(0)
    .toUpperCase() || 'D';
  return (
    <header className="fixed top-0 left-0 lg:left-[72px] right-0 z-50 flex items-center justify-between px-4 py-2.5 border-b bg-background/80 backdrop-blur-sm">
      {/* FIX (mobile only): the top TradeTypesFlyout tab row was overlapping
          the chart on mobile, and now duplicates the "Market contracts"
          menu in the trade panel below the chart. Hidden on mobile with
          max-lg:hidden per explicit confirmation; desktop is unchanged and
          still shows the tab row exactly as before. */}
      <div className="flex items-center gap-3 max-lg:hidden">
        <TradeTypesFlyout
          activeTradeType={activeTradeType}
          onSelectTradeType={onSelectTradeType ?? (() => {})}
        />
      </div>
      {/* FIX (mobile only): with the flyout hidden on mobile, this balance
          display becomes the only child in the justify-between header —
          and a lone flex child sits at the main-start (left) regardless of
          justify-between. max-lg:ml-auto pushes it back to the end (right)
          on mobile, which is where it belongs. Desktop is untouched: that
          class only applies below the lg breakpoint, and on desktop the
          flyout (left) + this balance div (right) already sit correctly
          via justify-between on their own. */}
      <div className="flex items-center gap-3 max-lg:ml-auto">
        {authState === 'authenticated' && <LiveBalanceDisplay activeAccount={activeAccount} />}
      </div>
    </header>
  );
}
