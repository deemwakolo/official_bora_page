// CONTRACT YA DATA YA NEWS (PUBLIC SIDE)
// HOYO NI NDO SEHEMU MOJA YA KUUNGANISHA DATA YA NYUMA (E.G. SUPABASE) NA UI

export interface NewsItem {
  id: string | number;
  category: string;
  title: string;
  timestamp: string;
  excerpt: string;
  image: string;
  source?: string;
  publishedAt?: string;
  isHot?: boolean;
}

export interface FeaturedNewsItem {
  category: string;
  title: string;
  timestamp: string;
  excerpt: string;
  image: string;
  source?: string;
  publishedAt?: string;
  isHot?: boolean;
}

// FEATURED STORY MOJA (HERO)
export const featuredNews: FeaturedNewsItem = {
  category: 'CHART PULSE',
  title:
    'Sielewi Dominates the Bora Top 20 for the Third Week',
  timestamp: '20:44 / 26 APR',
  excerpt:
    'The latest BORA numbers show continued momentum as the track holds its position at the top of the chart.',
  image:
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1400&q=80',
  isHot: true,
};

// FEED YA HABARI NYINGINE
export const newsData: NewsItem[] = [
  {
    id: 2,
    category: 'INDUSTRY',
    title: 'The Rise of Bongo-Drill: A New Sonic Frontier',
    timestamp: '18:12 / 26 APR',
    excerpt:
      'A new wave of artists is pushing Tanzanian drill into unexpected territory.',
    image:
      'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 3,
    category: 'STUDIO TECH',
    title: 'Matitu Nation Unveils Creative Suite',
    timestamp: '16:40 / 26 APR',
    excerpt:
      'Inside the tools and spaces shaping the next generation of local creators.',
    image:
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 4,
    category: 'CULTURE',
    title: 'Visual Identity: The Beast Titan Aesthetic',
    timestamp: '14:22 / 26 APR',
    excerpt:
      'How Tanzanian artists are turning visual identity into part of the music itself.',
    image:
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 5,
    category: 'MARKET',
    title: 'Iringa Music Scene: The Nzihi Corridor',
    timestamp: '11:08 / 26 APR',
    excerpt:
      'A closer look at the regional movement developing outside the traditional music hubs.',
    image:
      'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=900&q=80',
  },
];
