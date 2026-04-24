export type Song = {
  rank: number;
  title: string;
  artist: string;
  votes: string;
  trend: 'up' | 'down' | 'new' | 'steady';
  links: {
    spotify?: string;
    youtube?: string;
    boomplay?: string;
  }
};