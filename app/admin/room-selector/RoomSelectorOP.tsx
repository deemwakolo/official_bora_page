'use client';

import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import {
  findAdminRoom,
  type AdminRoom,
} from '../config/adminRooms';

import RoomSelectorGUI from './RoomSelectorGUI';

export type { AdminRoom };

/*
 * BORA ROOM SELECTOR CONTROLLER
 * Kazi yake ni MOJA: room → route.
 *
 * Authentication haipo hapa — iko kwenye /admin/login.
 * UI haijui Next.js routing — iko kwenye RoomSelectorGUI.
 */
export default function RoomSelectorOP() {
  const router = useRouter();

  const enterRoom = useCallback(
    (room: AdminRoom) => {
      const target = findAdminRoom(room);

      if (!target) return;

      router.push(target.route);
    },
    [router]
  );

  return <RoomSelectorGUI onSelectRoom={enterRoom} />;
}
