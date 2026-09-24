'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { motion, useReducedMotion } from 'framer-motion';

import AdminLoginToggle from '../login/components/AdminLoginToggle';

import { ADMIN_ROOMS, type AdminRoom } from '../config/adminRooms';

import RoomOption from './components/RoomOption';
import RoomSelectorBackground from './graphics/RoomSelectorBackground';

// MUDA WA TRANSITION KABLA YA ROUTE: mlango unafunguka, kisha unaingia.
const ENTER_ROOM_DELAY = 340;

const BORA_EASE = [0.22, 1, 0.36, 1] as const;

interface RoomSelectorGUIProps {
  onSelectRoom: (room: AdminRoom) => void;
}

/*
 * BORA ROOM SELECTOR COMPOSITION LAYER
 * Z-0 Tinga, Z-1 atmosphere, Z-2 central light,
 * Z-10 rooms, Z-20 GUI toggle.
 *
 * GUI HAIJUI NEXT.JS ROUTING — inatoa room id pekee.
 */
export default function RoomSelectorGUI({
  onSelectRoom,
}: RoomSelectorGUIProps) {
  const reduceMotion = useReducedMotion();

  const [hoveredRoom, setHoveredRoom] =
    useState<AdminRoom | null>(null);

  const [selectedRoom, setSelectedRoom] =
    useState<AdminRoom | null>(null);

  const timerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  // CLEANUP: hakuna timer inayobaki baada ya unmount.
  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    []
  );

  const handleSelect = useCallback(
    (room: AdminRoom) => {
      // DOUBLE CLICK = ROUTE MOJA PEKEE.
      if (selectedRoom) return;

      setSelectedRoom(room);

      timerRef.current = setTimeout(
        () => onSelectRoom(room),
        reduceMotion ? 0 : ENTER_ROOM_DELAY
      );
    },
    [onSelectRoom, reduceMotion, selectedRoom]
  );

  // ROOM MOJA INAANGALIA — NYINGINE ZINAPUNGUZA MWANGA.
  const isDimmed = (room: AdminRoom) => {
    if (selectedRoom) return selectedRoom !== room;
    if (hoveredRoom) return hoveredRoom !== room;
    return false;
  };

  return (
    <main
      className="relative min-h-screen w-full overflow-hidden"
      style={{
        backgroundColor: 'var(--bora-background)',
        color: 'var(--bora-text)',
      }}
    >
      {/* BACKGROUND LAYER (Z-0 / Z-1 / Z-2) */}
      <RoomSelectorBackground />

      {/* ROOM LAYER (Z-10) */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-md flex-col items-center">
          <motion.header
            className="mb-12 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.6,
              ease: BORA_EASE,
            }}
          >
            <p className="font-cinzel text-[9px] font-black uppercase tracking-[0.4em] text-[color:var(--bora-gold)]">
              BORA ADMIN
            </p>

            <h1 className="mt-3 font-cinzel text-2xl font-black uppercase tracking-[0.12em] text-[color:var(--bora-text)]">
              Choose Room
            </h1>

            <p className="mt-3 text-[7px] font-bold uppercase tracking-[0.24em] text-[color:var(--bora-text-muted)]">
              Select an operating environment
            </p>
          </motion.header>

          <nav
            aria-label="BORA admin rooms"
            className="flex w-full flex-col items-center"
          >
            {ADMIN_ROOMS.map((room, index) => (
              <RoomOption
                key={room.id}
                label={room.label}
                description={room.description}
                icon={room.icon}
                index={index}
                dimmed={isDimmed(room.id)}
                selected={selectedRoom === room.id}
                onClick={() => handleSelect(room.id)}
                onHoverStart={() => setHoveredRoom(room.id)}
                onHoverEnd={() => setHoveredRoom(null)}
              />
            ))}
          </nav>

          <motion.footer
            className="mt-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              delay: reduceMotion ? 0 : 0.55,
              duration: reduceMotion ? 0 : 0.7,
              ease: BORA_EASE,
            }}
          >
            <p className="text-[6px] uppercase tracking-[0.2em] text-[color:var(--bora-text-subtle)]">
              BORA // MATITU NATION
            </p>
          </motion.footer>
        </div>
      </div>

      {/* GUI LAYER (Z-20): theme + sound + haptics */}
      <AdminLoginToggle />
    </main>
  );
}
