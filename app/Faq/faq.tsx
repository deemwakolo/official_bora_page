'use client';

import React from 'react';
import FAQGUI from './GUI/FAQGUI';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface CreditItem {
  role: string;
  name: string;
}

const faqData: FaqItem[] = [
  {
    id: '01',
    question: 'WHAT IS MATITU NATION?',
    answer:
      'Matitu Nation is an independent creative studio and asset house founded in Dar es Salaam. We specialize in creative strategy, music production (Bongo Flava, Afrobeat, Drill, Trap), and visual identity architecture for artists who want to turn their vision into ownership.',
  },
  {
    id: '02',
    question: 'WHAT IS THE BORA ENGINE?',
    answer:
      'Bora is our proprietary framework used to engineer sonic and visual identity. It powers our charts and acts as the intelligence layer for all strategic creative rollouts.',
  },
  {
    id: '03',
    question: 'WHO IS ZEKE.BXT?',
    answer:
      'Zeke.bxt is the experimental production identity inside Matitu Nation, responsible for heavy textures, dark sonic design, and visual-led sound branding.',
  },
  {
    id: '04',
    question: 'HOW CAN I COLLABORATE?',
    answer:
      'We operate on a Vision-to-Asset model. You submit intent, we translate it into structured creative output across sound, visuals, and strategy.',
  },
];

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
  return (
    <FAQGUI
      faqData={faqData}
      credits={credits}
    />
  );
}