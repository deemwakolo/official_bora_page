// CONTRACT YA FAQ DATA: BOUNDARY YA FUTURE SUPABASE
// TABLE: public.faqs (TAZAMA supabase/migrations)

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
  published: boolean;
}

// MOCK FAQ DATA: CONTENT ASILIOPO KWA SASA
const faqData: FaqItem[] = [
  {
    id: '01',
    question: 'WHAT IS MATITU NATION?',
    answer:
      'Matitu Nation is an independent creative studio and asset house founded in Dar es Salaam. We specialize in creative strategy, music production (Bongo Flava, Afrobeat, Drill, Trap), and visual identity architecture for artists who want to turn their vision into ownership.',
    category: 'GENERAL',
    sortOrder: 1,
    published: true,
  },
  {
    id: '02',
    question: 'WHAT IS THE BORA ENGINE?',
    answer:
      'Bora is our proprietary framework used to engineer sonic and visual identity. It powers our charts and acts as the intelligence layer for all strategic creative rollouts.',
    category: 'BORA',
    sortOrder: 2,
    published: true,
  },
  {
    id: '03',
    question: 'WHO IS ZEKE.BXT?',
    answer:
      'Zeke.bxt is the experimental production identity inside Matitu Nation, responsible for heavy textures, dark sonic design, and visual-led sound branding.',
    category: 'GENERAL',
    sortOrder: 3,
    published: true,
  },
  {
    id: '04',
    question: 'HOW CAN I COLLABORATE?',
    answer:
      'We operate on a Vision-to-Asset model. You submit intent, we translate it into structured creative output across sound, visuals, and strategy.',
    category: 'GENERAL',
    sortOrder: 4,
    published: true,
  },
];

export { faqData };

// PUBLIC QUERY YA FUTURE: published = true ORDER BY sort_order ASC
export function getPublishedFaqs(): FaqItem[] {
  return faqData
    .filter((item) => item.published)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
