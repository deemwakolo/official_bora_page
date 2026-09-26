import About from '../components/about/About';

// BORA PUBLIC ABOUT US ROUTE
// Content inasoma kutoka app/components/about/aboutData.ts
// (shared mock) — hakuna database.
export default function AboutPage() {
  return (
    <main
      className="relative flex min-h-screen flex-col overflow-x-hidden antialiased"
      style={{
        backgroundColor: 'var(--bora-background)',
        color: 'var(--bora-text)',
      }}
    >
      <div className="relative z-10 flex-1">
        <About />
      </div>
    </main>
  );
}
