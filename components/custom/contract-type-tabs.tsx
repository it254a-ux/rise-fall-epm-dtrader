'use client';

interface ContractTab {
  label: string;
  active: boolean;
  comingSoon?: boolean;
}

const TABS: ContractTab[] = [
  { label: 'Rise/Fall', active: true },
  { label: 'Accumulators', active: false, comingSoon: true },
  { label: 'Matches/Differs', active: false, comingSoon: true },
  { label: 'Over/Under', active: false, comingSoon: true },
  { label: 'Even/Odd', active: false, comingSoon: true },
];

export function ContractTypeTabs() {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
      {TABS.map(tab => (
        <button
          key={tab.label}
          disabled={tab.comingSoon}
          title={tab.comingSoon ? 'Coming soon' : undefined}
          className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap
            ${tab.active
              ? 'border-foreground/30 text-foreground bg-foreground/5'
              : 'border-border text-muted-foreground'}
            ${tab.comingSoon ? 'opacity-50 cursor-not-allowed' : 'hover:bg-foreground/5 cursor-pointer'}
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
