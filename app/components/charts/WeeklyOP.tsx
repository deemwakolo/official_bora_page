'use client';
import React from 'react';
import MomentChart from './MomentChart';
import { weeklyMomentData } from './MomentOP';
export default function WeeklyOP() {
  return <MomentChart paneKey="weekly" data={{ title: 'TOP 10 SONGS', periodLabel: weeklyMomentData.periodLabel, date: weeklyMomentData.date, songs: weeklyMomentData.songs }} />;
}
