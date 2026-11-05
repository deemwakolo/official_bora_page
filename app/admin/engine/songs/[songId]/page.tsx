import { notFound, redirect } from 'next/navigation';
import EngineSongWorkspace from '../../EngineSongWorkspace';
import EngineRoomNavbar from '../../EngineRoomNavbar';
import {
  getEngineRoomCurrentHourInputs,
  getEngineRoomPlatformMappings,
  getEngineRoomSongEngineInputs,
  getEngineRoomSongList,
} from '@/lib/bora-engine/admin-room-read-model';
import { authorizeBoraAdministrator } from '@/lib/administrator-authorization';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EngineSongPage({
  params,
  searchParams,
}: {
  readonly params: { readonly songId: string };
  readonly searchParams?: { readonly category?: string };
}) {
  const authorization = await authorizeBoraAdministrator();
  if (authorization.status !== 'authorized') {
    redirect('/admin/engine');
  }

  const [songList, platformMappings, engineInputs, currentHourInputs] = await Promise.all([
    getEngineRoomSongList(),
    getEngineRoomPlatformMappings(),
    getEngineRoomSongEngineInputs(params.songId),
    getEngineRoomCurrentHourInputs(),
  ]);
  if (songList.status !== 'ready') {
    return (
      <main className="min-h-screen px-4 py-12" style={{ backgroundColor: 'var(--bora-background)', color: 'var(--bora-text)' }}>
        <p className="mx-auto max-w-xl border p-5 text-[8px]" style={{ borderColor: 'var(--bora-red)' }} role="alert">
          The song registry is unavailable. The workspace could not be loaded.
        </p>
      </main>
    );
  }

  const song = songList.songs.find((entry) => entry.id === params.songId);
  if (!song) notFound();
  const returnCategory = searchParams?.category === 'premium' ? 'premium' : 'songs';

  return (
    <>
      <EngineSongWorkspace
        song={song}
        platformMappings={platformMappings}
        engineInputs={engineInputs}
        currentHourInputs={currentHourInputs}
        returnCategory={returnCategory}
      />
      <EngineRoomNavbar
        activeSection={returnCategory}
        canOpenOperations={false}
      />
    </>
  );
}
