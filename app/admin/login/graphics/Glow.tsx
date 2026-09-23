export default function Glow() {
  return (
    <>
      {/* TOP GOLD ATMOSPHERE */}
      <div
        className="absolute left-1/2 top-[-100px] h-[320px] w-[700px] -translate-x-1/2 rounded-full blur-[140px]"
        style={{
          background:
            'radial-gradient(circle, var(--bora-gold-glow) 0%, transparent 70%)',
        }}
      />

      {/* CARD GOLD GLOW */}
      <div
        className="absolute left-1/2 top-1/2 h-[90%] w-[105%] -translate-x-1/2 -translate-y-1/2 rounded-[40px] blur-[100px]"
        style={{
          background:
            'radial-gradient(circle, var(--bora-gold-glow) 0%, transparent 68%)',
        }}
      />

      {/* RED LOWER GLOW */}
      <div
        className="absolute bottom-[-80px] left-[-80px] h-[220px] w-[220px] rounded-full blur-[110px]"
        style={{
          background:
            'radial-gradient(circle, var(--bora-red-glow) 0%, transparent 70%)',
        }}
      />
    </>
  );
}
