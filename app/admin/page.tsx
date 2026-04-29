'use client';

import React, { useState, useEffect } from 'react';
import { updateSlot, getRegistry } from '../../lib/admin-actions';
import { Shield, RefreshCcw, Edit3, Image as ImageIcon, Zap, Activity, BarChart3 } from 'lucide-react';

export default function Cockpit() {
  const [loading, setLoading] = useState(false);
  const [registry, setRegistry] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const currentSong = registry.find(s => s.slot_number === selectedSlot && !s.empty);

  useEffect(() => { fetchRegistry(); }, []);

  async function fetchRegistry() {
    setLoading(true);
    const data = await getRegistry();
    const fullRegistry = Array.from({ length: 20 }, (_, i) => {
      return data.find((s: any) => s.slot_number === i + 1) || { slot_number: i + 1, empty: true };
    });
    setRegistry(fullRegistry);
    setLoading(false);
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
      alert(`SYSTEM: Slot ${selectedSlot} synchronized.`);
      setSelectedSlot(null);
      await fetchRegistry();
    } catch (err) {
      alert("CRITICAL ERROR: Synchronization failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] text-zinc-300 p-4 md:p-8 font-mono selection:bg-[#b91c1c] selection:text-white">
      {/* HEADER SECTION */}
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-l-4 border-[#b91c1c] pl-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-[ -0.05em] uppercase">Bora_Pulse.Engine</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <p className="text-zinc-500 text-[10px] font-bold tracking-[0.3em] uppercase">Matitu Nation // Production Terminal v2.0</p>
          </div>
        </div>
        <button 
          onClick={fetchRegistry} 
          className="group flex items-center gap-2 px-4 py-2 border border-zinc-800 bg-zinc-900/50 hover:bg-[#b91c1c] hover:text-white transition-all duration-300"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest">Resync_Database</span>
          <RefreshCcw size={14} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}/>
        </button>
      </header>

      <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-6">
        
        {/* SLOT SELECTION GRID */}
        <section className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Activity size={12}/> Global_Registry_Status
            </h2>
            <span className="text-[10px] text-zinc-700">20_SLOTS_ACTIVE</span>
          </div>

          <div className="grid grid-cols-1 gap-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {registry.map((slot) => (
              <div 
                key={slot.slot_number}
                onClick={() => setSelectedSlot(slot.slot_number)}
                className={`group relative p-4 border transition-all duration-200 cursor-pointer ${
                  selectedSlot === slot.slot_number 
                    ? 'border-[#b91c1c] bg-[#b91c1c]/5' 
                    : 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-600 hover:bg-zinc-900/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <span className={`text-xl font-black ${selectedSlot === slot.slot_number ? 'text-[#b91c1c]' : 'text-zinc-800'}`}>
                      {slot.slot_number.toString().padStart(2, '0')}
                    </span>
                    
                    {slot.empty ? (
                      <div className="flex flex-col">
                        <span className="text-zinc-600 text-[11px] font-bold uppercase tracking-widest">Void_Slot</span>
                        <span className="text-zinc-800 text-[9px] uppercase">Awaiting_Data_Input...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-800 border border-zinc-700 overflow-hidden grayscale group-hover:grayscale-0 transition-all">
                          {slot.cover_url ? (
                            <img src={slot.cover_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600"><ImageIcon size={16}/></div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white uppercase tracking-tight leading-none mb-1">{slot.title}</p>
                          <p className="text-[10px] text-zinc-500 font