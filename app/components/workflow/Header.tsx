'use client';

import { useHeaderOP } from './HeaderOP';
import HeaderGUI from './HeaderGUI';

interface HeaderProps {
  forceCompact?: boolean;
  lockHeaderAtFullRetraction?: boolean;
}

export default function Header({
  forceCompact = false,
  lockHeaderAtFullRetraction = false,
}: HeaderProps) {
  const {
    progress,
    menuOpen,
    openMenu,
    closeMenu,
  } = useHeaderOP(lockHeaderAtFullRetraction);

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
