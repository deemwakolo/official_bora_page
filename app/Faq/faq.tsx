'use client';

import React from 'react';
import FAQGUI from './GUI/FAQGUI';
import { getPublishedFaqs } from './faqData';

interface CreditItem {
  role: string;
  name: string;
}

// CREDITS NI STATIC CONFIG: ZINABAKI HAPA, SI KWENYE FAQ TABLE
const credits: CreditItem[] = [
  {
    role: 'Executive Architect',
    name: 'Dee',
  },
  {
    role: 'Production Node',
    name: 'Matitu Audio Lab',
  },
  {
    role: 'Systems Logic',
    name: 'Bora Intel',
  },
  {
    role: 'Location',
    name: 'Dar es Salaam, TZ',
  },
  {
    role: 'Build Version',
    name: 'v2.0.26_STABLE',
  },
];

export default function FaqPage() {
  // OPERATOR LAYER: BAADAYE ITAKUWA `await getPublishedFaqs()` YA SUPABASE
  const faqData = getPublishedFaqs();

  return (
    <FAQGUI
      faqData={faqData}
      credits={credits}
    />
  );
}