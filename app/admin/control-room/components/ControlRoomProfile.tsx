'use client';

import React, { useState } from 'react';

import ProfileHeader from '../../../components/profile/ProfileHeader';
import FanMetrics from '../../../components/profile/FanMetrics';
import ProfileTabs from '../../../components/profile/ProfileTabs';
import ProfileActivity from '../../../components/profile/ProfileActivity';
import ProfileSongs from '../../../components/profile/ProfileSongs';
import ProfileArtists from '../../../components/profile/ProfileArtists';
import ProfileAccount from '../../../components/profile/ProfileAccount';

import type {
  ProfileData,
  ProfileTab,
} from '../../../components/profile/ProfileGUI';

/*
 * BORA CONTROL ROOM PROFILE
 * Copy ya Profile.tsx + ProfileGUI ya frontend — ila CURTAIN
 * (ProfileCurtain: frosted glass + FAQ button) HAIONYESHIWI hapa.
 * Frontend asilia haikugusiwi; sub-components zinashirikiwa moja kwa moja.
 */
const profile: ProfileData = {
  displayName: 'Dee',
  username: 'deemwakolo',
  bio: 'Tanzanian music lover 🇹🇿',
  avatarUrl: '',
};

export default function ControlRoomProfile() {
  const [activeTab, setActiveTab] =
    useState<ProfileTab>('activity');

  return (
    <div className="relative">
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
            {activeTab === 'activity' && (
              <ProfileActivity />
            )}
            {activeTab === 'songs' && <ProfileSongs />}
            {activeTab === 'artists' && (
              <ProfileArtists />
            )}
          </div>

          {/* ACCOUNT MANAGEMENT (NJE YA TABS) */}
          <ProfileAccount />
        </div>
      </section>

      {/* CURTAIN: HAIONYESHIWI KWA CONTROL ROOM */}
    </div>
  );
}
