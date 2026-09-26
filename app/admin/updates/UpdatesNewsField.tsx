'use client';

interface UpdatesNewsFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}

const inputClass =
  'w-full border px-3 py-2.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--bora-gold)]';

const inputStyle = {
  borderColor: 'var(--bora-border)',
  backgroundColor: 'var(--bora-background)',
  color: 'var(--bora-text)',
};

// BORA UPDATES — NEWS FIELD
// Samework label + bordered input treatment kama About editor.
export default function UpdatesNewsField({
  id,
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: UpdatesNewsFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[7px] font-black uppercase tracking-[0.15em]"
        style={{ color: 'var(--bora-text-muted)' }}
      >
        {label}
      </label>

      {multiline ? (
        <textarea
          id={id}
          name={id}
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} resize-y`}
          style={inputStyle}
        />
      ) : (
        <input
          id={id}
          name={id}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          style={inputStyle}
        />
      )}
    </div>
  );
}
