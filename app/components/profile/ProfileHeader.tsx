'use client';

import React from 'react';

import { Settings } from 'lucide-react';

import type { ProfileData } from './ProfileGUI';

// WATISTI ANAOWAPENDA: GRAPHICS ZAO (BAADAYE ZITATOKA DATABASE)
const favoriteArtists = [
  {
    name: 'Marioo',
    imageUrl:
      'https://images.unsplash.com/photo-1520785643438-5bf77931f493?auto=format&fit=crop&w=200&q=80',
  },
  {
    name: 'Diamond',
    imageUrl:
      'https://images.unsplash.com/photo-1470229722913-7ea0d7d2f0d5?auto=format&fit=crop&w=200&q=80',
  },
  {
    name: 'Rayvanny',
    imageUrl:
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=200&q=80',
  },
];

interface ProfileHeaderProps {
  profile: ProfileData;
}

export default function ProfileHeader({
  profile,
}: ProfileHeaderProps) {
  return (
    <header className="relative text-center">
      {/* GEAR YA ACCOUNT SETTINGS */}
      <div className="absolute right-0 top-0">
        <button
          type="button"
          aria-label="Account settings"
          className="rounded-full border border-white/10 p-2 transition hover:border-[var(--bora-gold)]/50"
          style={{
            color: 'var(--bora-text-muted)',
          }}
        >
          <Settings size={16} />
        </button>
      </div>

      {/* AVATAR + FALLBACK INITIAL */}
      <div
        className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-[var(--bora-gold)]/40"
        style={{
          backgroundColor: 'var(--bora-background-deep)',
        }}
      >
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={profile.displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-cinzel text-2xl text-[var(--bora-gold)]">
            {profile.displayName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* JINA (KUU) */}
      <h1 className="mt-3 font-cinzel text-2xl font-semibold">
        {profile.displayName}
      </h1>

      {/* USERNAME */}
      <p
        className="mt-1 text-sm"
        style={{ color: 'var(--bora-text-muted)' }}
      >
        @{profile.username}
      </p>

      {/* WATISTI ANAOWAPENDA */}
      <div className="mt-3 flex items-start justify-center gap-6">
        {favoriteArtists.map((artist) => (
          <div
            key={artist.name}
            className="flex flex-col items-center"
          >
            <div className="h-12 w-12 overflow-hidden rounded-full border border-white/10">
              <img
                src={artist.imageUrl}
                alt={artist.name}
                className="h-full w-full object-cover"
              />
            </div>

            <p
              className="mt-1 font-cinzel text-[10px] font-black uppercase tracking-[0.08em]"
              style={{ color: 'var(--bora-text-muted)' }}
            >
              {artist.name}
            </p>
          </div>
        ))}
      </div>

      {/* BIO */}
      <p
        className="mx-auto mt-2.5 max-w-sm text-sm leading-5"
        style={{ color: 'var(--bora-text-muted)' }}
      >
        {profile.bio}
      </p>

      {/* EDIT PROFILE: SURFACE TU, WORKFLOW SIJOI */}
      <button
        type="button"
        className="mt-3 rounded-full border border-white/10 px-5 py-2 text-sm transition hover:border-[var(--bora-gold)]/50"
      >
        Edit Profile
      </button>
    </header>
  );
}
