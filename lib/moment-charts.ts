import { createClient } from '@/lib/supabase/server';

import type {
  MomentChartData,
  MomentSong,
  MovementKind,
} from '@/app/components/charts/MomentChart';

// ============================================================
// MOMENT CHARTS — READ-ONLY DATA LAYER (SUPABASE)
//
// Source: moment_chart_editions -> moment_chart_entries
// Hii hapa haitoi kwa screenshot — inasoma DB moja kwa moja.
// HAKUNA writes, HAKUNA admin, HAKUNA caching hapa.
//
// Matokeo yanafuata mtindo wa `lib/admin-actions.ts`
// (getRegistry): try/catch + console.error + safe null result.
// ============================================================

export type MomentChartPeriod = 'weekly' | 'monthly';

// ROW TYPES (zinafuata schema ya 0002_create_moment_charts.sql)
export interface MomentChartEntryRow {
  id: string;
  song_id: string | null;
  rank: number;
  movement_kind: MovementKind;
  movement_delta: number | null;
  title_snapshot: string;
  artist_snapshot: string;
  feature_snapshot: string | null;
  producer_snapshot: string | null;
  release_date_snapshot: string | null;
  genre_snapshot: string | null;
  artwork_snapshot: string | null;
  youtube_url_snapshot: string | null;
  spotify_url_snapshot: string | null;
  boomplay_url_snapshot: string | null;
}

export interface MomentChartEditionRow {
  id: string;
  period: MomentChartPeriod;
  chart_date: string;
  display_label: string;
  moment_chart_entries:
    | MomentChartEntryRow[]
    | null;
}

const periodLabels: Record<MomentChartPeriod, string> = {
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
};

const releaseMonths = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

// DB: release_date_snapshot = 'YYYY-MM-DD'
// UI (MomentOP): releaseDate = '12 Sep 2026'
// Tunatumia string parsing (si Date) ili kuepuka timezone shifts.
function formatReleaseDate(
  isoDate: string | null
): string {
  if (!isoDate) return '';

  const [year, month, day] = isoDate.split('-');
  const monthLabel =
    releaseMonths[Number(month) - 1];

  if (!year || !monthLabel || !day) {
    return isoDate;
  }

  return `${day} ${monthLabel} ${year}`;
}

// DB ROW -> MomentSong (UI shape)
export function toMomentSong(
  row: MomentChartEntryRow
): MomentSong {
  return {
    rank: row.rank,

    movement:
      row.movement_delta === null ||
      row.movement_delta === undefined
        ? { kind: row.movement_kind }
        : {
            kind: row.movement_kind,
            delta: row.movement_delta,
          },

    metadata: {
      title: row.title_snapshot,
      artist: row.artist_snapshot,
      feature: row.feature_snapshot ?? '-',
      producer: row.producer_snapshot ?? '-',
      releaseDate: formatReleaseDate(
        row.release_date_snapshot
      ),
      genre: row.genre_snapshot ?? '',
      artwork: row.artwork_snapshot ?? '',
      youtube: row.youtube_url_snapshot ?? '',
      spotify: row.spotify_url_snapshot ?? '',
      boomplay: row.boomplay_url_snapshot ?? '',
    },
  };
}

/**
 * CHUKUA LATEST EDITION KWA PERIOD
 * ('weekly' au 'monthly')
 *
 * Kurudi: MomentChartData (imepangwa rank 1->10)
 * au NULL kama hakuna edition / kuna Supabase error.
 */
export async function getLatestMomentChart(
  period: MomentChartPeriod
): Promise<MomentChartData | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('moment_chart_editions')
      .select(
        'id, period, chart_date, display_label, moment_chart_entries(id, song_id, rank, movement_kind, movement_delta, title_snapshot, artist_snapshot, feature_snapshot, producer_snapshot, release_date_snapshot, genre_snapshot, artwork_snapshot, youtube_url_snapshot, spotify_url_snapshot, boomplay_url_snapshot)'
      )
      .eq('period', period)
      .order('chart_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        'Supabase Error:',
        error.message
      );
      return null;
    }

    // HAKUNA EDITION — result safi, HAKUNA throw.
    if (!data) return null;

    const edition =
      data as MomentChartEditionRow;

    const entries = [
      ...(edition.moment_chart_entries ?? []),
    ].sort((a, b) => a.rank - b.rank);

    return {
      title: 'TOP 10 SONGS',
      periodLabel: periodLabels[period],
      date: edition.display_label,
      songs: entries.map(toMomentSong),
    };
  } catch (error: any) {
    console.error(
      'Moment Chart Fetch Error:',
      error.message
    );
    return null;
  }
}