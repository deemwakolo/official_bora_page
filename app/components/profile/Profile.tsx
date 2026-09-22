'use client';

import React from 'react';

import ProfileGUI from './ProfileGUI';

// MOCK PROFILE DATA: BAADAYE ITABADILISHWA NA SUPABASE/AUTH HAPA TU
const profile = {
  displayName: 'Dee',
  username: 'deemwakolo',
  bio: 'Tanzanian music lover 🇹🇿',
  avatarUrl: '',
};

export default function Profile() {
  return <ProfileGUI profile={profile} />;
}
