
import ChartWrapper from './components/ChartWrapper';

import TrendsGUI from './components/trends/TrendsGUI';

import News from './components/news/News';

import Footer from './components/workflow/Footer';

import PublicShell from './components/workflow/PublicShell';


import { getRegistry } from '../lib/admin-actions';

import { getCurrentBoraEnginePublication } from '../lib/bora-engine/publication-reader';
import { getLiveVoteEngineEvaluation } from '../lib/bora-engine/live-vote-evaluation';

import { getTrending } from '../lib/trending';
import { getLatestMomentCharts } from '../lib/moment-charts-actions';
import type { SongMetadata } from './components/charts/TapOP';

import { resolveBoraUIConfig } from '../lib/ui-config';

import { resolvePublicNavigation } from './components/workflow/publicSectionIds';

// NEXT.JS ISI-RENDER UPYA PAGE KWA CACHE

export const dynamic = 'force-dynamic';

export const revalidate = 0;

/*
 * PUBLIC NAVIGATION — SERVER-SIDE RESOLUTION
 *
 *   bora-ui.config.json  +  public.ui_room_config
 *            ↓
 *   resolveBoraUIConfig()        (existing fail-safe resolver)
 *            ↓
 *   resolvePublicNavigation()     (structural: id / label / hidden)
 *
 * Only the SERVER-SAFE module is imported here. The lucide-bearing
 * publicSections.ts stays on the client side, so no icon ever reaches
 * the server bundle.
 *
 * This never fails the page: a missing, invalid or unreachable config
 * resolves to the canonical navigation.
 */
async function resolveNavigation() {
  try {
    const config = await resolveBoraUIConfig();

    return resolvePublicNavigation(config.navigation);
  } catch (error) {
    console.error(
      '[navigation] structural config unavailable, using canonical:',
      error instanceof Error ? error.message : error
    );

    return resolvePublicNavigation(null);
  }
}

// PAGE KUU YA BORA

