// app/admin/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { injectSong, getRegistry, deleteSong } from '../../lib/admin-actions';
import { LayoutDashboard, Radio, Trash2, RefreshCcw } from 'lucide-react';

export default function Cockpit() {
  const [loading, setLoading] = useState(false);
  const [registry, setRegistry] = useState<any[]>([]);

  // Load the current Top 10 on start
  useEffect(() => {
    fetchRegistry();
  }, []);

  async function fetchRegistry() {
    const data = await getRegistry();
    setRegistry(data || []);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await injectSong(formData);
      alert("Asset Injected Successfully.");
      (e.target as HTMLFormElement).reset();
      fetchRegistry(); // Refresh the list
    } catch (err) {
      alert("Injection Failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (confirm("Decommission this asset?")) {
      await deleteSong(id);
      fetchRegistry();
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 font-mono">
      <header className="flex justify-between items-center mb-10 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">
            MATITU <span className="text-[#b91c1c]">COMMAND_CENTER</span>
          </h1>
          <p className="text-zinc-500 text-xs mt-1">BORA_CHARTS // SYSTEM_ACTIVE</p>
        </div>
        <button onClick={fetchRegistry} className="p-2 hover:bg-zinc-800 rounded">
          <RefreshCcw size={20} />
        </button>
      </header>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* LEFT: INJECTION PORTAL */}
        <section className="lg:col-span-4 bg-zinc-900/50 p-6 rounded border border-zinc-800">
          <div className="flex items-center gap-2 mb-6 text-[#b91c1c]">
            <Radio size={16} />
            <h2 className="text-sm uppercase font-bold">New_Asset_Injection</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" name="title" placeholder="Track Title" required className="w-full bg-black border border-zinc-700 p-3 rounded focus:border-[#b91c1c] outline-none" />
            <input type="text" name="artist" placeholder="Artist Name" required className="w-full bg-black border border-zinc-700 p-3 rounded focus:border-[#b91c1c] outline-none" />
            <div className="grid grid-cols-2 gap-4">
              <input type="number" name="yt_views" placeholder="YT Views" className="bg-black border border-zinc-700 p-3 rounded focus:border-[#b91c1c] outline-none" />
              <input type="number" name="sp_plays" placeholder="Spotify Plays" className="bg-black border border-zinc-700 p-3 rounded focus:border-[#b91c1c] outline-none" />
            </div>
            <div className="border border-dashed border-zinc-700 p-4 rounded text-center">
              <input type="file" name="cover" accept="image/*" required className="text-xs" />
            </div>
            <button disabled={loading} className="w-full bg-[#b91c1c] p-4 font-bold uppercase hover:bg-red-700 transition-all disabled:opacity-50">
              {loading ? 'Processing...' : 'Execute Injection'}
            </button>
          </form>
        </section>

        {/* RIGHT: LIVE REGISTRY MANAGER */}
        <section className="lg:col-span-8 bg-zinc-900/50 p-6 rounded border border-zinc-800">
          <div className="flex items-center gap-2 mb-6 text-zinc-400">
            <LayoutDashboard size={16} />
            <h2 className="text-sm uppercase font-bold">Live_Chart_Registry</h2>
          </div>

          <div className="space-y-2">
            {registry.map((song, index) => (
              <div key={song.id} className="bg-black border border-zinc-800 p-3 rounded flex items-center justify-between group hover:border-zinc-600 transition-all">
                <div className="flex items-center gap-4">
                  <span className="text-zinc-700 font-bold w-4">0{index + 1}</span>
                  <img src={song.cover_url} alt="cover" className="w-12 h-12 rounded object-cover border border-zinc-800" />
                  <div>
                    <h3 className="text-sm font-bold leading-tight">{song.title}</h3>
                    <p className="text-[10px] text-zinc-500 uppercase">{song.artist}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="hidden md:block text-right">
                        <p className="text-[10px] text-zinc-600 uppercase">Momentum</p>
                        <p className="text-xs text-[#b91c1c] font-bold">{song.momentum_score}%</p>
                    </div>
                    <button onClick={() => handleDelete(song.id)} className="text-zinc-600 hover:text-red-500 transition-colors">
                        <Trash2 size={18} />
                    </button>
                </div>
              </div>
            ))}
            {registry.length === 0 && <p className="text-zinc-700 text-center py-10 italic">Registry Empty. Awaiting Injection...</p>}
          </div>
        </section>
      </div>
    </main>
  );
}