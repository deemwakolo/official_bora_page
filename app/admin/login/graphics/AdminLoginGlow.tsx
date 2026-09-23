export default function AdminLoginGlow() {
  return (
    <>
      <div
        className="absolute left-1/2 top-[-15%] h-[600px] w-[900px] -translate-x-1/2 rounded-full blur-[140px]"
        style={{
          backgroundColor: 'var(--bora-gold-glow)',
        }}
      />

      <div
        className="absolute bottom-[-10%] right-[-5%] h-[500px] w-[500px] rounded-full blur-[120px]"
        style={{
          backgroundColor: 'var(--bora-red-glow)',
        }}
      />
    </>
  );
}
