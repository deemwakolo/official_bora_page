'use client';

import { useHeaderOP } from './HeaderOP';
import HeaderGUI from './HeaderGUI';

interface HeaderProps {
  forceCompact?: boolean;
}

export default function Header({
  forceCompact = false,
}: HeaderProps) {
  const {
    progress,
    menuOpen,
    openMenu,
    closeMenu,
  } = useHeaderOP();

  return (
    <HeaderGUI
      progress={progress}
      menuOpen={menuOpen}
      onOpenMenu={openMenu}
      onCloseMenu={closeMenu}
      forceCompact={forceCompact}
    />
  );
}
