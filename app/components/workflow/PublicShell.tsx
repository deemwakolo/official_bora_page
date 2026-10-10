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
import { preloadMomentCharts } from './../charts/momentChartsCache';
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

/*
 * FEATURE SWITCH — ACTIVITY-AWARE COMPACT HEADER.
 *
 * When enabled, the active section's visible label is threaded into
 * the masthead so it can surface as a small caption once the header
 * has retracted. Set to false to restore the original masthead
 * exactly; the label then resolves to `undefined` and is never used.
 */
const ENABLE_CONTEXTUAL_HEADER = true;

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

  // Preload chart data on entry so Charts feels ready immediately,
  // regardless of which section is first selected. Deduped + cached,
  // so returning to Charts never re-fetches while data is fresh.
  useEffect(() => {
    preloadMomentCharts();
  }, []);

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

  // The visible label of the ACTIVE section, resolved from the same
  // visible set the navbar renders. Falls back to the raw id so the
  // value is never an empty string while the feature is enabled.
  const activeSectionLabel =
    sections.find((section) => section.id === activeSection)?.label ??
    activeSection;

  return (
    <>
      <BoraShell
        forceCompactHeader={headerRules.compact}
        lockHeaderAtFullRetraction={
          headerRules.lockAtFullRetraction
        }
        sectionLabel={
          ENABLE_CONTEXTUAL_HEADER
            ? activeSectionLabel
            : undefined
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