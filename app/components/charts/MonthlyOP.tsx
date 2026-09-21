'use client';
import React from 'react';
import MomentChart from './MomentChart';
import { monthlyMomentData } from './MomentOP';
export default function MonthlyOP() {
  return <MomentChart paneKey="monthly" data={{ title: 'TOP 10 SONGS', periodLabel: monthlyMomentData.periodLabel, date: monthlyMomentData.date, songs: monthlyMomentData.songs }} />;
}
