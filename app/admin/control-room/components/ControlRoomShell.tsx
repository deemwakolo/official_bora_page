'use client';

import React, { useState } from 'react';

import ControlRoomFrame from './ControlRoomFrame';
import ControlRoomNavbar, {
  type ControlRoomSection,
} from './ControlRoomNavbar';

import MomentChartsOP from './charts/MomentChartsOP';
import ControlRoomProfile from './ControlRoomProfile';

// COPY YA PublicShell — section ya UPDATES (news) imeondolewa,
// frontend header haiko, kila kitu kinaendeshwa na ControlRoomFrame.
interface ControlRoomShellProps {
  top10: React.ReactNode;
  trends: React.ReactNode;
}

export default function ControlRoomShell({
  top10,
  trends,
}: ControlRoomShellProps) {
  const [activeSection, setActiveSection] =
    useState<ControlRoomSection>('vote');

  const changeSection = (section: ControlRoomSection) => {
    setActiveSection(section);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'trending':
        return trends;

      case 'vote':
        return top10;

      case 'profile':
        return <ControlRoomProfile />;

      case 'charts':
        return <MomentChartsOP />;

      default:
        return top10;
    }
  };

  return (
    <>
      <ControlRoomFrame>
        <div
          key={activeSection}
          className="bora-section-transition"
        >
          {renderSection()}
        </div>
      </ControlRoomFrame>

      <ControlRoomNavbar
        activeSection={activeSection}
        onSectionChange={changeSection}
      />
    </>
  );
}
