'use client';

import React, { useState } from 'react';

import ProfileHeader from './ProfileHeader';
import FanMetrics from './FanMetrics';
import ProfileTabs from './ProfileTabs';
import ProfileActivity from './ProfileActivity';
import ProfileSongs from './ProfileSongs';
import ProfileArtists from './ProfileArtists';
import ProfileAccount from './ProfileAccount';

export interface ProfileData {
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string;
}

export type ProfileTab = 'activity' | 'songs' | 'artists';

interface ProfileGUIProps {
  profile: ProfileData;
}

// COMPOSITION LAYER: INAOWN TAB STATE, LAYOUT NA MPANGILIO TU
export default function ProfileGUI({
  profile,
}: ProfileGUIProps) {
  const [activeTab, setActiveTab] =
    useState<ProfileTab>('activity');

  return (
    <section className="w-full px-4 pb-24 pt-6 md:px-6 md:pt-8">
      <div className="mx-auto w-full max-w-2xl">
        {/* IDENTITY */}
        <ProfileHeader profile={profile} />

        {/* FAN METRICS */}
        <FanMetrics />

        {/* TABS */}
        <ProfileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* ACTIVE TAB CONTENT */}
        <div className="mt-4">
          {activeTab === 'activity' && <ProfileActivity />}
          {activeTab === 'songs' && <ProfileSongs />}
          {activeTab === 'artists' && <ProfileArtists />}
        </div>

        {/* ACCOUNT MANAGEMENT (NJE YA TABS) */}
        <ProfileAccount />
      </div>
    </section>
  );
}
