'use client';

interface MomentChartsFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

/*
 * BORA MOMENT CHARTS FIELD
 *
 * Visual treatment copied from OperationsField (admin visual language):
 * 7px tracking-heavy label + bordered input on --bora-background.
 * No new design system. Local-draft editing only (STEP 6: no persistence).
 */
export default function MomentChartsField({
  id,
  label,
  value,
  placeholder,
  onChange,
}: MomentChartsFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
        style={{ color: 'var(--bora-text-muted)' }}
      >
        {label}
      </label>

      <input
        id={id}
        name={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border px-3 py-3 text-xs outline-none transition-shadow duration-300 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[color:var(--bora-gold)]"
        style={{
          borderColor: 'var(--bora-border)',
          backgroundColor: 'var(--bora-background)',
          color: 'var(--bora-text)',
        }}
      />
    </div>
  );
}
