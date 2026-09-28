'use client';

import React, { useState } from 'react';

import type { BoraUINavigationConfig } from '../../components/workflow/publicSectionIds';

import ControlRoomFrame from '../control-room/components/ControlRoomFrame';

import { useUIDraftStore } from './lib/uiDraftStore';
import type { UIRoomArea } from './lib/uiTypes';

import UIInspector from './components/UIInspector';
import UIPreview from './components/UIPreview';
import UIRoomNav from './components/UIRoomNav';
import UISaveBar from './components/UISaveBar';

/*
 * BORA UI ROOM — ROOM CONTROLLER
 *
 * Structure mirrors the other rooms (Operations / Updates / Profile):
 * a controller owns state, presentation components stay dumb.
 *
 * The room is a live visual control room for the public frontend:
 * left = real BORA preview, right = inspector, bottom = save bar.
 */
interface UIRoomOPProps {
  /**
   * Navigation already COMMITTED, resolved on the server.
   *
   * This is the room's starting source, not a draft. It matters for
   * two reasons: the panel shows what is actually live, and a save of
   * any OTHER change carries this forward instead of silently erasing
   * the committed structural config.
   */
  committedNavigation?: BoraUINavigationConfig;
}

export default function UIRoomOP({
  committedNavigation,
}: UIRoomOPProps) {
  const store = useUIDraftStore(committedNavigation);

  const [area, setArea] =
    useState<UIRoomArea>('design-system');
  const [previewKey, setPreviewKey] = useState(0);

  return (
    <ControlRoomFrame>
      <div
        className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 md:px-6"
      >
        {/* ROOM HEADER */}
        <header className="flex flex-col gap-1">
          <p
            className="text-[7px] font-black uppercase tracking-[0.24em]"
            style={{ color: 'var(--bora-gold)' }}
          >
            BORA Admin
          </p>

          <h2
            className="font-cinzel text-lg font-black uppercase tracking-[0.14em]"
            style={{ color: 'var(--bora-text)' }}
          >
            UI Room
          </h2>

          <p
            className="text-[7px] uppercase tracking-[0.16em]"
            style={{ color: 'var(--bora-text-muted)' }}
          >
            Live presentation control · real BORA preview
          </p>
        </header>

        {/* AREAS */}
        <UIRoomNav
          activeArea={area}
          onAreaChange={setArea}
        />

        {/* WORKSPACE */}
        <div className="flex min-h-0 flex-col border md:flex-row">
          <UIPreview
            key={previewKey}
            store={store}
            onReload={() =>
              setPreviewKey((current) => current + 1)
            }
          />

          <UIInspector store={store} area={area} />
        </div>

        {/* COMMIT POINT */}
        <UISaveBar store={store} />
      </div>
    </ControlRoomFrame>
  );
}
