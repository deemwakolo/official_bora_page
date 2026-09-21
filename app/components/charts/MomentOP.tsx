'use client';

import { MomentSong } from './MomentChart';

export interface MomentOPData {
  periodLabel: string;
  date: string;
  songs: MomentSong[];
}

const W = (rank: number, kind: 'up' | 'down' | 'same' | 'new', delta: number | undefined, title: string, artist: string, extra?: Partial<MomentSong['metadata']>): MomentSong => ({
  rank,
  movement: delta === undefined ? { kind } : { kind, delta },
  metadata: {
    title, artist,
    feature: '-', producer: 'Bongo Beats Lab', releaseDate: 'Sep 2026',
    genre: 'Bongo Flava', artwork: '',
    youtube: 'https://youtube.com/', spotify: 'https://open.spotify.com/', boomplay: 'https://www.boomplay.com/',
    ...(extra || {}),
  },
});

const weeklySongs: MomentSong[] = [
  W(1, 'up', 2, 'Zamani', 'Marioo', { feature: 'Jux', producer: 'S2Kizzy', releaseDate: '12 Sep 2026', artwork: 'https://placehold.co/800x800/121212/D4AF37?text=Zamani' }),
  W(2, 'down', 1, 'Nakupa Moyo', 'Zuchu', { producer: 'Mocco Genius', releaseDate: '28 Aug 2026', artwork: 'https://placehold.co/800x800/1a1a1a/DC143C?text=Nakupa+Moyo' }),
  W(3, 'up', 4, 'Mawimbi', 'Alikiba', { producer: 'Master J', releaseDate: '05 Sep 2026', artwork: 'https://placehold.co/800x800/202020/FFFFFF?text=Mawimbi' }),
  W(4, 'same', undefined, 'Usiku wa Leo', 'Harmonize', { feature: 'Nandy', producer: 'Mixola', releaseDate: '21 Aug 2026', genre: 'Afropop', artwork: 'https://placehold.co/800x800/181818/D4AF37?text=Usiku+wa+Leo' }),
  W(5, 'new', undefined, 'Pesa', 'Diamond Platnumz', { feature: 'Mbosso', producer: 'Lizer Classic', releaseDate: '18 Sep 2026', artwork: 'https://placehold.co/800x800/111111/DC143C?text=Pesa', spotify: '' }),
  W(6, 'up', 1, 'Njia Moja', 'Rayvanny', { producer: 'S2Kizzy', releaseDate: '30 Aug 2026', artwork: 'https://placehold.co/800x800/242424/D4AF37?text=Njia+Moja' }),
  W(7, 'down', 3, 'Tabasamu', 'Nandy', { producer: 'Kimambo', releaseDate: '14 Aug 2026', artwork: 'https://placehold.co/800x800/151515/FFFFFF?text=Tabasamu', boomplay: '' }),
  W(8, 'up', 2, 'Mama', 'Mbosso', { producer: 'Mocco Genius', releaseDate: '09 Sep 2026', artwork: 'https://placehold.co/800x800/202020/DC143C?text=Mama' }),
  W(9, 'down', 2, 'Kigoma Nights', 'Billnass', { feature: 'Young Lunya', producer: 'Bonga Records', releaseDate: '02 Sep 2026', genre: 'Hip Hop' }),
  W(10, 'new', undefined, 'Safari', 'Phina', { producer: 'Bongo Beats Lab', releaseDate: '20 Sep 2026', artwork: 'https://placehold.co/800x800/191919/D4AF37?text=Safari' }),
];

const monthlySongs: MomentSong[] = [
  W(1, 'up', 1, 'Tamu', 'Jux', { feature: 'Diamond Platnumz', producer: 'Mocco Genius', releaseDate: '22 Aug 2026', artwork: 'https://placehold.co/800x800/121212/D4AF37?text=Tamu' }),
  W(2, 'same', undefined, 'Asali', 'Zuchu', { producer: 'Tricky Beats', releaseDate: '15 Aug 2026', artwork: 'https://placehold.co/800x800/1a1a1a/FFFFFF?text=Asali' }),
  W(3, 'up', 3, 'Baraka', 'Alikiba', { feature: 'Marioo', producer: 'Master J', releaseDate: '10 Aug 2026', artwork: 'https://placehold.co/800x800/202020/D4AF37?text=Baraka', spotify: '' }),
  W(4, 'down', 2, 'Dhuruma', 'Harmonize', { producer: 'Kondex', releaseDate: '02 Aug 2026', genre: 'Afropop', artwork: 'https://placehold.co/800x800/181818/FFFFFF?text=Dhuruma' }),
  W(5, 'up', 5, 'Malkia', 'Nandy', { feature: 'Rayvanny', producer: 'Kimambo', releaseDate: '25 Aug 2026', artwork: 'https://placehold.co/800x800/101010/DC143C?text=Malkia', spotify: '' }),
  W(6, 'same', undefined, 'Furaha', 'Mbosso', { producer: 'Mocco Genius', releaseDate: '18 Aug 2026', artwork: 'https://placehold.co/800x800/222222/D4AF37?text=Furaha' }),
  W(7, 'new', undefined, 'Nairobi Dar', 'Billnass', { feature: 'Khaligraph Jones', producer: 'Bonga Records', releaseDate: '12 Sep 2026', genre: 'Hip Hop', artwork: 'https://placehold.co/800x800/151515/FFFFFF?text=Nairobi+Dar' }),
  W(8, 'down', 3, 'Silent', 'Phina', { producer: 'Velvet Sound', releaseDate: '08 Aug 2026', genre: 'R&B' }),
  W(9, 'up', 1, 'Moto', 'Young Lunya', { feature: 'Billnass', producer: 'Eastside Audio', releaseDate: '19 Aug 2026', genre: 'Hip Hop', artwork: 'https://placehold.co/800x800/1e1e1e/DC143C?text=Moto' }),
  W(10, 'down', 2, 'Polepole', 'Anjella', { producer: 'North Block', releaseDate: '05 Aug 2026', artwork: 'https://placehold.co/800x800/181818/D4AF37?text=Polepole' }),
];

export const weeklyMomentData: MomentOPData = {
  periodLabel: 'WEEKLY',
  date: '21 SEP 2026',
  songs: weeklySongs,
};

export const monthlyMomentData: MomentOPData = {
  periodLabel: 'MONTHLY',
  date: 'SEPTEMBER 2026',
  songs: monthlySongs,
};
