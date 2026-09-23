export default function Particles() {
  return (
    <div
      className="absolute inset-0 opacity-[0.07]"
      style={{
        backgroundImage:
          'linear-gradient(var(--bora-text) 1px, transparent 1px), linear-gradient(90deg, var(--bora-text) 1px, transparent 1px)',
        backgroundSize: '34px 34px',
        maskImage:
          'linear-gradient(to bottom, black, transparent 80%)',
        WebkitMaskImage:
          'linear-gradient(to bottom, black, transparent 80%)',
      }}
    />
  );
}
