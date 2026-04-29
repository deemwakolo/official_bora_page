// app/page.tsx
import Header from './components/Header';
import HotThree from './components/HotThree';
import Chart from './components/Chart';
import Throne from './components/Throne';
import Ticker from './components/Ticker';
import Fresh from './components/Fresh';
import News from './components/News';
import Footer from './components/Footer';
import { getRegistry } from '../lib/admin-actions'; 
import { handleVoteAction } from './actions'; // 👈 Import the clean action

export default async function Home() {
  // 1. Fetch the Sacred 20 Registry directly on the server
  const registryData = await getRegistry() || [];

  // 2. Format rank based on slot_number for the UI
  const rankedSongs = registryData.map((item: any) => ({
    ...item,
    rank: item.slot_number
  }));

  return (
    <main className="min-h-screen bg-[#050505] text-white antialiased flex flex-col relative overflow-x-hidden selection:bg-[#D4AF37] selection:text-black">
      
      {/* AMBIENT BACKGROUND GLOW */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[1000px] h-[700px] bg-[#D4AF37]/5 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#b91c1c]/5 blur-[120px] rounded-full" />
      </div>

      <Header />

      <div className="sticky top-[64px] md:top-[80px] z-40">
        <Ticker />
      </div>

      {/* 👑 TOP OF THE CHART (Visual Highlight) */}
      <section className="relative z-10 pt-4">
        <Throne />
      </section>

      <div className="relative z-10 flex flex-col gap-0">
        
        {/* TOP 3 - HOT DISCOVERY */}
        <section className="pt-8 md:pt-12">
          <HotThree />
        </section>

        {/* THE MAIN CHART ENGINE */}
        <section className="w-full relative pt-8 md:pt-12">
          {/* Now passing the server-fetched 'rankedSongs' 
              and the imported 'handleVoteAction'.
          */}
          <Chart songs={rankedSongs} onVote={handleVoteAction} />
        </section>

        {/* NEW RELEASES SECTION */}
        <section className="w-full border-t border-white/5 mt-8 md:mt-12">
          <Fresh />
        </section>

        {/* INDUSTRY NEWS & UPDATES */}
        <section className="w-full bg-[#080000]/40 backdrop-blur-sm border-t border-white/5 mt-12 pt-4 pb-20">
          <News />
        </section>

      </div>

      <Footer />
    </main>
  );
}