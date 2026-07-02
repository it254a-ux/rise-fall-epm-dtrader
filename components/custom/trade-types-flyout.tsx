'use client';

import { useState, useRef, useEffect } from 'react';

const CATEGORIES = [
  {
    heading: 'Growth based',
    items: [{ label: 'Accumulators', fire: true, active: false }],
  },
  {
    heading: 'Directional',
    items: [{ label: 'Rise/Fall', fire: true, active: true }],
  },
  {
    heading: 'Digit based',
    items: [
      { label: 'Matches/Differs', fire: false, active: false },
      { label: 'Over/Under', fire: false, active: false },
      { label: 'Even/Odd', fire: false, active: false },
    ],
  },
];

export function TradeTypesFlyout() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'most'>('all');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Explore trade types"
        className="grid grid-cols-2 gap-[3px] rounded-md p-2 hover:bg-foreground/5 shrink-0"
      >
        {[0, 1, 2, 3].map(i => (
          <span key={i} className="w-[6px] h-[6px] rounded-[1.5px] bg-muted-foreground" />
        ))}
      </button>

      {open && (
        <div className="fixed top-[64px] left-0 z-[60] w-[420px] max-w-[90vw] h-[calc(100dvh-64px)] overflow-y-auto bg-background border-r border-border shadow-2xl">
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <h2 className="text-2xl font-bold text-foreground">Trade types</h2>
            <button className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground hover:bg-foreground/5">
              Guide
            </button>
          </div>

          <div className="flex items-center gap-6 px-6 border-b border-border">
            <button
              onClick={() => setTab('all')}
              className={`pb-2 text-sm font-medium border-b-2 ${
                tab === 'all' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTab('most')}
              className={`pb-2 text-sm font-medium border-b-2 ${
                tab === 'most' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'
              }`}
            >
              Most traded
            </button>
          </div>

          <div className="px-6 py-4 flex flex-col gap-5">
            {CATEGORIES.map(cat => (
              <div key={cat.heading} className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">{cat.heading}</p>
                {cat.items.map(item => (
                  <button
                    key={item.label}
                    className={`flex items-center gap-2 rounded-xl px-4 py-3 text-left text-base font-medium
                      ${item.active ? 'bg-foreground/10 text-foreground' : 'text-foreground hover:bg-foreground/5'}
                    `}
                  >
                    {item.label}
                    {item.fire && <span>🔥</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
