'use client';

import type { OperationsSong } from '../config/operations';

interface OperationsFieldProps {
  name: keyof OperationsSong;
  label: string;
  value: string;
  type?: 'text' | 'date';
  placeholder?: string;
  onChange: (value: string) => void;
}

/*
 * BORA OPERATIONS FIELD
 *
 * Label + input treatment inatoka kwenye admin controls zilizopo
 * (FAQControl / Top15Op): label 7px tracking-heavy, input yenye
 * border ya --bora-border na background ya --bora-background.
 */
export default function OperationsField({
  name,
  label,
  value,
  type = 'text',
  placeholder,
  onChange,
}: OperationsFieldProps) {
  const inputId = `operations-song-${name}`;

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
        style={{ color: 'var(--bora-text-muted)' }}
      >
        {label}
      </label>

      <input
        id={inputId}
        name={name}
        type={type}
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
