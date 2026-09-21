'use client';

import { useHeaderOP } from './HeaderOP';
import HeaderGUI from './HeaderGUI';

export default function Header() {
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
    />
  );
}
