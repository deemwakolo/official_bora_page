import 'server-only';

import { evaluateChart } from '../../engine/src/engine/evaluation/chart';
import { buildEngineInputFromBackendRows } from './adapter';
import { toEngineInput } from './bridge';
import { createBoraEnginePersistenceFromEnv } from './persistence';

export type LiveVoteEngineEvaluation =
  | {
      readonly status: 'ready';
      readonly referenceHour: number;
      readonly acceptedVoteCount: number;
      readonly songsWithVotes: number;
      readonly songs: readonly {
        readonly songId: string;
        readonly xp: number;
        readonly hasAcceptedVotes: boolean;
      }[];
    }
  | {
      readonly status: 'not-ready';
      readonly reason: string;
    }
  | {
      readonly status: 'unavailable';
      readonly reason: 'configuration-unavailable' | 'input-unavailable';
    };

export async function getLiveVoteEngineEvaluation(): Promise<LiveVoteEngineEvaluation> {
  const setup = createBoraEnginePersistenceFromEnv();
  if (setup.status !== 'available') {
    return { status: 'unavailable', reason: 'configuration-unavailable' };
  }

  let source;
  try {
    source = await setup.persistence.loadLiveVoteEngineInputSnapshot();
  } catch (error) {
    console.error(
      '[bora-engine-live-vote-evaluation] input read failed:',
      error instanceof Error ? error.message : 'unknown error',
    );
    return { status: 'unavailable', reason: 'input-unavailable' };
  }

  if (source.status === 'unavailable') {
    console.error(
      '[bora-engine-live-vote-evaluation] input read unavailable:',
      source.reason,
      source.errorCode ?? '',
    );
    return { status: 'unavailable', reason: 'input-unavailable' };
  }

  const voteCountsBySong = new Map<string, number>();
  const songIds = new Set(source.songs.map((song) => song.songId));
  const bucketsBySong = new Map<
    string,
    Map<number, { upvotes: number; downvotes: number }>
  >();

  for (const vote of source.votes) {
    if (!songIds.has(vote.songId)) {
      console.error(
        '[bora-engine-live-vote-evaluation] accepted vote references an unknown Engine song.',
        vote.songId,
      );
      return { status: 'not-ready', reason: 'vote-song-not-in-engine-state' };
    }

    let songBuckets = bucketsBySong.get(vote.songId);
    if (!songBuckets) {
      songBuckets = new Map();
      bucketsBySong.set(vote.songId, songBuckets);
    }
    let bucket = songBuckets.get(vote.hourIndex);
    if (!bucket) {
      bucket = { upvotes: 0, downvotes: 0 };
      songBuckets.set(vote.hourIndex, bucket);
    }
    if (vote.voteType === 'up') {
      bucket.upvotes += 1;
    } else {
      bucket.downvotes += 1;
    }
    voteCountsBySong.set(
      vote.songId,
      (voteCountsBySong.get(vote.songId) ?? 0) + 1,
    );
  }

  const voteOnlyRows = source.songs.map((song) => ({
    id: song.songId,
    lifecycle: song.lifecycle,
    k: 0,
    persistent_kura: 0,
    buckets: [...(bucketsBySong.get(song.songId) ?? new Map()).entries()].map(
      ([hourIndex, counts]) => ({
        hourIndex,
        ...counts,
        phase: hourIndex === source.referenceHour ? 'OPEN' : 'CLOSED',
        version: 1,
      }),
    ),
    seedHours: [],
    platform: { youtube: [], spotify: [], boomplay: [] },
  }));

  const built = buildEngineInputFromBackendRows(
    voteOnlyRows,
    source.referenceHour,
    { closedHourC: null },
  );
  if (built.status !== 'ready') {
    console.error(
      '[bora-engine-live-vote-evaluation] vote-only Engine input is invalid:',
      built.gaps.map((gap) => gap.reason).join('; '),
    );
    return { status: 'not-ready', reason: 'invalid-live-vote-input' };
  }

  let evaluated: ReturnType<typeof evaluateChart>;
  try {
    evaluated = evaluateChart(toEngineInput(built.value));
  } catch (error) {
    console.error(
      '[bora-engine-live-vote-evaluation] Engine evaluation threw:',
      error instanceof Error ? error.message : 'unknown error',
    );
    return { status: 'not-ready', reason: 'engine-evaluation-failed' };
  }
  if (!evaluated.ok) {
    console.error(
      '[bora-engine-live-vote-evaluation] Engine rejected vote-only input:',
      evaluated.error.code,
      evaluated.error.message,
    );
    return { status: 'not-ready', reason: 'engine-evaluation-failed' };
  }

  const songs = evaluated.value.active.map((song) => ({
    songId: song.songId,
    xp: song.xp,
    hasAcceptedVotes: (voteCountsBySong.get(song.songId) ?? 0) > 0,
  }));
  return {
    status: 'ready',
    referenceHour: source.referenceHour,
    acceptedVoteCount: source.votes.length,
    songsWithVotes: songs.filter((song) => song.hasAcceptedVotes).length,
    songs,
  };
}
