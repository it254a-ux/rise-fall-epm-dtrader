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
    <header className="fixed top-0 left-0 lg:left-[72px] right-0 z-50 flex items-center justify-between px-4 py-1.5 border-b bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <TradeTypesFlyout
          activeTradeType={activeTradeType}
          onSelectTradeType={onSelectTradeType ?? (() => {})}
        />
      </div>
      <div className="flex items-center gap-3" />
    </header>
  );
}
