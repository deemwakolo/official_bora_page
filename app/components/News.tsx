'use client';

import React from 'react';

interface NewsItem {
  id: number;
  category: string;
  title: string;
  timestamp: string;
  excerpt: string;
  image: string;
  isHot?: boolean;
}

const newsData: NewsItem[] = [
  {
    id: 1,
    category: "CHART PULSE",
    title: "Sielewi Dominates the Bora Top 20 for the Third Week",
    timestamp: "20:44 / 26 APR",
    excerpt: "Matitu Nation's latest breakout single continues to defy gravity, holding the #1 spot with record-breaking voting volume across all regions.",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80",
    isHot: true,
  },
  {
    id: 2,
    category: "INDUSTRY",
    title: "The Rise of Bongo-Drill: A New Sonic Frontier",
    timestamp: "18:12 / 26 APR",
    excerpt: "Producers in Dar are blending traditional rhythmic pockets with heavy 808 slides.",
    image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80"
  },
  {
    id: 3,
    category: "STUDIO TECH",
    title: "Matitu Nation Unveils Creative Suite",
    timestamp: "09:00 / 25 APR",
    excerpt: "Architecting the future: A deep dive into the hybrid workflow powering the next generation.",
    image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80"
  },
  {
    id: 4,
    category: "CULTURE",
    title: "Visual Identity: The Beast Titan Aesthetic",
    timestamp: "14:30 / 24 APR",
    excerpt: "Exploring the urban-themed visual direction of Zeke.bxt and the lime-green era.",
    image: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80"
  },
  {
    id: 5,
    category: "MARKET",
    title: "Iringa Music Scene: The Nzihi Corridor",
    timestamp: "11:15 / 23 APR",
    excerpt: "How regional government shifts are impacting local creative hubs and talent procurement.",
    image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80"
  }
];

export default function News() {
  const [featured, ...others] = newsData;

  return (
    <section className="w-full max-w-6xl mx-auto px-4 md:px-6 pt-12 pb-4 bg-transparent font-cinzel text-white">
      {/* 🛠 TACTICAL HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 border-l-4 border-[#b91c1c] pl-6">
        <div>
          <h2 className="text-[#D4AF37] text-xs font-black tracking-[0.4em] uppercase mb-1">Archive_Feed.v7</h2>
          <h3 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
            Bora <span className="text-[#b91c1c] line-through decoration-white/20">Intelligence</span>
          </h3>
        </div>
        <div className="mt-4 md:mt-0 text-left md:text-right font-mono">
          <p className="text-[10px] text-white/30 uppercase tracking-widest">Global Access Node: TZ_DAR</p>
          <p className="text-[10px] text-[#D4AF37] font-bold">STATUS: STREAMING_LIVE</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* 🎬 THE FEATURED "LEAD" DOSSIER */}
        <div className="lg:col-span-7 group cursor-pointer mb-0">
          <div className="relative mb-6 border border-white/10 overflow-hidden">
            <div className="absolute top-2 left-2 z-10 bg-[#b91c1c] text-white text-[8px] font-black px-2 py-0.5 tracking-widest uppercase">
              Urgent_File
            </div>
            <img 
              src={featured.image} 
              className="w-full aspect-[4/3] object-cover grayscale contrast-125 transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105"
              alt={featured.title}
            />
            <div className="absolute inset-0 bg-[#D4AF37]/10 opacity-0 group-hover:opacity-100 mix-blend-overlay transition-opacity" />
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <span className="bg-white text-black text-[10px] font-black px-2 py-1 tracking-tighter uppercase">{featured.category}</span>
            <span className="text-white/20 font-mono text-[10px]">{featured.timestamp}</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-black uppercase leading-[0.9] mb-4 group-hover:text-[#D4AF37] transition-colors">
            {featured.title}
          </h2>
          <p className="text-white/50 text-sm font-sans leading-relaxed mb-6 max-w-xl italic">
            &quot;{featured.excerpt}&quot;
          </p>
          <button className="flex items-center gap-4 group/btn">
            <span className="w-12 h-[2px] bg-[#b91c1c] group-hover/btn:w-20 transition-all" />
            <span className="text-xs font-black tracking-widest uppercase">Decrypt Full Intel</span>
          </button>
        </div>

        {/* 📑 THE "SIDEBAR" FEED */}
        <div className="lg:col-span-5 flex flex-col gap-6 border-t md:border-t-0 md:border-l border-white/10 md:pl-8 pt-8 md:pt-0 h-full justify-start">
          <h4 className="text-[10px] font-black text-white/20 tracking-[0.5em] uppercase mb-2">Supplemental_Data</h4>
          
          {others.map((item, idx) => (
            <div key={item.id} className="group relative flex gap-4 cursor-pointer pb-4 border-b border-white/5 last:border-0 last:pb-0">
              <span className="text-[10px] font-mono text-[#b91c1c] font-black">0{idx + 2}</span>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                   <span className="text-[#D4AF37] text-[8px] font-black tracking-widest uppercase">{item.category}</span>
                   <span className="text-white/10 text-[8px] font-mono">— {item.timestamp}</span>
                </div>
                <h5 className="text-lg font-bold uppercase leading-tight group-hover:text-[#D4AF37] transition-all">
                  {item.title}
                </h5>
                <div className="h-0 group-hover:h-5 overflow-hidden transition-all duration-500">
                  <p className="text-[10px] text-white/40 mt-1 line-clamp-1 font-sans italic">{item.excerpt}</p>
                </div>
              </div>
              
              <div className="absolute -right-4 top-0 w-16 h-16 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                 <img 
                    src={item.image} 
                    className="w-full h-full object-cover grayscale rounded-sm border border-white/20 shadow-2xl" 
                    alt={item.title}
                 />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}