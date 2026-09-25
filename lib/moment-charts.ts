import { createClient } from '@/lib/supabase/server';

import type {
  MomentChartData,
  MomentSong,
  MovementKind,
} from '@/app/components/charts/MomentChart';

// ============================================================
// MOMENT CHARTS — DATA LAYER (SUPABASE)
//
// Source: moment_chart_editions -> moment_chart_entries
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
export function formatReleaseDate(
  isoDate: string | null
): string {
  if (!isoDate) return '';

  const [year, month, day] = isoDate.split('-');
  const monthIndex = Number(month) - 1;
  const monthLabel = releaseMonths[monthIndex];

  if (!year || !monthLabel || !day) {
    return isoDate;
  }

  return `${day} ${monthLabel} ${year}`;
}

const monthMap: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

// UI (releaseDate) -> DB (YYYY-MM-DD)
// Supports: "12 Sep 2026" or "2026-09-12"
// Returns null if empty, or throws Error if invalid.
export function parseReleaseDateToISO(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === '-') return null;

  // Pattern 1: ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Pattern 2: DD Mon YYYY (e.g. 12 Sep 2026 or 1 Sep 2026)
  const parts = trimmed.split(/\s+/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const monthKey = parts[1].toLowerCase().slice(0, 3);
    const month = monthMap[monthKey];
    const year = parts[2];

    if (month && /^\d{4}$/.test(year) && /^\d{2}$/.test(day)) {
      const dayNum = Number(day);
      if (dayNum >= 1 && dayNum <= 31) {
        return `${year}-${month}-${day}`;
      }
    }
  }

  throw new Error(`Invalid release date format: "${trimmed}". Expected DD Mon YYYY (e.g. 12 Sep 2026) or YYYY-MM-DD.`);
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
