'use client';

import React from 'react';

import ProfileGUI from './ProfileGUI';

// MOCK PROFILE DATA: BAADAYE ITABADILISHWA NA SUPABASE/AUTH HAPA TU
const profile = {
  displayName: 'Dee',
  username: 'deemwakolo',
  bio: 'Tanzanian music lover 🇹🇿',
  avatarUrl:
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
};

export default function Profile() {
  return <ProfileGUI profile={profile} />;
}
