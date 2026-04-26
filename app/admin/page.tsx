// app/admin/page.tsx
'use client';

import React, { useState } from 'react';
// Changed from @/lib/admin-actions to a relative path for better Vercel stability
import { injectSong } from '../../lib/admin-actions'; 

export default function Cockpit() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      // Ensure the function name here matches the export name in /lib/admin-actions.ts
      await injectSong(formData);
      alert("Injection Successful. Registry Updated.");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      console.error(err);
      alert("Injection Failed. Check Logs.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-8 font-mono">
      <h1 className="text-2xl font-black mb-8 border-b border-zinc-800 pb-4">
        MATITU <span className="text-[#b91c1c]">COMMAND_CENTER</span> v1.0
      </h1>

      <div className="grid md:grid-cols-2 gap-12">
        {/* SONG INJECTOR */}
        <section className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <h2 className="text-sm uppercase tracking-tighter mb-6 text-zinc-500">Asset_Injection</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" name="title" placeholder="Track Title" required className="w-full bg-black border border-zinc-700 p-3 rounded focus:border-[#b91c1c] outline-none" />
            <input type="text" name="artist" placeholder="Artist Name" required className="w-full bg-black border border-zinc-700 p-3 rounded focus:border-[#b91c1c] outline-none" />
            
            <div className="grid grid-cols-2 gap-4">
              <input type="number" name="yt_views" placeholder="YT Views" className="bg-black border border-zinc-700 p-3 rounded focus:border-[#b91c1c] outline-none" />
              <input type="number" name="sp_plays" placeholder="Spotify Plays" className="bg-black border border-zinc-700 p-3 rounded focus:border-[#b91c1c] outline-none" />
            </div>

            <div className="border-2 border-dashed border-zinc-700 p-8 text-center rounded hover:border-[#b91c1c] transition-colors cursor-pointer relative">
              <p className="text-xs text-zinc-500 mb-2">Drag & Drop Cover Art</p>
              <input type="file" name="cover" accept="image/*" required className="text-xs w-full" />
            </div>

            <button disabled={loading} className="w-full bg-[#b91c1c] p-4 font-bold uppercase tracking-widest hover:bg-red-700 disabled:opacity-50 transition-all">
              {loading ? 'Processing...' : 'Execute Injection'}
            </button>
          </form>
        </section>

        {/* NEWS HUB */}
        <section className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <h2 className="text-sm uppercase tracking-tighter mb-6 text-zinc-500">News_Deployer</h2>
          <textarea placeholder="Write update or paste Instagram link..." className="w-full h-32 bg-black border border-zinc-700 p-3 rounded mb-4 focus:border-[#b91c1c] outline-none" />
          <button className="w-full border border-[#b91c1c] text-[#b91c1c] p-4 font-bold uppercase tracking-widest hover:bg-[#b91c1c] hover:text-white transition-all">
            Deploy to Hub
          </button>
        </section>
      </div>
    </main>
  );
}