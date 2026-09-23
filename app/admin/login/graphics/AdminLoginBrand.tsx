export default function AdminLoginBrand() {
  return (
    <div className="mb-7 text-center">
      <div className="flex items-center justify-center">
        <div
          className="font-cinzel text-3xl font-black tracking-[0.18em]"
          style={{
            color: 'var(--bora-text)',
            textShadow: '0 0 20px var(--bora-gold-glow)',
          }}
        >
          BORA
        </div>

        <span
          className="ml-1.5 mt-4 h-1.5 w-1.5 rounded-full"
          style={{
            backgroundColor: 'var(--bora-gold)',
            boxShadow:
              '0 0 5px var(--bora-gold), 0 0 15px var(--bora-gold-glow)',
          }}
        />
      </div>

      <div
        className="mt-1.5 text-[7px] font-black uppercase tracking-[0.35em]"
        style={{ color: 'var(--bora-text-subtle)' }}
      >
        Control Room
      </div>
    </div>
  );
}
