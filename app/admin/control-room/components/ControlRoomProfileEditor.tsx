'use client';

import React from 'react';

import {
  resetProfileContent,
  setFavoriteArtist,
  setProfileArtist,
  setProfileIdentity,
  setProfileSong,
  useProfileContent,
} from '../../../components/profile/profileData';

function EditorField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[7px] font-black uppercase tracking-[0.15em]"
        style={{ color: 'var(--bora-text-muted)' }}
      >
        {label}
      </label>

      <input
        id={id}
        name={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border px-3 py-2.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--bora-gold)]"
        style={{
          borderColor: 'var(--bora-border)',
          backgroundColor: 'var(--bora-background)',
          color: 'var(--bora-text)',
        }}
      />
    </div>
  );
}

function EditorBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="border p-4"
      style={{
        borderColor: 'var(--bora-border)',
        backgroundColor: 'var(--bora-surface)',
      }}
    >
      <p
        className="mb-3 text-[7px] font-black uppercase tracking-[0.2em]"
        style={{ color: 'var(--bora-gold)' }}
      >
        {title}
      </p>

      <div className="space-y-3">{children}</div>
    </div>
  );
}

function PairBlock({
  index,
  nameLabel,
  nameValue,
  onName,
  imageLabel,
  imageValue,
  onImage,
}: {
  index: number;
  nameLabel: string;
  nameValue: string;
  onName: (value: string) => void;
  imageLabel: string;
  imageValue: string;
  onImage: (value: string) => void;
}) {
  return (
    <div
      className="space-y-3 border-b pb-3 last:border-b-0 last:pb-0"
      style={{ borderColor: 'var(--bora-border)' }}
    >
      <EditorField
        id={`cr-item-name-${index}`}
        label={nameLabel}
        value={nameValue}
        onChange={onName}
      />
      <EditorField
        id={`cr-item-img-${index}`}
        label={imageLabel}
        value={imageValue}
        placeholder="https://..."
        onChange={onImage}
      />
    </div>
  );
}

/*
 * BORA CONTROL ROOM PROFILE EDITOR
 *
 * Inaandika MOCK profile content (profileData) ambayo public
 * Profile inaisoma. Hakuna database, hakuna auth.
 */
export default function ControlRoomProfileEditor() {
  const content = useProfileContent();

  return (
    <div className="w-full">
      <div
        className="flex flex-col gap-3 border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
        style={{
          borderColor: 'var(--bora-border)',
          backgroundColor: 'var(--bora-background-deep)',
        }}
      >
        <div>
          <p
            className="text-[7px] font-black uppercase tracking-[0.24em]"
            style={{ color: 'var(--bora-gold)' }}
          >
            BORA Admin
          </p>
          <h2 className="mt-2 font-cinzel text-lg font-black uppercase tracking-[0.14em]">
            Profile Editor
          </h2>
          <p
            className="mt-1.5 text-[7px] uppercase tracking-[0.16em]"
            style={{ color: 'var(--bora-text-muted)' }}
          >
            Mock content · reflected on public Profile
          </p>
        </div>

        <button
          type="button"
          onClick={() => resetProfileContent()}
          className="shrink-0 border px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.15em] transition-all duration-300 active:scale-[0.98]"
          style={{
            borderColor: 'var(--bora-border-strong)',
            color: 'var(--bora-text-muted)',
          }}
        >
          Reset
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <EditorBlock title="Profile Identity">
          <EditorField
            id="cr-profile-name"
            label="Display Name"
            value={content.profile.displayName}
            onChange={(v) => setProfileIdentity({ displayName: v })}
          />
          <EditorField
            id="cr-profile-username"
            label="Username"
            value={content.profile.username}
            onChange={(v) => setProfileIdentity({ username: v })}
          />
          <EditorField
            id="cr-profile-bio"
            label="Bio"
            value={content.profile.bio}
            onChange={(v) => setProfileIdentity({ bio: v })}
          />
          <EditorField
            id="cr-profile-avatar"
            label="Profile Picture URL"
            value={content.profile.avatarUrl}
            placeholder="https://..."
            onChange={(v) => setProfileIdentity({ avatarUrl: v })}
          />
        </EditorBlock>

        <EditorBlock title="Favorite Artists (Profile Header)">
          {content.favoriteArtists.map((artist, index) => (
            <PairBlock
              key={index}
              index={index}
              nameLabel={`Artist ${index + 1} · Name`}
              nameValue={artist.name}
              onName={(v) => setFavoriteArtist(index, { name: v })}
              imageLabel={`Artist ${index + 1} · Picture URL`}
              imageValue={artist.imageUrl}
              onImage={(v) => setFavoriteArtist(index, { imageUrl: v })}
            />
          ))}
        </EditorBlock>

        <EditorBlock title="Songs / Playlists">
          {content.songs.map((song, index) => (
            <div
              key={song.id}
              className="space-y-3 border-b pb-3 last:border-b-0 last:pb-0"
              style={{ borderColor: 'var(--bora-border)' }}
            >
              <EditorField
                id={`cr-song-title-${index}`}
                label={`Song ${index + 1} · Title`}
                value={song.title}
                onChange={(v) => setProfileSong(index, { title: v })}
              />
              <EditorField
                id={`cr-song-artist-${index}`}
                label={`Song ${index + 1} · Artist`}
                value={song.artist}
                onChange={(v) => setProfileSong(index, { artist: v })}
              />
              <EditorField
                id={`cr-song-cover-${index}`}
                label={`Song ${index + 1} · Cover URL`}
                value={song.coverUrl}
                placeholder="https://..."
                onChange={(v) => setProfileSong(index, { coverUrl: v })}
              />
            </div>
          ))}
        </EditorBlock>

        <EditorBlock title="Supported Artists">
          {content.artists.map((artist, index) => (
            <PairBlock
              key={artist.id}
              index={100 + index}
              nameLabel={`Artist ${index + 1} · Name`}
              nameValue={artist.name}
              onName={(v) => setProfileArtist(index, { name: v })}
              imageLabel={`Artist ${index + 1} · Picture URL`}
              imageValue={artist.imageUrl}
              onImage={(v) => setProfileArtist(index, { imageUrl: v })}
            />
          ))}
        </EditorBlock>
      </div>
    </div>
  );
}
