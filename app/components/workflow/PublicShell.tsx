'use client';

import React, { useState } from 'react';

import BoraShell from './BoraShell';
import Navbar, { Section } from './Navbar';
import MomentGUI from './../charts/MomentGUI';
import Profile from './../profile/Profile';

interface PublicShellProps {
  top10: React.ReactNode;
  trends: React.ReactNode;
  news: React.ReactNode;
}

export default function PublicShell({
  top10,
  trends,
  news,
}: PublicShellProps) {
  const [activeSection, setActiveSection] =
    useState<Section>('vote');

  const changeSection = (section: Section) => {
    setActiveSection(section);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'trending':
        return trends;

      case 'vote':
        return top10;

      case 'updates':
        return news;

      case 'profile':
        return <Profile />;

      case 'charts':
        return <MomentGUI />;

      default:
        return top10;
    }
  };

  return (
    <>
      <BoraShell
        forceCompactHeader={activeSection === 'profile'}
        lockHeaderAtFullRetraction={
          activeSection === 'vote'
        }
      >
        <div
          key={activeSection}
          className="bora-section-transition"
        >
          {renderSection()}
        </div>
      </BoraShell>

      <Navbar
        activeSection={activeSection}
        onSectionChange={changeSection}
      />
    </>
  );
}