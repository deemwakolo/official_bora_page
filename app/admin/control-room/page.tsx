import ChartWrapper from '../../components/ChartWrapper';

import ControlRoomShell from './components/ControlRoomShell';


import { getRegistry } from '../../../lib/admin-actions';

// COPY YA BORA PAGE (GUI TU) KWA CONTROL ROOM.
// Backend haiguswi: getRegistry() inaendelea kutumika kama asili.
// TRENDING haipaswiwi hapa — ControlRoomShell inaroute moja kwa
// moja kwenye TrendingOP ya admin.

// NEXT.JS ISI-RENDER UPYA PAGE KWA CACHE

export const dynamic = 'force-dynamic';

export const revalidate = 0;

// PAGE YA CONTROL ROOM — GUI KAMA BORA, HEADER NI NORMAL, UPDATES HAIKO

export default async function ControlRoomPage() {

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

        {/* CONTROLROOMSHELL INASIMAMIA HEADER, NAV NA CONTENT */}

        <ControlRoomShell
          top10={
            <section className="w-full pt-8 md:pt-12">
              <ChartWrapper songs={rankedSongs} />
            </section>
          }
        />


      </div>

    </main>
  );
}
