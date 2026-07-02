'use client';

import { Home, Clock, FileText, LifeBuoy, Globe, Moon, Sun, CircleUserRound, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface NavItem {
  label: string;
  icon: LucideIcon;
}

const TOP_ITEMS: NavItem[] = [
  { label: 'Home', icon: Home },
  { label: 'Positions', icon: Clock },
  { label: 'Reports', icon: FileText },
];

const BOTTOM_ITEMS: NavItem[] = [
  { label: 'Help', icon: LifeBuoy },
  { label: 'Language', icon: Globe },
];

/**
 * Left-side vertical navigation rail. Matches the reference screenshot:
 * Home / Positions / Reports, a divider, then Help / Language / Theme /
 * Account — each icon stacked above its label.
 *
 * Pure navigation/display component. `onNavigate` is a placeholder callback
 * left for you to wire up to actual routing/panels — nothing here touches
 * auth state, accounts, or login/logout.
 */
export function Sidebar({ onNavigate }: { onNavigate?: (label: string) => void }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme !== 'light';

  return (
    <nav className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-[72px] flex-col items-center gap-7 bg-[#0e0e0e] pt-6 border-r border-white/5">
      {TOP_ITEMS.map(({ label, icon: Icon }) => (
        <button
          key={label}
          onClick={() => onNavigate?.(label)}
          className="flex flex-col items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon size={20} strokeWidth={1.75} />
          <span className="text-[11px] font-medium leading-none">{label}</span>
        </button>
      ))}

      <div className="w-8 border-t border-white/10" />

      {BOTTOM_ITEMS.map(({ label, icon: Icon }) => (
        <button
          key={label}
          onClick={() => onNavigate?.(label)}
          className="flex flex-col items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon size={20} strokeWidth={1.75} />
          <span className="text-[11px] font-medium leading-none">{label}</span>
        </button>
      ))}

      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className="flex flex-col items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
      >
        {isDark ? <Moon size={20} strokeWidth={1.75} /> : <Sun size={20} strokeWidth={1.75} />}
        <span className="text-[11px] font-medium leading-none">Theme</span>
      </button>

      <button
        onClick={() => onNavigate?.('Account')}
        className="flex flex-col items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
      >
        <CircleUserRound size={20} strokeWidth={1.75} />
        <span className="text-[11px] font-medium leading-none">Account</span>
      </button>
    </nav>
  );
}
