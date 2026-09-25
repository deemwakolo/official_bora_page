'use client';
import React from 'react';
import MomentChart, { MomentChartData } from './MomentChart';

interface MonthlyOPProps {
  data: MomentChartData;
}

export default function MonthlyOP({ data }: MonthlyOPProps) {
  return <MomentChart paneKey="monthly" data={data} />;
}