'use client';

import React, { useState, useEffect } from 'react';
import { updateSlot, getRegistry } from '../../lib/admin-actions';
import { Shield, RefreshCcw, Edit3, Image as ImageIcon, Zap, Activity, BarChart3 } from 'lucide-react';

export default function Cockpit() {
  const [loading, setLoading] = useState(false);
  const [registry, setRegistry] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const currentSong = registry.find(s => s.slot_number === selectedSlot && !s.empty);

  useEffect(() => {
    fetchRegistry();
  }, []);

  async function fetchRegistry() {
    setLoading(true);
    try {
      const data = await getRegistry();
      const fullRegistry = Array.from({ length: 20 }, (_, i) => {
        return data.find((s: any) => s.slot_number === i + 1) || { slot_number: i + 1, empty: true };
      });
      setRegistry(fullRegistry);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedSlot) return;
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    formData.append('slot_number', selectedSlot.toString());
    
    if (currentSong?.cover_url) {
      formData.append('existing_cover_url', currentSong.cover_url);
    }

    try {
      await updateSlot(formData);
      setSelectedSlot(null);
      await fetchRegistry();
    } catch (err) {
      console.error("Update failed", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] text-zinc-300 p-4 md:p-8 font-mono">
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-l-4 border-[#b91c1c] pl-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Bora_Pulse.Engine</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <p className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase">Matitu Nation // Terminal</p>
          </div>
        </div>
        <button onClick={fetchRegistry} className="flex items-center gap-2 px-4 py-2 border border-zinc-800 bg-zinc-900/50 hover:bg-[#b91c1c] hover:text-white transition-all">
          <span className="text-[10px] font-bold uppercase">Resync</span>
          <RefreshCcw size={14} className={loading ? 'animate-spin' : ''}/>
        </button>
      </header>

      <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 space-y-3">
          <div className="grid grid-cols-1 gap-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {registry.map((slot) => (
              <div 
                key={slot.slot_number}
                onClick={() => setSelectedSlot(slot.slot_number)}
                className={`p-4 border transition-all cursor-pointer ${selectedSlot === slot.slot_number ? 'border-[#b91c1c] bg-[#b91c1c]/5' : 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-600'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <span className={`text-xl font-black ${selectedSlot === slot.slot_number ? 'text-[#b91c1c]' : 'text-zinc-800'}`}>
                      {slot.slot_number.toString().padStart(2, '0')}
                    </span>
                    {slot.empty ? (
                      <span className="text-zinc-600 text-[11px] font-bold uppercase">Void_Slot</span>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-zinc-800 border border-zinc-700 overflow-hidden">
                          {slot.cover_url && <img src={slot.cover_url} className="w-full h-full object-cover grayscale" alt="" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white uppercase">{slot.title}</p>
                          <p className="text-[10px] text-zinc-500 font-medium uppercase">{slot.artist}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <Edit3 size={16} className={selectedSlot === slot.slot_number ? 'text-[#b91c1c]' : 'text-zinc-800'}/>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-5">
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-sm sticky top-8">
            <div className="bg-zinc-800/50 p-4 border-b border-zinc-800 flex justify-between items-center">
              <span className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Zap size={14} className="text-[#b91c1c] fill-[#b91c1c]"/> Console
              </span>
            </div>

            {selectedSlot ? (
              <form onSubmit={handleUpdate} className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] text-[#b91c1c] font-black uppercase mb-1 block">Title</label>
                    <input key={`t-${selectedSlot}`} type="text" name="title" defaultValue={currentSong?.title || ''} required className="w-full bg-black border border-zinc-800 p-3 text-sm text-white focus:border-[#b91c1c] outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 font-black uppercase mb-1 block">Artist</label>
                    <input key={`a-${selectedSlot}`} type="text" name="artist" defaultValue={currentSong?.artist || ''} required className="w-full bg-black border border-zinc-800 p-3 text-sm text-white focus:border-[#b91c1c] outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input key={`y-${selectedSlot}`} type="number" name="yt_views" defaultValue={currentSong?.yt_views || 0} className="w-full bg-black border border-zinc-800 p-3 text-sm text-white outline-none" />
                    <input key={`s-${selectedSlot}`} type="number" name="sp_plays" defaultValue={currentSong?.sp_plays || 0} className="w-full bg-black border border-zinc-800 p-3 text-sm text-white outline-none" />
                  </div>
                  <input type="file" name="cover" accept="image/*" className="text-[10px] text-zinc-500" />
                  <button disabled={loading} className="w-full bg-white text-black py-4 font-black uppercase text-xs hover:bg-[#b91c1c] hover:text-white transition-all">
                    {loading ? 'Processing...' : 'Authorize_Update'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-20 flex flex-col items-center text-center space-y-4">
                <BarChart3 size={40} className="text-zinc-800" />
                <p className="text-zinc-700 text-[9px] uppercase tracking-widest">Select slot to modify</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}