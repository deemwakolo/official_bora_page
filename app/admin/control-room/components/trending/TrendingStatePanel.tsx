'use client';

interface TrendingStatePanelProps {
  title: string;
  lines?: readonly string[];
  tone?: 'idle' | 'error';
  onRetry?: () => void;
}

/*
 * BORA CONTROL ROOM TRENDING STATE PANEL
 *
 * Honest empty/error state — no invented trending rows.
 */
export default function TrendingStatePanel({
  title,
  lines,
  tone = 'idle',
  onRetry,
}: TrendingStatePanelProps) {
  return (
    <div
      className="flex w-full flex-col items-center justify-center border px-6 py-12 text-center"
      style={{
        borderColor: 'var(--bora-border)',
        backgroundColor: 'var(--bora-surface)',
      }}
    >
      <p
        className="font-cinzel text-[10px] font-black uppercase leading-none tracking-[0.18em]"
        style={{
          color:
            tone === 'error'
              ? 'var(--bora-red)'
              : 'var(--bora-gold)',
        }}
      >
        {title}
      </p>

      {lines?.map((line) => (
        <p
          key={line}
          className="mt-2 max-w-[420px] text-[7px] uppercase tracking-[0.14em]"
          style={{ color: 'var(--bora-text-muted)' }}
        >
          {line}
        </p>
      ))}

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 border px-5 py-3 text-[8px] font-black uppercase tracking-[0.15em] transition-all duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[color:var(--bora-gold)]"
          style={{
            borderColor: 'var(--bora-gold)',
            color: 'var(--bora-gold)',
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
