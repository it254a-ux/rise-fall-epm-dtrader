'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AuthState, DerivAccount } from '@deriv/core';

interface HeaderProps {
  authState: AuthState;
  accounts: DerivAccount[];
  activeAccount: DerivAccount | null;
  onLogin: () => Promise<void>;
  onLogout: () => void;
  onSwitchAccount: (accountId: string) => Promise<void>;
  /** When provided, a Sign up button is rendered to the right of the Log in button. */
  onSignUp?: () => Promise<void>;
  /** Logo source URL or data URL. When omitted, a placeholder badge is shown until
   *  the user provides a logo via the app builder (passed as a data URL via PREVIEW_BRANDING). */
  logoSrc?: string;
  /** App name used to derive the fallback logo letter when no logoSrc is provided.
   *  Falls back to NEXT_PUBLIC_DERIV_APP_NAME env var, then 'Deriv Trading'. */
  appName?: string;
  /** Optional controls rendered to the left of the login/logout button (e.g. a theme toggle). */
  actions?: React.ReactNode;
}

function formatBalance(balance: string): string {
  return Number(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  actions,
}: HeaderProps) {
  const [logoError, setLogoError] = useState(false);
  const logoLetter = (appName ?? process.env.NEXT_PUBLIC_DERIV_APP_NAME ?? 'Deriv Trading')
    .trim()
    .charAt(0)
    .toUpperCase() || 'D';
  const isAuthenticated = authState === 'authenticated';
  const isAuthenticating = authState === 'authenticating';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 border-b bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {!logoSrc || logoError ? (
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {logoLetter}
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- next/image is avoided here intentionally: it errors in the optimizer when /logo.png is absent locally; a plain img with onError gives the same silent fallback behaviour
          <img
            src={logoSrc}
            alt="App Logo"
            className="h-8 w-auto object-contain"
            onError={() => setLogoError(true)}
          />
        )}
        <h1 className="text-lg font-semibold text-foreground hidden sm:block">
          {process.env.NEXT_PUBLIC_DERIV_APP_NAME ?? 'Deriv Trading'}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        {actions}
        {isAuthenticated && activeAccount && (
          // Display-only badge: shows which account is active (real/demo) but
          // is no longer clickable. Switching accounts now happens only from
          // the main homepage's account switcher; this avoids triggering this
          // sub-app's own (currently broken) switchAccount/OTP call.
          <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5">
            <div className="text-left">
              <AccountLabel type={activeAccount.account_type} />
              <p className="text-base font-bold text-foreground">
                {formatBalance(activeAccount.balance)} {activeAccount.currency}
              </p>
            </div>
          </div>
        )}
        {/*
          Standalone Logout button, and the Log in / Sign up buttons, are
          intentionally removed from this header. The main app (homepage)
          already has its own Log In / Log Out buttons, and this sub-app is
          only ever opened inside an iframe after the user has already
          authenticated there — so duplicate auth buttons here were
          redundant and confusing. onLogin, onSignUp, onLogout are still
          passed in and wired up everywhere else; nothing about auth/session
          logic changed, only these buttons' visibility.
        */}
      </div>
    </header>
  );
}
