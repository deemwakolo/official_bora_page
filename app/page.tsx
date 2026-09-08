
import ChartWrapper from './components/ChartWrapper';

import WeeklySlide from './components/trends/slides/WeeklySlide';
import Fresh from './components/discover/Fresh';

import News from './components/news/News';

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
        Number(b.momentum_score) -
        Number(a.momentum_score)
    )
    .slice(0, 15);

  // LOG YA KUJUA ENGINE IMEPOKEA ENTRIES NGAPI

  console.log(
    `BORA ENGINE: System Active. Processing ${rankedSongs.length} entries.`
  );

  return (
    <main
      className="relative flex min-h-screen flex-col overflow-x-hidden antialiased"
      style={{
        backgroundColor: 'var(--bora-background)',
        color: 'var(--bora-text)',
      }}
    >

      {/* BACKGROUND GLOWS ZA BORA */}

      <div className="pointer-events-none fixed inset-0 z-0">

        {/* GOLD GLOW YA JUU */}

        <div
          className="absolute left-1/2 top-[-15%] h-[700px] w-[1000px] -translate-x-1/2 rounded-full blur-[140px]"
          style={{
            backgroundColor: 'var(--bora-gold-glow)',
          }}
        />

        {/* RED GLOW YA CHINI */}

        <div
          className="absolute bottom-[-10%] right-[-5%] h-[600px] w-[600px] rounded-full blur-[120px]"
          style={{
            backgroundColor: 'var(--bora-red-glow)',
          }}
        />

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

                <div
                  className="py-20 text-center"
                  style={{
                    color: 'var(--bora-text)',
                    opacity: 0.5,
                  }}
                >

                  {/* GOLD LINE YA UJUMBE */}

                  <div
                    className="mx-auto mb-6 h-[1px] w-12"
                    style={{
                      backgroundColor:
                        'var(--bora-gold)',
                      opacity: 0.4,
                    }}
                  />

                  <p className="text-xl font-black italic uppercase tracking-[0.3em]">
                    The Registry is Quiet
                  </p>

                  <p
                    className="mt-4 font-mono text-[10px] tracking-widest"
                    style={{
                      color:
                        'var(--bora-text-subtle)',
                      opacity: 0.4,
                    }}
                  >
                    CONNECTING_TO_MATITU_CORE...
                  </p>

                </div>

              )}

            </section>
          }

          trends={
            <section className="w-full pt-8 md:pt-12">

              <WeeklySlide />

            </section>
          }

          discover={
            <section className="w-full pt-8 md:pt-12">

              <Fresh />

            </section>
          }

          news={
            <section className="w-full pb-20 pt-8 md:pt-12">

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