'use client';

import type { MomentSong } from '@/app/components/charts/MomentChart';

import MomentChartsField from './MomentChartsField';

export type MomentSongField =
  | 'title'
  | 'artist'
  | 'feature'
  | 'producer'
  | 'releaseDate'
  | 'genre'
  | 'artwork'
  | 'youtube'
  | 'spotify'
  | 'boomplay';

interface MomentChartsSongFieldsProps {
  entry: MomentSong;
  fieldId: (name: string) => string;
  onChangeSongField: (
    rank: number,
    field: MomentSongField,
    value: string,
  ) => void;
}

/*
 * BORA MOMENT CHARTS SONG FIELDS
 *
 * Song Information grid only. Local drafts (STEP 6: no persistence).
 */
export default function MomentChartsSongFields({
  entry,
  fieldId,
  onChangeSongField,
}: MomentChartsSongFieldsProps) {
  return (
    <div>
      <p
        className="text-[7px] font-black uppercase tracking-[0.15em]"
        style={{ color: 'var(--bora-text-muted)' }}
      >
        Song Information
      </p>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <MomentChartsField
            id={fieldId('title')}
            label="Title"
            value={entry.metadata.title}
            placeholder="Song title"
            onChange={(value) =>
              onChangeSongField(entry.rank, 'title', value)
            }
          />
        </div>

        <div className="sm:col-span-2">
          <MomentChartsField
            id={fieldId('artist')}
            label="Artist"
            value={entry.metadata.artist}
            placeholder="Artist name"
            onChange={(value) =>
              onChangeSongField(entry.rank, 'artist', value)
            }
          />
        </div>

        <MomentChartsField
          id={fieldId('feature')}
          label="Feature"
          value={entry.metadata.feature}
          placeholder="Featured artist"
          onChange={(value) =>
            onChangeSongField(entry.rank, 'feature', value)
          }
        />

        <MomentChartsField
          id={fieldId('producer')}
          label="Producer"
          value={entry.metadata.producer}
          placeholder="Producer"
          onChange={(value) =>
            onChangeSongField(entry.rank, 'producer', value)
          }
        />

        <MomentChartsField
          id={fieldId('releaseDate')}
          label="Release Date"
          value={entry.metadata.releaseDate}
          placeholder="12 Sep 2026"
          onChange={(value) =>
            onChangeSongField(entry.rank, 'releaseDate', value)
          }
        />

        <MomentChartsField
          id={fieldId('genre')}
          label="Genre"
          value={entry.metadata.genre}
          placeholder="Genre"
          onChange={(value) =>
            onChangeSongField(entry.rank, 'genre', value)
          }
        />

        <div className="sm:col-span-2">
          <MomentChartsField
            id={fieldId('artwork')}
            label="Artwork"
            value={entry.metadata.artwork}
            placeholder="Artwork URL"
            onChange={(value) =>
              onChangeSongField(entry.rank, 'artwork', value)
            }
          />
        </div>

        <div className="sm:col-span-2">
          <MomentChartsField
            id={fieldId('youtube')}
            label="YouTube URL"
            value={entry.metadata.youtube}
            placeholder="YouTube URL"
            onChange={(value) =>
              onChangeSongField(entry.rank, 'youtube', value)
            }
          />
        </div>

        <MomentChartsField
          id={fieldId('spotify')}
          label="Spotify URL"
          value={entry.metadata.spotify}
          placeholder="Spotify URL"
          onChange={(value) =>
            onChangeSongField(entry.rank, 'spotify', value)
          }
        />

        <MomentChartsField
          id={fieldId('boomplay')}
          label="Boomplay URL"
          value={entry.metadata.boomplay}
          placeholder="Boomplay URL"
          onChange={(value) =>
            onChangeSongField(entry.rank, 'boomplay', value)
          }
        />
      </div>
    </div>
  );
}
