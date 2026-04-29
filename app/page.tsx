// app/page.tsx
import Header from './components/Header';
import HotThree from './components/HotThree';
import ChartWrapper from './components/ChartWrapper'; 
import Throne from './components/Throne';
import Ticker from './components/Ticker';
import Fresh from './components/Fresh';
import News from './components/News';
import Footer from './components/Footer';

import { getRegistry } from '../lib/admin-actions';

// ⚡ Force fresh rendering for real-time Matitu Nation data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const registryData = await getRegistry();

  /**
   * BORA ENGINE: DATA INITIALIZATION
   * 1. Map data to ensure required fields exist
   * 2. Sort by momentum_score descending for the server-side render
   */
  const rankedSongs = (registryData || [])
    .map((item: any) => ({
      ...item,
      rank: item.slot_number ?? 0,
      momentum_score: item.momentum_score ?? 100, // Default baseline
    }))
    .sort((a, b) => b.momentum_score - a.momentum_score);

  console.log(`BORA ENGINE: System Active. Processing ${rankedSongs.length} entries.`);

  return (
    <main className="min-h-screen bg-[#050505] text-white antialiased flex flex-col relative overflow-x-hidden selection:bg-[#D4AF37] selection:text-black">

      {/* AMBIENT BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[1000px] h-[700px] bg-[#D4AF37]/5 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#b91c1c]/5 blur-[120px] rounded-full" />
      </div>

      <Header />

      <div className="sticky top-[64px] md:top-[80px] z-40">
        <Ticker />
      </div>

      <section className="relative z-10 pt-4">
        <Throne />
      </section>

      <div className="relative z-10 flex flex-col gap-0">
        <section className="pt-8 md:pt-12">
          <HotThree />
        </section>

        {/* REGISTRY SECTION: Handing off to the Client-Side Wrapper */}
        <section className="w-full relative pt-8 md:pt-12">
          {rankedSongs.length > 0 ? (
            <ChartWrapper songs={rankedSongs} />
          ) : (
            <div className="text-center py-20 opacity-50">
              <div className="w-12 h-[1px] bg-[#D4AF37] mx-auto mb-6 opacity-40" />
              <p className="text-xl font-black italic tracking-[0.3em] uppercase">
                The Registry is Quiet
              </p>
              <p className="text-[10px] font-mono mt-4 opacity-40 tracking-widest">
                CONNECTING_TO_MATITU_CORE...
              </p>
            </div>
          )}
        </section>

        <section className="w-full border-t border-white/5 mt-8 md:mt-12">
          <Fresh />
        </section>

        <section className="w-full bg-[#080000]/40 backdrop-blur-sm border-t border-white/5 mt-12 pt-4 pb-20">
          <News />
        </section>
      </div>

      <Footer />
    </main>
  );
}