export default async function Home() {

  // CHUKUA DATA YA NYIMBO KUTOKA KWENYE REGISTRY

  const [
    registryData,
    enginePublication,
    liveVoteEvaluation,
    momentCharts,
  ] = await Promise.all([
    getRegistry(),
    getCurrentBoraEnginePublication(),
    getLiveVoteEngineEvaluation(),
    getLatestMomentCharts(),
  ]);

  const registrySongsById = new Map<string, { upvotes?: unknown }>(
    (registryData ?? []).map((song: { id: string; upvotes?: unknown }) => [
      song.id,
      song,
    ]),
  );
  const momentMetadataBySongId = new Map<string, SongMetadata>();
  for (const song of [
    ...(momentCharts.monthly?.songs ?? []),
    ...(momentCharts.weekly?.songs ?? []),
  ]) {
    if (song.songId) momentMetadataBySongId.set(song.songId, song.metadata);
  }

  const readTotalUpvotes = (value: unknown): number | null => {
    const count =
      typeof value === 'number'
        ? value
        : typeof value === 'string' && value.trim()
          ? Number(value)
          : NaN;
    return Number.isSafeInteger(count) && count >= 0 ? count : null;
  };
  const totalRecordedUpvotes = (registryData ?? []).reduce(
    (total: number, song: { upvotes?: unknown }) =>
      total + (readTotalUpvotes(song.upvotes) ?? 0),
    0,
  );

  const buildSongMetadata = (
    songId: string,
    title: string,
    artist: string,
    artwork: string,
  ): SongMetadata => {
    const momentMetadata = momentMetadataBySongId.get(songId);
    const [titleFromRegistry, ...artistFromTitle] = title.split(' - ');
    return {
      title: momentMetadata?.title || titleFromRegistry || title,
      artist:
        momentMetadata?.artist ||
        (artistFromTitle.length > 0
          ? artistFromTitle.join(' - ')
          : artist),
      feature: momentMetadata?.feature || '-',
      producer: momentMetadata?.producer || '-',
      releaseDate: momentMetadata?.releaseDate || '',
      genre: momentMetadata?.genre || '',
      artwork: artwork || momentMetadata?.artwork || '',
      youtube: momentMetadata?.youtube || '',
      spotify: momentMetadata?.spotify || '',
      boomplay: momentMetadata?.boomplay || '',
    };
  };

  // Keep real registry songs visible until an Engine publication exists.

  const registryRankedSongs = (registryData || [])
    .map((item: any) => ({
      ...item,
      rank: item.slot_number ?? 0,
      xp: undefined,
      upvotes: readTotalUpvotes(item.upvotes),
      voteShare:
        totalRecordedUpvotes > 0
          ? (readTotalUpvotes(item.upvotes) ?? 0) / totalRecordedUpvotes
          : null,
      metadata: buildSongMetadata(
        String(item.id),
        item.title ?? '',
        item.artist ?? '',
        item.cover_url ?? '',
      ),
    }))
    .sort(
      (a, b) =>
        (b.upvotes ?? 0) - (a.upvotes ?? 0) ||
        Number(a.rank) - Number(b.rank),
    )
    .slice(0, 15);

  const engineRankedSongs =
    enginePublication.status === 'published'
      ? enginePublication.publication.entries
          .reduce<
            {
              id: string;
              engineRank: number;
              title: string;
              artist: string;
              cover_url: string;
              youtube_id: string | undefined;
              xp: number;
              upvotes: number | null;
              voteShare: number | null;
              metadata: SongMetadata;
            }[]
          >((songs, entry) => {
            if (
              entry.lifecycle === 'ACTIVE' &&
              entry.rank !== null &&
              entry.xp !== null
            ) {
              songs.push({
                id: entry.songId,
                engineRank: entry.rank,
                title: entry.title,
                artist: entry.artist,
                cover_url: entry.coverUrl,
                youtube_id: entry.youtubeId ?? undefined,
                xp: entry.xp,
                upvotes: readTotalUpvotes(
                  registrySongsById.get(entry.songId)?.upvotes,
                ),
                voteShare: null,
                metadata: buildSongMetadata(
                  entry.songId,
                  entry.title,
                  entry.artist,
                  entry.coverUrl,
                ),
              });
            }
            return songs;
          }, [])
          .sort(
            (left, right) =>
              right.xp - left.xp ||
              left.engineRank - right.engineRank ||
              left.id.localeCompare(right.id),
          )
          .map(({ engineRank: _engineRank, ...song }, index) => ({
            ...song,
            slot_number: index + 1,
          }))
      : null;
  const liveVoteSongsById = new Map(
    liveVoteEvaluation.status === 'ready'
      ? liveVoteEvaluation.songs.map((song) => [song.songId, song])
      : [],
  );
  const liveVoteRankedSongs =
    liveVoteEvaluation.status === 'ready'
      ? (registryData ?? [])
          .map((item: any) => {
            const songId = String(item.id);
            const liveVoteSong = liveVoteSongsById.get(songId);
            return {
              ...item,
              xp:
                liveVoteSong?.hasAcceptedVotes === true
                  ? liveVoteSong.xp
                  : null,
              upvotes: readTotalUpvotes(item.upvotes),
              voteShare: null,
              metadata: buildSongMetadata(
                songId,
                item.title ?? '',
                item.artist ?? '',
                item.cover_url ?? '',
              ),
            };
          })
          .sort(
            (
              left: { xp: number | null; slot_number?: number },
              right: { xp: number | null; slot_number?: number },
            ) =>
              (right.xp ?? -1) - (left.xp ?? -1) ||
              Number(left.slot_number ?? 0) -
                Number(right.slot_number ?? 0),
          )
          .slice(0, 15)
      : null;
  const hasRealEnginePublication =
    enginePublication.status === 'published' &&
    !enginePublication.publication.isSyntheticDemo;
  const rankedSongs = hasRealEnginePublication
    ? engineRankedSongs ?? registryRankedSongs
    : liveVoteRankedSongs ?? registryRankedSongs;
  const liveVoteChartNotice =
    !hasRealEnginePublication && liveVoteEvaluation.status === 'ready'
      ? `Provisional live Engine XP from ${liveVoteEvaluation.acceptedVoteCount} captured accepted votes across ${liveVoteEvaluation.songsWithVotes} songs in the current 72-hour window. Ordered by XP, not final BORA rank. Synthetic seeds and platform ranks are excluded; unobserved activity is not inferred.`
      : undefined;

  if (
    liveVoteEvaluation.status === 'unavailable' ||
    liveVoteEvaluation.status === 'not-ready'
  ) {
    console.error(
      '[bora-engine-live-vote-evaluation] chart fallback unavailable:',
      liveVoteEvaluation.reason,
    );
  }

  if (enginePublication.status === 'unavailable') {
    console.error(
      '[bora-engine-publication] chart reader unavailable:',
      enginePublication.reason,
    );
  }

  // LOG YA KUJUA ENGINE IMEPOKEA ENTRIES NGAPI

  const trending = await getTrending();

  // STRUCTURAL NAVIGATION — resolved before render so the navbar order,
  // labels and visibility are correct on the very first paint.
  const navigation = await resolveNavigation();

  const toSongRows = (rows: typeof trending.youtube) =>
    rows.map((row) => ({
      rank: row.rank,
      title: row.title,
      artist: row.artist,
      movement: row.movement,
    }));

  const artistRows = trending.artist.map((row) => ({
    rank: row.rank,
    artist: row.artist,
    songs: row.songs_count ?? 0,
    movement: row.movement,
  }));

  return (
    <main
      className="relative flex min-h-screen flex-col overflow-x-hidden antialiased"
      style={{
        backgroundColor: 'var(--bora-background)',
        color: 'var(--bora-text)',
      }}
    >

      {/* BACKGROUND GLOWS ZA BORA */}

      <div className="pointer-events-none fixed inset-0 z-0">

        {/* GOLD GLOW YA JUU */}

        <div
          className="absolute left-1/2 top-[-15%] h-[700px] w-[1000px] -translate-x-1/2 rounded-full blur-[140px]"
          style={{
            backgroundColor: 'var(--bora-gold-glow)',
          }}
        />

        {/* RED GLOW YA CHINI */}

        <div
          className="absolute bottom-[-10%] right-[-5%] h-[600px] w-[600px] rounded-full blur-[120px]"
          style={{
            backgroundColor: 'var(--bora-red-glow)',
          }}
        />

      </div>

      {/* CONTENT YOTE INAKAA JUU YA BACKGROUND */}

      <div className="relative z-10 flex-1">

        {/* BORASHELL INASIMAMIA TICKER, HEADER, NAV NA CONTENT */}

        <PublicShell
          navigation={navigation}
          top10={
            <section className="w-full pt-8 md:pt-12">
              {!hasRealEnginePublication && (
                <p
                  role="status"
                  className="mx-auto mb-4 max-w-3xl px-4 text-center text-[9px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--bora-text-muted)' }}
                >
                  Live vote baseline · ordered by recorded up-votes · vote
                  share is each song&apos;s portion of all recorded up-votes
                </p>
              )}
              <ChartWrapper
                songs={rankedSongs}
                isSyntheticDemo={false}
                dataNotice={liveVoteChartNotice}
              />
            </section>
          }
          trends={
            <TrendsGUI
              youtubeSongs={toSongRows(
                trending.youtube
              )}
              spotifySongs={toSongRows(
                trending.spotify
              )}
              artistTrends={artistRows}
            />
          }
          news={<News />}
        />


      </div>

      {/* FOOTER YA BORA */}

      {/* <Footer /> */}

    </main>
  );
}