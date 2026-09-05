import ChartWrapper from './components/ChartWrapper';
import Throne from './components/trends/Throne';
import Fresh from './components/discover/Fresh';
import News from './components/News';
import Footer from './components/workflow/Footer';
import BoraShell from './components/workflow/BoraShell';

import { getRegistry } from '../lib/admin-actions';

// NEXT.JS ISI-RENDER UPYA PAGE KWA CACHE
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// PAGE KUU YA BORA
export default async function Home() {
  // CHUKUA DATA YA NYIMBO KUTOKA KWENYE REGISTRY
  const registryData = await getRegistry();

  // PANGA NYIMBO KWA MOMENTUM SCORE NA CHUKUA TOP 15
  const rankedSongs = (registryData || [])
    .map((item: any) => ({
      ...item,
      rank: item.slot_number ?? 0,
      momentum_score: item.momentum_score ?? 100,
    }))
    .sort(
      (a, b) =>
        Number(b.momentum_score) - Number(a.momentum_score)
    )
    .slice(0, 15);

  // LOG YA KUJUA ENGINE IMEPOKEA ENTRIES NGAPI
  console.log(
    `BORA ENGINE: System Active. Processing ${rankedSongs.length} entries.`
  );

  return (
    <main className="min-h-screen bg-[#050505] text-white antialiased flex flex-col relative overflow-x-hidden selection:bg-[#D4AF37] selection:text-black">

      {/* BACKGROUND GLOWS ZA BORA */}
      <div className="fixed inset-0 pointer-events-none z-0">

        {/* GOLD GLOW YA JUU */}
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[1000px] h-[700px] bg-[#D4AF37]/5 blur-[140px] rounded-full" />

        {/* RED GLOW YA CHINI */}
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#b91c1c]/5 blur-[120px] rounded-full" />

      </div>

      {/* CONTENT YOTE INAKAA JUU YA BACKGROUND */}
      <div className="relative z-10 flex-1">

        {/* BORASHELL INASIMAMIA TICKER, HEADER, NAV NA CONTENT */}
        <BoraShell
          top10={
            <section className="w-full pt-8 md:pt-12">
              {rankedSongs.length > 0 ? (
                <ChartWrapper songs={rankedSongs} />
              ) : (
                <div className="text-center py-20 opacity-50">

                  {/* GOLD LINE YA UJUMBE */}
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
          }

          trends={
            <section className="w-full pt-8 md:pt-12">
              <Throne />
            </section>
          }

          discover={
            <section className="w-full pt-8 md:pt-12">
              <Fresh />
            </section>
          }

          news={
            <section className="w-full pt-8 md:pt-12 pb-20">
              <News />
            </section>
          }
        />

      </div>

      {/* FOOTER YA BORA */}
      <Footer />

    </main>
  );
}