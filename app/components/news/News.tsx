'use client';

import React from 'react';

import NewsGUI from './NewsGUI';
import {
  featuredNews,
  newsData,
} from './newsData';

export default function News() {
  // NEWS NDIO WIRING LAYER: INAPATA DATA KISHA INAPELEKA KWA GUI
  // BAADAYE HAPA NDIO ITAKAINGIA SUPABASE (getNews()) BILA KUGUSA GUI
  return (
    <NewsGUI
      featured={featuredNews}
      feed={newsData}
    />
  );
}