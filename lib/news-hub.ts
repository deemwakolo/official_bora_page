import { createClient } from '@/lib/supabase/server';

import type {
  FeaturedNewsItem,
  NewsItem,
} from '@/app/components/news/newsData';

// ============================================================
// NEWS HUB — READ LAYER (SUPABASE)
//
// Reads the EXISTING public.news_hub table and maps rows into
// the EXISTING NewsItem / FeaturedNewsItem contract so that
// News.tsx -> NewsGUI -> NewsFeed / FeaturedNews need no change.
//
// Mapping (see 0006_add_news_hub_columns.sql):
//   id          -> id
//   title       -> title
//   category    -> category
//   excerpt     -> excerpt
//   media_url   -> image
//   source      -> source
//   is_hot      -> isHot
//   published_at-> publishedAt  AND timestamp (derived here)
//   content     -> article body; NOT a NewsItem field
//
// timestamp is NOT stored. It is derived from published_at so
// there is one source of truth for publication time.
// ============================================================

const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

interface NewsHubRow {
  id: string;
  title: string | null;
  category: string | null;
  excerpt: string | null;
  content: string | null;
  media_url: string | null;
  source: string | null;
  is_hot: boolean;
  published_at: string | null;
  created_at: string | null;
}

// Deterministic, timezone-safe: reads the UTC parts of the ISO
// string directly instead of constructing a local Date.
function deriveTimestamp(iso: string | null): string {
  if (!iso) return '';

  const [datePart, timePart] = iso.split('T');
  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) return '';

  const monthLabel = MONTHS[Number(month) - 1];
  if (!monthLabel) return '';

  const hh = timePart ? timePart.slice(0, 5) : '00:00';
  return `${hh} / ${day} ${monthLabel}`;
}

function toNewsItem(row: NewsHubRow): NewsItem {
  const published = row.published_at ?? row.created_at;

  return {
    id: row.id,
    category: row.category ?? '',
    title: row.title ?? '',
    timestamp: deriveTimestamp(published),
    excerpt: row.excerpt ?? '',
    image: row.media_url ?? '',
    source: row.source ?? undefined,
    publishedAt: published ?? undefined,
    isHot: row.is_hot,
  };
}

const EMPTY_FEATURED: FeaturedNewsItem = {
  category: '',
  title: '',
  timestamp: '',
  excerpt: '',
  image: '',
};

/**
 * SOMA NEWS NYINGI KUTOKA news_hub
 *
 * Feature = most recent hot row (is_hot) if any, otherwise the
 * most recent row. Feed = everything else, newest first.
 * Rows without a title are not displayable and are skipped.
 */
export async function getNewsHub(): Promise<{
  featured: FeaturedNewsItem;
  featuredId: string;
  feed: NewsItem[];
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('news_hub')
      .select(
        'id, title, category, excerpt, content, media_url, source, is_hot, published_at, created_at'
      )
      .order('published_at', {
        ascending: false,
        nullsFirst: false,
      });

    if (error) {
      console.error(
        'News Hub Fetch Error:',
        error.message
      );
      return {
        featured: EMPTY_FEATURED,
        featuredId: '',
        feed: [],
      };
    }

    const rows = (data ?? []) as NewsHubRow[];
    const displayable = rows.filter(
      (row) => (row.title ?? '').trim().length > 0
    );

    if (displayable.length === 0) {
      return {
        featured: EMPTY_FEATURED,
        featuredId: '',
        feed: [],
      };
    }

    const hotIndex = displayable.findIndex(
      (row) => row.is_hot
    );

    const featuredRow =
      hotIndex >= 0
        ? displayable[hotIndex]
        : displayable[0];

    const feed = displayable
      .filter((row) => row.id !== featuredRow.id)
      .map(toNewsItem);

    const featuredItem = toNewsItem(featuredRow);
    const { id: _id, ...featured } = featuredItem;

    return {
      featured: featured as FeaturedNewsItem,
      featuredId: featuredRow.id,
      feed,
    };
  } catch (error: any) {
    console.error(
      'News Hub Fetch Exception:',
      error.message
    );
    return {
      featured: EMPTY_FEATURED,
      featuredId: '',
      feed: [],
    };
  }
}
