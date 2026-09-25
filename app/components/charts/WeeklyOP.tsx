'use client';
import React from 'react';
import MomentChart, { MomentChartData } from './MomentChart';

interface WeeklyOPProps {
  data: MomentChartData;
}

export default function WeeklyOP({ data }: WeeklyOPProps) {
  return <MomentChart paneKey="weekly" data={data} />;
}