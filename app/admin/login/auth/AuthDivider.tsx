export default function AuthDivider() {
  return (
    <div className="my-4 flex items-center gap-3">
      <div
        className="h-px flex-1"
        style={{
          background:
            'linear-gradient(90deg, transparent, var(--bora-border-strong))',
        }}
      />

      <span
        className="text-[6px] font-black uppercase tracking-[0.3em]"
        style={{ color: 'var(--bora-text-subtle)' }}
      >
        or
      </span>

      <div
        className="h-px flex-1"
        style={{
          background:
            'linear-gradient(90deg, var(--bora-border-strong), transparent)',
        }}
      />
    </div>
  );
}
