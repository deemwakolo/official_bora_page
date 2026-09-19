'use client';

import React, { useState } from 'react';

import BoraShell from './BoraShell';
import Navbar, { Section } from './Navbar';
import ChartsGUI from './../charts/ChartsGUI';

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
    useState<Section>('charts');

  const renderSection = () => {
    switch (activeSection) {
      case 'trending':
        return trends;

      case 'vote':
        return top10;

      case 'updates':
        return news;

      case 'profile':
        return (
          <section className="flex min-h-[70vh] items-center justify-center px-6">
            <div className="text-center">
              <div className="mb-4 text-4xl opacity-50">
                ◎
              </div>

              <h2 className="font-cinzel text-2xl font-bold">
                PROFILE
              </h2>

              <p
                className="mt-3 text-sm"
                style={{
                  color: 'var(--bora-text-muted)',
                }}
              >
                Profile features are coming later.
              </p>
            </div>
          </section>
        );

      case 'charts':
        return <ChartsGUI />;

      default:
        return top10;
    }
  };

  return (
    <>
      <BoraShell>
        {renderSection()}
      </BoraShell>

      <Navbar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
    </>
  );
}