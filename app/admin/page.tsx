// app/admin/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { updateSlot, getRegistry } from '../../lib/admin-actions';
import { Shield, RefreshCcw, Edit3 } from 'lucide-react';

export default function Cockpit() {
  const [loading, setLoading] = useState(false);
  const [registry, setRegistry] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  useEffect(() => { fetchRegistry(); }, []);

  async function fetchRegistry() {
    const data = await getRegistry();
    // Fill empty slots up to 20 if they don't exist yet
    const fullRegistry = Array.from({ length: 20 }, (_, i) => {
      return data.find((s: any) => s.slot_number === i + 1) || { slot_number: i + 1, empty: true };
    });
    setRegistry(fullRegistry);
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedSlot) return;
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    formData.append('slot_number', selectedSlot.toString());

    try {
      await updateSlot(formData);
      alert(`Slot ${selectedSlot} Updated.`);
      setSelectedSlot(null);
      fetchRegistry();
    } catch (err) {
      alert("Update Failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 font-mono">
      <header className="mb-10 border-b border-zinc-800 pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black">THE_SACRED_20</h1>
          <p className="text-[#b91c1c] text-xs font-bold tracking-widest">STATION_MANAGER // MATITU NATION</p>
        </div>
        <button onClick={fetchRegistry} className="p-2 border border-zinc-800 hover:bg-zinc-900"><RefreshCcw size={18}/></button>
      </header>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* SLOT LIST */}
        <section className="space-y-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {registry.map((slot) => (
            <div 
              key={slot.slot_number}
              onClick={() => setSelectedSlot(slot.slot_number)}
              className={`p-3 border flex items-center justify-between cursor-pointer transition-all ${
                selectedSlot === slot.slot_number ? 'border-[#b91c1c] bg-zinc-900' : 'border-zinc-800 bg-black hover:border-zinc-600'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-zinc-600 font-bold">#{slot.slot_number.toString().padStart(2, '0')}</span>
                {slot.empty ? (
                  <span className="text-zinc-700 italic text-xs">--- EMPTY_SLOT ---</span>
                ) : (
                  <div className="flex items-center gap-3">
                    <img src={slot.cover_url} className="w-10 h-10 object-cover border border-zinc-700" />
                    <div>
                      <p className="text-sm font-bold uppercase">{slot.title}</p>
                      <p className="text-[10px] text-zinc-500">{slot.artist}</p>
                    </div>
                  </div>
                )}
              </div>
              <Edit3 size={14} className={selectedSlot === slot.slot_number ? 'text-[#b91c1c]' : 'text-zinc-800'}/>
            </div>
          ))}
        </section>

        {/* EDITOR PORTAL */}
        <section className="bg-zinc-900/30 p-8 border border-zinc-800 rounded h-fit sticky top-6">
          {selectedSlot ? (
            <form onSubmit={handleUpdate} className="space-y-6">
              <h2 className="text-[#b91c1c] font-bold text-sm uppercase flex items-center gap-2">
                <Shield size={16}/> Editing_Slot_{selectedSlot}
              </h2>
              <div className="space-y-4">
                <input type="text" name="title" placeholder="Track Title" required className="w-full bg-black border border-zinc-700 p-4 rounded focus:border-[#b91c1c] outline-none" />
                <input type="text" name="artist" placeholder="Artist Name" required className="w-full bg-black border border-zinc-700 p-4 rounded focus:border-[#b91c1c] outline-none" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" name="yt_views" placeholder="YT Views" className="bg-black border border-zinc-700 p-4 rounded" />
                  <input type="number" name="sp_plays" placeholder="Spotify Plays" className="bg-black border border-zinc-700 p-4 rounded" />
                </div>
                <div className="border border-dashed border-zinc-700 p-6 text-center">
                  <input type="file" name="cover" accept="image/*" className="text-xs" />
                </div>
                <button disabled={loading} className="w-full bg-[#b91c1c] p-5 font-black uppercase tracking-tighter hover:bg-red-700">
                  {loading ? 'REWRITING_DATA...' : 'UPDATE_SACRED_SLOT'}
                </button>
              </div>
            </form>
          ) : (
            <div className="h-64 flex items-center justify-center text-center">
              <p className="text-zinc-600 text-xs uppercase tracking-widest leading-relaxed">
                Select a slot from the registry<br/>to begin overwriting
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}