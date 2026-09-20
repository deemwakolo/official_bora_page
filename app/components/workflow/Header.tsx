'use client';

import { useHeaderOP } from './HeaderOP';
import HeaderGUI from './HeaderGUI';

export default function Header() {
  const {
    retracted,
    menuOpen,
    openMenu,
    closeMenu,
  } = useHeaderOP();

  return (
    <HeaderGUI
      retracted={retracted}
      menuOpen={menuOpen}
      onOpenMenu={openMenu}
      onCloseMenu={closeMenu}
    />
  );
}
