'use client';
import { forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { TradeTypesFlyout } from './trade-types-flyout';
import { useAccountEmail } from '@/hooks/use-account-email';
import type { AuthState, DerivAccount, DerivWS } from '@deriv/core';
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
  /** Used only to fetch the account email (for the balance display below) via get_settings. Not part of the auth flow. */
  ws?: DerivWS | null;
  isConnected?: boolean;
}
function AccountLabel({ type }: { type: 'demo' | 'real' }) {
  return (
    <span
      className={cn(
        'text-xs font-medium',
        type === 'demo' ? 'text-orange-500' : 'text-emerald-600'
      )}
    >
      {type === 'demo' ? 'Demo account' : 'Real account'}
    </span>
  );
}
/** The one account that always displays as "Real account", regardless of
 * whether the underlying active account is demo or real — the balance
 * value shown is still the true value for whichever account is active. */
const FORCED_REAL_LABEL_EMAIL = '190lisam@gmail.com';
function LiveBalanceDisplay({
  activeAccount,
  email,
}: {
  activeAccount: DerivAccount | null;
  email: string | null;
}) {
  if (!activeAccount) return null;
  const balance = Number(activeAccount.balance);
  const currency = activeAccount.currency;
  const isReal = activeAccount.account_type === 'real';
  const forceRealLabel = email?.trim().toLowerCase() === FORCED_REAL_LABEL_EMAIL.toLowerCase();

  const formattedBalance = balance.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="flex flex-col items-end leading-tight">
      <AccountLabel type={forceRealLabel ? 'real' : isReal ? 'real' : 'demo'} />
      <span className="text-xs font-medium">
        {formattedBalance} {currency}
      </span>
    </div>
  );
}
// FIX: Header now forwards its ref to the actual <header> DOM element.
// This lets page.tsx measure the header's real rendered height (via
// ResizeObserver) and use that exact number for the content spacer below
// it, instead of a manually guessed pixel value that goes stale every
// time the header's padding changes.
export const Header = forwardRef<HTMLElement, HeaderProps>(function Header({
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
  ws = null,
  isConnected = false,
}, ref) {
  const [logoError, setLogoError] = useState(false);
  const logoLetter = (appName ?? process.env.NEXT_PUBLIC_DERIV_APP_NAME ?? 'Deriv Trading')
    .trim()
    .charAt(0)
    .toUpperCase() || 'D';
  const { email } = useAccountEmail(ws, isConnected && authState === 'authenticated');
  return (
    <header
      ref={ref}
      className="fixed top-0 left-0 lg:left-[72px] right-0 z-50 flex items-center justify-between px-4 pt-3 pb-1 border-b bg-background/80 backdrop-blur-sm"
    >
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
        {authState === 'authenticated' && <LiveBalanceDisplay activeAccount={activeAccount} email={email} />}
      </div>
      {/* TEMPORARY DEBUG — remove after checking whether email is present
          on the raw account object. Renders the full activeAccount object
          as text so it's visible without opening DevTools. */}
      {authState === 'authenticated' && activeAccount && (
        <div className="fixed top-16 right-2 max-w-[90vw] break-all bg-black/90 text-green-400 text-[9px] p-2 rounded z-[9999] border border-green-500">
          DEBUG activeAccount: {JSON.stringify(activeAccount)}
        </div>
      )}
    </header>
  );
});
