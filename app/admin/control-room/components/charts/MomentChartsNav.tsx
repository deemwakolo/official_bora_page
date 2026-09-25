'use client';

export type MomentChartsPeriod = 'weekly' | 'monthly';

interface MomentChartsNavProps {
  activePeriod: MomentChartsPeriod;
  weeklyLabel: string;
  monthlyLabel: string;
  onSelect: (period: MomentChartsPeriod) => void;
}

/*
 * BORA MOMENT CHARTS NAV
 *
 * Visual language copied from OperationsNav: bordered surface on
 * --bora-background-deep, Cinzel uppercase labels, gold active state
 * with thin gold indicator. Responsive 1-col mobile → 2-col sm+.
 */
export default function MomentChartsNav({
  activePeriod,
  weeklyLabel,
  monthlyLabel,
  onSelect,
}: MomentChartsNavProps) {
  const items = [
    { id: 'weekly' as const, label: 'Weekly', hint: weeklyLabel },
    { id: 'monthly' as const, label: 'Monthly', hint: monthlyLabel },
  ];

  return (
    <nav
      aria-label="Moment chart periods"
      className="mt-3 w-full border"
      style={{
        borderColor: 'var(--bora-border)',
        backgroundColor: 'var(--bora-background-deep)',
      }}
    >
      <div className="grid w-full grid-cols-1 sm:grid-cols-2">
        {items.map((item) => {
          const isActive = activePeriod === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={isActive ? 'true' : undefined}
              className="relative min-w-0 overflow-hidden border-b px-4 py-4 text-left transition-all duration-300 last:border-b-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[color:var(--bora-gold)] sm:border-b-0 sm:border-r sm:px-4 sm:py-5 sm:text-center sm:last:border-r-0"
              style={{
                borderColor: 'var(--bora-border)',
                backgroundColor: isActive
                  ? 'color-mix(in srgb, var(--bora-gold) 5%, var(--bora-surface))'
                  : 'transparent',
              }}
            >
              <p
                className="whitespace-normal break-words font-cinzel text-[10px] font-black uppercase leading-tight tracking-[0.14em] sm:text-xs"
                style={{
                  color: isActive
                    ? 'var(--bora-gold)'
                    : 'var(--bora-text)',
                }}
              >
                {item.label}
              </p>

              <p
                className="mt-1 text-[6px] font-bold uppercase tracking-[0.14em]"
                style={{ color: 'var(--bora-text-subtle)' }}
              >
                {item.hint}
              </p>

              {isActive && (
                <span
                  aria-hidden
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{
                    backgroundColor: 'var(--bora-gold)',
                    boxShadow: '0 0 10px var(--bora-gold-glow)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
