'use server';

import { getLatestMomentChart } from './moment-charts';

import type {
  MomentChartData,
} from '@/app/components/charts/MomentChart';

// ============================================================
// MOMENT CHARTS — SERVER ACTION
//
// Called by MomentGUI (client component) to load charts from
// Supabase on the SERVER side (getLatestMomentChart).
// No API route, no credentials reach the browser.
// ============================================================

export interface LatestMomentCharts {
  weekly: MomentChartData | null;
  monthly: MomentChartData | null;
}

export async function getLatestMomentCharts(): Promise<LatestMomentCharts> {
  const [weekly, monthly] = await Promise.all([
    getLatestMomentChart('weekly'),
    getLatestMomentChart('monthly'),
  ]);

  return { weekly, monthly };
}