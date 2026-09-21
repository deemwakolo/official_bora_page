'use client';

import { useEffect } from 'react';
import { useHeaderOP } from './HeaderOP';
import HeaderGUI from './HeaderGUI';

export default function Header() {
  console.log('[BORA HEADER] COMPONENT RENDERED');

  const {
    retracted,
    menuOpen,
    openMenu,
    closeMenu,
  } = useHeaderOP();

  useEffect(() => {
    console.log('[BORA HEADER] MOUNTED');
  }, []);

  useEffect(() => {
    console.log('[BORA HEADER] RETRACTED =', retracted);
  }, [retracted]);

  return (
    <HeaderGUI
      retracted={retracted}
      menuOpen={menuOpen}
      onOpenMenu={openMenu}
      onCloseMenu={closeMenu}
    />
  );
}