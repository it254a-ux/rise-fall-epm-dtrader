'use client';
import { useState, useRef, useEffect } from 'react';

const CATEGORIES = [
  {
    heading: 'Growth based',
    items: [{ label: 'Accumulators', fire: true, active: false, comingSoon: true }],
  },
  {
    heading: 'Directional',
    items: [{ label: 'Rise/Fall', fire: true, active: true, comingSoon: false }],
  },
  {
    heading: 'Digit based',
    items: [
      { label: 'Matches/Differs', fire: false, active: false, comingSoon: true },
      { label: 'Over/Under', fire: false, active: false, comingSoon: true },
      { label: 'Even/Odd', fire: false, active: false, comingSoon: true },
    ],
  },
];

export function TradeTypesFlyout() {
  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
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
        onClick={() => {
          setOpen(o => !o);
          setHovering(false);
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className="grid grid-cols-2 gap-[3px] rounded-md p-2 hover:bg-foreground/5 shrink-0"
      >
        {[0, 1, 2, 3].map(i => (
          <span key={i} className="w-[6px] h-[6px] rounded-[1.5px] bg-muted-foreground" />
        ))}
      </button>

      {/* Custom tooltip, matches the reference screenshot's solid dark bubble
          (not the browser's native title tooltip). Only shown when the panel
          itself is closed. */}
      {!open && hovering && (
        <div className="absolute top-full left-0 mt-2 whitespace-nowrap rounded-lg bg-neutral-800 text-white text-sm px-3 py-2 shadow-lg z-[70]">
          Explore trade types
        </div>
      )}

      {open && (
        <div className="fixed top-[64px] left-0 z-[60] w-[420px] max-w-[90vw] h-[calc(100dvh-64px)] overflow-y-auto bg-background border-r border-border shadow-2xl">
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <h2 className="text-2xl font-bold text-foreground">Trade types</h2>
            <button className="rounded-full bg-foreground/10 px-4 py-1.5 text-sm font-medium text-foreground hover:bg-foreground/15">
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
                    disabled={item.comingSoon}
                    title={item.comingSoon ? 'Coming soon' : undefined}
                    onClick={() => {
                      if (!item.comingSoon) setOpen(false);
                    }}
                    className={`flex items-center gap-2 rounded-xl px-4 py-3 text-left text-base font-medium transition-colors
                      ${item.active ? 'bg-foreground/10 text-foreground' : 'text-foreground'}
                      ${item.comingSoon ? 'opacity-50 cursor-not-allowed' : 'hover:bg-foreground/5 cursor-pointer'}
                    `}
                  >
                    {item.label}
                    {item.fire && <span>🔥</span>}
                    {item.comingSoon && (
                      <span className="ml-auto text-xs text-muted-foreground font-normal">Coming soon</span>
                    )}
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
