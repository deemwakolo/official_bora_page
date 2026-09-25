'use client';

interface TrendingFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

/*
 * BORA CONTROL ROOM TRENDING FIELD
 *
 * Reuses the existing admin field treatment (label + bordered input
 * on --bora-background). No new design system.
 */
export default function TrendingField({
  id,
  label,
  value,
  placeholder,
  onChange,
}: TrendingFieldProps) {
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
