'use client';

interface TradeModeToggleProps {
  mode: 'manual' | 'automated';
  onModeChange: (mode: 'manual' | 'automated') => void;
}

export function TradeModeToggle({ mode, onModeChange }: TradeModeToggleProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <button className="flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary">
        Automate Rise/Fall
        <span className="text-muted-foreground">›</span>
      </button>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onModeChange('manual')}
          title="Manual trading"
          className={`rounded-md p-2 ${
            mode === 'manual' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:bg-foreground/5'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
            <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
            <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
            <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>
        <button
          onClick={() => onModeChange('automated')}
          title="Automated trading"
          className={`rounded-full p-2 ${
            mode === 'automated' ? 'bg-orange-500/15 text-orange-500' : 'text-muted-foreground hover:bg-foreground/5'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="3" y="5" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="6" cy="9" r="1" fill="currentColor" />
            <circle cx="10" cy="9" r="1" fill="currentColor" />
            <path d="M8 5V2" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="8" cy="1.5" r="0.8" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  );
}
