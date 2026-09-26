'use client';

import React from 'react';

import {
  addAboutBody,
  removeAboutBody,
  resetAboutContent,
  setAboutBody,
  setAboutField,
  setAboutFact,
  setAboutLink,
  setAboutValue,
  useAboutContent,
} from '../../components/about/aboutData';

const sharedInput =
  'w-full border px-3 py-2.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--bora-gold)]';

const inputStyle = {
  borderColor: 'var(--bora-border)',
  backgroundColor: 'var(--bora-background)',
  color: 'var(--bora-text)',
};

const smallButton =
  'border px-3 py-2 text-[7px] font-black uppercase tracking-[0.15em] transition-all duration-300 active:scale-[0.98]';

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
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

      {multiline ? (
        <textarea
          id={id}
          name={id}
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${sharedInput} resize-y`}
          style={inputStyle}
        />
      ) : (
        <input
          id={id}
          name={id}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={sharedInput}
          style={inputStyle}
        />
      )}
    </div>
  );
}

function Block({
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

function RowBlock({
  index,
  idPrefix,
  titleLabel,
  titleValue,
  onTitle,
  secondLabel,
  secondValue,
  onSecond,
  secondPlaceholder,
  secondMultiline,
}: {
  index: number;
  idPrefix: string;
  titleLabel: string;
  titleValue: string;
  onTitle: (v: string) => void;
  secondLabel: string;
  secondValue: string;
  onSecond: (v: string) => void;
  secondPlaceholder?: string;
  secondMultiline?: boolean;
}) {
  return (
    <div
      className="space-y-3 border-b pb-3 last:border-b-0 last:pb-0"
      style={{ borderColor: 'var(--bora-border)' }}
    >
      <Field
        id={`${idPrefix}-title-${index}`}
        label={titleLabel}
        value={titleValue}
        onChange={onTitle}
      />
      <Field
        id={`${idPrefix}-second-${index}`}
        label={secondLabel}
        value={secondValue}
        placeholder={secondPlaceholder}
        multiline={secondMultiline}
        onChange={onSecond}
      />
    </div>
  );
}

/*
 * BORA UPDATES ROOM — ABOUT US EDITOR
 *
 * Inaandika mock About Us content (aboutData) ambayo public
 * /about inaisoma. Hakuna database, hakuna auth.
 */
export default function UpdatesAboutEditor() {
  const about = useAboutContent();

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
            Updates Room
          </p>
          <h2 className="mt-2 font-cinzel text-lg font-black uppercase tracking-[0.14em]">
            About Us Editor
          </h2>
          <p
            className="mt-1.5 text-[7px] uppercase tracking-[0.16em]"
            style={{ color: 'var(--bora-text-muted)' }}
          >
            Mock content · shown on public /about
          </p>
        </div>

        <button
          type="button"
          onClick={() => resetAboutContent()}
          className={smallButton}
          style={{
            borderColor: 'var(--bora-border-strong)',
            color: 'var(--bora-text-muted)',
          }}
        >
          Reset
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Block title="Header">
          <Field
            id="cr-about-eyebrow"
            label="Eyebrow"
            value={about.eyebrow}
            onChange={(v) => setAboutField('eyebrow', v)}
          />
          <Field
            id="cr-about-title"
            label="Title"
            value={about.title}
            onChange={(v) => setAboutField('title', v)}
          />
          <Field
            id="cr-about-tagline"
            label="Tagline"
            value={about.tagline}
            onChange={(v) => setAboutField('tagline', v)}
          />
        </Block>

        <Block title="Body Paragraphs">
          {about.body.map((paragraph, index) => (
            <div
              key={index}
              className="flex items-start gap-2"
            >
              <div className="min-w-0 flex-1">
                <Field
                  id={`cr-about-body-${index}`}
                  label={`Paragraph ${index + 1}`}
                  value={paragraph}
                  multiline
                  onChange={(v) => setAboutBody(index, v)}
                />
              </div>

              <button
                type="button"
                onClick={() => removeAboutBody(index)}
                disabled={about.body.length <= 1}
                aria-label={`Remove paragraph ${index + 1}`}
                className={`${smallButton} mt-[22px] disabled:cursor-not-allowed`}
                style={{
                  borderColor: 'var(--bora-border)',
                  color: 'var(--bora-text-subtle)',
                }}
              >
                Remove
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => addAboutBody()}
            className={smallButton}
            style={{
              borderColor: 'var(--bora-gold)',
              color: 'var(--bora-gold)',
            }}
          >
            Add Paragraph
          </button>
        </Block>

        <Block title="Facts">
          {about.facts.map((fact, index) => (
            <RowBlock
              key={fact.id}
              index={index}
              idPrefix="cr-about-fact"
              titleLabel={`Fact ${index + 1} · Label`}
              titleValue={fact.label}
              onTitle={(v) => setAboutFact(index, { label: v })}
              secondLabel={`Fact ${index + 1} · Value`}
              secondValue={fact.value}
              onSecond={(v) => setAboutFact(index, { value: v })}
            />
          ))}
        </Block>

        <Block title="Values">
          {about.values.map((value, index) => (
            <RowBlock
              key={value.id}
              index={index}
              idPrefix="cr-about-value"
              titleLabel={`Value ${index + 1} · Title`}
              titleValue={value.title}
              onTitle={(v) => setAboutValue(index, { title: v })}
              secondLabel={`Value ${index + 1} · Description`}
              secondValue={value.description}
              onSecond={(v) =>
                setAboutValue(index, { description: v })
              }
              secondMultiline
            />
          ))}
        </Block>

        <Block title="Links">
          {about.links.map((link, index) => (
            <RowBlock
              key={link.id}
              index={index}
              idPrefix="cr-about-link"
              titleLabel={`Link ${index + 1} · Label`}
              titleValue={link.label}
              onTitle={(v) => setAboutLink(index, { label: v })}
              secondLabel={`Link ${index + 1} · Href`}
              secondValue={link.href}
              onSecond={(v) => setAboutLink(index, { href: v })}
              secondPlaceholder="https://..."
            />
          ))}
        </Block>
      </div>
    </div>
  );
}
