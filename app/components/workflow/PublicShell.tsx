'use client';

import React, { useEffect, useMemo, useState } from 'react';

import BoraShell from './BoraShell';
import Navbar from './Navbar';
import {
  buildPublicSections,
  initialPublicSection,
  resolveActiveSection,
  visiblePublicSections,
  type Section,
} from './publicSections';
import type { ResolvedPublicNavigationItem } from './publicSectionIds';
import MomentGUI from './../charts/MomentGUI';
import Profile from './../profile/Profile';

/*
 * MASTHEAD BEHAVIOUR PER SECTION.
 *
 * This replaces two scattered `activeSection === '...'` comparisons
 * with one table, so hiding a section cannot leave orphaned
 * behaviour behind: an unreachable section simply contributes nothing.
 *
 * This is APPLICATION BEHAVIOUR, not visual configuration. It is
 * deliberately NOT exposed to the UI Room.
 */
const HEADER_RULES: Record<
  Section,
  { compact: boolean; lockAtFullRetraction: boolean }
> = {
  charts: { compact: false, lockAtFullRetraction: false },
  trending: { compact: false, lockAtFullRetraction: false },
  vote: { compact: false, lockAtFullRetraction: true },
  updates: { compact: false, lockAtFullRetraction: false },
  profile: { compact: true, lockAtFullRetraction: false },
};

interface PublicShellProps {
  top10: React.ReactNode;
  trends: React.ReactNode;
  news: React.ReactNode;
  /**
   * Structural navigation resolved on the SERVER from the committed UI
   * config (id / label / hidden). Serialisable plain data — the icons
   * and the prominent flag are added on this side.
   *
   * Optional: when absent, navigation is exactly the canonical set.
   */
  navigation?: readonly ResolvedPublicNavigationItem[];
}

export default function PublicShell({
  top10,
  trends,
  news,
  navigation,
}: PublicShellProps) {
  // Presentation metadata (icons, prominent) combined with the
  // server-resolved structure, then reduced to what is visible.
  const sections = useMemo(
    () => visiblePublicSections(buildPublicSections(navigation ?? [])),
    [navigation]
  );

  const [activeSection, setActiveSection] = useState<Section>(() =>
    initialPublicSection(sections)
  );

  // The active section must always be something the user can SEE.
  // Re-deriving navigation re-applies the same "first visible wins"
  // rule; there is no admin-selectable default.
  useEffect(() => {
    setActiveSection((current) =>
      resolveActiveSection(current, sections)
    );
  }, [sections]);

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

  const headerRules = HEADER_RULES[activeSection];

  return (
    <>
      <BoraShell
        forceCompactHeader={headerRules.compact}
        lockHeaderAtFullRetraction={
          headerRules.lockAtFullRetraction
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
        sections={sections}
        activeSection={activeSection}
        onSectionChange={changeSection}
      />
    </>
  );
}