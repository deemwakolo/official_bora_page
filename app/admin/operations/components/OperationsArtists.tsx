'use client';

import OperationsStatePanel from './OperationsStatePanel';

/*
 * BORA OPERATIONS ARTISTS WORKSPACE
 *
 * Artist schema haijathibitishwa kwenye repository hii, kwa hiyo
 * hatubuni table, records wala CRUD ya artist. Workspace, navigation
 * na hali zinaonekana wazi — na hali inasema ukweli.
 */
export default function OperationsArtists() {
  return (
    <div className="w-full">
      <div
        className="w-full border"
        style={{
          borderColor: 'var(--bora-border)',
          backgroundColor: 'var(--bora-surface)',
        }}
      >
        <div
          className="border-b px-4 py-3 sm:px-5"
          style={{ borderColor: 'var(--bora-border)' }}
        >
          <p
            className="text-[7px] font-black uppercase tracking-[0.2em]"
            style={{ color: 'var(--bora-text-muted)' }}
          >
            Operations Artists
          </p>

          <p
            className="mt-1 text-[6px] uppercase tracking-[0.14em]"
            style={{ color: 'var(--bora-text-subtle)' }}
          >
            Artist identity workspace
          </p>
        </div>
      </div>

      <div className="mt-3">
        <OperationsStatePanel
          title="Artist Workspace Not Connected"
          lines={[
            'Artist records are not part of the Operations data model yet.',
            'No artist is listed because no artist data source was verified.',
            'Nothing is created here until the artist model exists.',
          ]}
        />
      </div>
    </div>
  );
}
