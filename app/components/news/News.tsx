import React from 'react';

import NewsGUI from './NewsGUI';
import {
  getNewsHub,
} from '@/lib/news-hub';
import {
  featuredNews,
  newsData,
} from './newsData';

// NEWS NDIO WIRING LAYER: data inatoka kwenye news_hub (Supabase).
// Ikiwa DB haina rows, tunarudi kwenye mock ili public UI isielewe.
export default async function News() {
  const hub = await getNewsHub();

  const hasDbNews =
    hub.featured.title.length > 0 || hub.feed.length > 0;

  return (
    <NewsGUI
      featured={hasDbNews ? hub.featured : featuredNews}
      feed={hasDbNews ? hub.feed : newsData}
    />
  );
}
