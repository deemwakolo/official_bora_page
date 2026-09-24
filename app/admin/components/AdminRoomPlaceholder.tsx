'use client';

import Link from 'next/link';

import { motion, useReducedMotion } from 'framer-motion';

import { ArrowLeft } from 'lucide-react';

import {
  findAdminRoom,
  type AdminRoom,
} from '../config/adminRooms';

import RoomSelectorBackground from '../room-selector/graphics/RoomSelectorBackground';

const BORA_EASE = [0.22, 1, 0.36, 1] as const;

interface AdminRoomPlaceholderProps {
  room: AdminRoom;
}

/*
 * BORA ROOM SHELL
 * Kila room ina boundary yake. Hapa ni shell pekee —
 * controls za room husika zitajengwa hatua kwa hatua.
 */
export default function AdminRoomPlaceholder({
  room,
}: AdminRoomPlaceholderProps) {
  const reduceMotion = useReducedMotion();

  const definition = findAdminRoom(room);

  if (!definition) return null;

  const Icon = definition.icon;

  return (
    <main
      className="relative min-h-screen w-full overflow-hidden"
      style={{
        backgroundColor: 'var(--bora-background)',
        color: 'var(--bora-text)',
      }}
    >
      <RoomSelectorBackground />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
        <motion.div
          className="flex w-full max-w-md flex-col items-center text-center"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reduceMotion ? 0 : 0.55,
            ease: BORA_EASE,
          }}
        >
          <Icon
            size={30}
            strokeWidth={1.25}
            className="text-[color:var(--bora-gold)]"
          />

          <h1 className="mt-5 font-cinzel text-2xl font-black uppercase tracking-[0.14em] text-[color:var(--bora-text)]">
            {definition.label}
          </h1>

          <p className="mt-3 text-[7px] font-bold uppercase tracking-[0.24em] text-[color:var(--bora-text-muted)]">
            {definition.description}
          </p>

          <p className="mt-8 text-[6px] font-black uppercase tracking-[0.3em] text-[color:var(--bora-text-subtle)]">
            Room shell // controls incoming
          </p>

          <Link
            href="/admin/room-selector"
            className="mt-10 flex items-center gap-2 font-cinzel text-[8px] font-black uppercase tracking-[0.24em] text-[color:var(--bora-text-muted)] transition-colors duration-300 hover:text-[color:var(--bora-gold)]"
          >
            <ArrowLeft size={12} />

            Room Selector
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
