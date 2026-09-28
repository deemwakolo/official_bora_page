'use client';

import React from 'react';

import type {
  BoraUIPropertySchema,
  UIPropertyRow,
} from '../lib/uiTypes';

import {
  parseBoraGradient,
  serializeBoraGradient,
  type BoraGradient,
  type BoraGradientStop,
} from '../../../components/ui-room/boraUIGradient';

import {
  BORA_UI_BREAKPOINTS,
  type BoraUIBreakpoint,
} from '../../../components/ui-room/boraUIProtocol';

/*
 * BORA UI ROOM — PROPERTY CONTROL (schema-driven)
 *
 * One control per property TYPE. Adding a new editable property is a
 * registry change, never an inspector rewrite: the schema says what
 * the control must be, this file says what each control looks like.
 */

interface UIPropertyControlProps {
  row: UIPropertyRow;
  onChange: (value: string) => void;
  onReset?: () => void;
  /** Per-breakpoint draft, for `responsive: true` properties only. */
  responsiveValues?: Partial<Record<BoraUIBreakpoint, string>>;
  onResponsiveChange?: (
    breakpoint: BoraUIBreakpoint,
    value: string
  ) => void;
  onResponsiveReset?: () => void;
}

/* ── VALUE PARSING ────────────────────────────────────────── */

function parseNumeric(value: string): number | null {
  const match = value.trim().match(/-?\d+(\.\d+)?/);

  return match ? Number(match[0]) : null;
}

function formatNumeric(value: number, unit?: string): string {
  if (unit === 'ms') return `${value}ms`;

  if (unit) return `${value}${unit}`;

  // Unitless (e.g. the type-scale multiplier) must not get a suffix.
  return `${value}`;
}

function toHexByte(value: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(value)));

  return clamped.toString(16).padStart(2, '0');
}

/** Accepts hex, rgb(), rgba() — used for the colour swatch. */
function toSwatchColor(value: string): string {
  const trimmed = value.trim();

  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;

  const short = trimmed.match(/^#(.)(.)(.)$/i);

  if (short) {
    const [, r, g, b] = short;

    return `#${r}${r}${g}${g}${b}${b}`;
  }

  const rgb = trimmed.match(/rgba?\(([^)]+)\)/i);

  if (!rgb?.[1]) return '#000000';

  const parts = rgb[1].split(',');

  return `#${toHexByte(Number(parts[0] ?? 0))}${toHexByte(
    Number(parts[1] ?? 0)
  )}${toHexByte(Number(parts[2] ?? 0))}`;
}

function clampToSchema(
  property: BoraUIPropertySchema,
  value: number
): number {
  const min = property.min ?? Number.NEGATIVE_INFINITY;
  const max = property.max ?? Number.POSITIVE_INFINITY;

  return Math.min(max, Math.max(min, value));
}

/* ── SHARED INPUT STYLING ─────────────────────────────────── */

const fieldClass =
  'w-full border px-2 py-1.5 text-[9px] outline-none transition-colors focus:border-[color:var(--bora-gold)]';

function fieldStyle() {
  return {
    backgroundColor: 'var(--bora-background-deep)',
    borderColor: 'var(--bora-border)',
    color: 'var(--bora-text)',
  };
}

/* ── NUMBER-LIKE CONTROL (number / unit / duration) ────────── */

function NumberControl({
  property,
  row,
  onChange,
}: {
  property: BoraUIPropertySchema;
  row: UIPropertyRow;
  onChange: (value: string) => void;
}) {
  const parsed = parseNumeric(row.value);

  // Non-numeric source (e.g. `normal`) must not be destroyed.
  if (parsed === null) {
    return (
      <input
        type="text"
        value={row.value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
        style={fieldStyle()}
      />
    );
  }

  const unit =
    property.type === 'duration' ? 'ms' : property.unit;

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={parsed}
        min={property.min}
        max={property.max}
        step={property.step ?? 1}
        onChange={(event) => {
          const next = clampToSchema(
            property,
            Number(event.target.value)
          );

          onChange(formatNumeric(next, unit));
        }}
        className={fieldClass}
        style={fieldStyle()}
      />

      {unit && (
        <span
          className="shrink-0 text-[7px] font-black uppercase tracking-[0.12em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          {unit}
        </span>
      )}
    </div>
  );
}

/* ── GRADIENT CONTROL (structured, target-scoped) ──────────── */

const miniButtonClass =
  'border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] transition-colors';

function GradientControl({
  row,
  onChange,
}: {
  row: UIPropertyRow;
  onChange: (value: string) => void;
}) {
  const parsed = parseBoraGradient(row.value);

  // A gradient we cannot model is never silently rewritten: the
  // control degrades to the plain text field.
  if (!parsed) {
    return (
      <input
        type="text"
        value={row.value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
        style={fieldStyle()}
      />
    );
  }

  const commit = (next: BoraGradient) =>
    onChange(serializeBoraGradient(next));

  const updateStop = (
    index: number,
    patch: Partial<BoraGradientStop>
  ) => {
    const stops = parsed.stops.map((stop, i) =>
      i === index ? { ...stop, ...patch } : stop
    );

    commit({ ...parsed, stops });
  };

  const addStop = () => {
    const last = parsed.stops[parsed.stops.length - 1];
    const position = last ? last.position : '100%';

    commit({
      ...parsed,
      stops: [
        ...parsed.stops,
        { color: last?.color ?? 'transparent', position },
      ],
    });
  };

  const removeStop = (index: number) => {
    if (parsed.stops.length <= 2) return;

    commit({
      ...parsed,
      stops: parsed.stops.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-2">
      {/* TYPE */}
      <div className="flex items-center gap-1.5">
        <select
          aria-label="Gradient type"
          value={parsed.kind}
          onChange={(event) =>
            commit({
              ...parsed,
              kind: event.target
                .value as BoraGradient['kind'],
            })
          }
          className="flex-1"
          style={fieldStyle()}
        >
          <option value="linear">Linear</option>
          <option value="radial">Radial</option>
        </select>

        {parsed.kind === 'linear' ? (
          <div className="flex flex-1 items-center gap-1">
            <input
              type="number"
              aria-label="Gradient angle"
              value={parsed.angle}
              min={0}
              max={360}
              step={5}
              onChange={(event) =>
                commit({
                  ...parsed,
                  angle: Number(event.target.value),
                })
              }
              className={fieldClass}
              style={fieldStyle()}
            />
            <span
              className="shrink-0 text-[7px] font-black uppercase tracking-[0.1em]"
              style={{ color: 'var(--bora-text-subtle)' }}
            >
              deg
            </span>
          </div>
        ) : (
          <>
            <select
              aria-label="Radial shape"
              value={parsed.shape}
              onChange={(event) =>
                commit({
                  ...parsed,
                  shape: event.target.value as BoraGradient['shape'],
                })
              }
              className="flex-1"
              style={fieldStyle()}
            >
              <option value="ellipse">Ellipse</option>
              <option value="circle">Circle</option>
            </select>

            <input
              type="text"
              aria-label="Radial position"
              value={parsed.position}
              onChange={(event) =>
                commit({ ...parsed, position: event.target.value })
              }
              className="flex-1"
              style={fieldStyle()}
            />
          </>
        )}
      </div>

      {/* STOPS */}
      <div className="space-y-1.5">
        {parsed.stops.map((stop, index) => (
          <div
            key={`${index}-${stop.color}`}
            className="flex items-center gap-1.5"
          >
            <input
              type="text"
              aria-label={`Stop ${index + 1} colour`}
              value={stop.color}
              onChange={(event) =>
                updateStop(index, { color: event.target.value })
              }
              className="min-w-0 flex-1"
              style={fieldStyle()}
            />

            <input
              type="text"
              aria-label={`Stop ${index + 1} position`}
              value={stop.position}
              onChange={(event) =>
                updateStop(index, { position: event.target.value })
              }
              className="w-14 shrink-0"
              style={fieldStyle()}
            />

            <button
              type="button"
              onClick={() => removeStop(index)}
              disabled={parsed.stops.length <= 2}
              aria-label={`Remove stop ${index + 1}`}
              className={miniButtonClass}
              style={{
                borderColor: 'var(--bora-border)',
                color: 'var(--bora-text-subtle)',
              }}
            >
              −
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addStop}
        aria-label="Add colour stop"
        className={miniButtonClass}
        style={{
          borderColor: 'var(--bora-border-strong)',
          color: 'var(--bora-text-muted)',
        }}
      >
        + Stop
      </button>
    </div>
  );
}

/* ── RESPONSIVE CONTROL (Base / SM / MD / LG) ────────────────
 *
 * Mobile-first. An EMPTY field means INHERIT — the breakpoint key is
 * deleted, the bridge emits no rule, and the previous value applies.
 */

function ResponsiveControl({
  row,
  values,
  onChange,
  onReset,
}: {
  row: UIPropertyRow;
  values: Partial<Record<BoraUIBreakpoint, string>>;
  onChange: (
    breakpoint: BoraUIBreakpoint,
    value: string
  ) => void;
  onReset?: () => void;
}) {
  const source = row.property.responsiveSource ?? {};
  const anyDirty = BORA_UI_BREAKPOINTS.some(
    (breakpoint) => values[breakpoint.id] !== undefined
  );

  return (
    <div className="space-y-1.5">
      {BORA_UI_BREAKPOINTS.map((breakpoint) => {
        const value = values[breakpoint.id] ?? '';
        const baseline = source[breakpoint.id];
        const dirty =
          value !== '' &&
          (baseline === undefined || baseline !== value);

        return (
          <div
            key={breakpoint.id}
            className="flex items-center gap-1.5"
          >
            <span
              className="w-7 shrink-0 text-[7px] font-black uppercase tracking-[0.12em]"
              style={{
                color: dirty
                  ? 'var(--bora-gold)'
                  : 'var(--bora-text-subtle)',
              }}
            >
              {breakpoint.label}
            </span>

            <input
              type="text"
              aria-label={`${row.property.label} ${breakpoint.label}`}
              value={value}
              placeholder={
                baseline ? `inherit ${baseline}` : 'inherit'
              }
              onChange={(event) =>
                onChange(breakpoint.id, event.target.value)
              }
              className={fieldClass}
              style={{
                ...fieldStyle(),
                borderColor: dirty
                  ? 'var(--bora-gold)'
                  : 'var(--bora-border)',
              }}
            />

            {value !== '' && (
              <button
                type="button"
                onClick={() => onChange(breakpoint.id, '')}
                aria-label={`Inherit ${row.property.label} at ${breakpoint.label}`}
                className="shrink-0 border px-1 py-0.5 text-[7px] font-black"
                style={{
                  borderColor: 'var(--bora-border)',
                  color: 'var(--bora-text-subtle)',
                }}
              >
                ↺
              </button>
            )}
          </div>
        );
      })}

      {onReset && anyDirty && (
        <button
          type="button"
          onClick={onReset}
          aria-label={`Reset ${row.property.label} responsive values`}
          className="text-[6px] font-black uppercase tracking-[0.14em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          Reset all breakpoints
        </button>
      )}
    </div>
  );
}

/* ── MAIN CONTROL ─────────────────────────────────────────── */

export default function UIPropertyControl({
  row,
  onChange,
  onReset,
  responsiveValues,
  onResponsiveChange,
  onResponsiveReset,
}: UIPropertyControlProps) {
  const { property, value } = row;

  // RESPONSIVE PROPERTIES render the Base / SM / MD / LG editor
  // instead of a single scalar input.
  if (property.responsive === true && onResponsiveChange) {
    const hasDraft = Object.keys(responsiveValues ?? {}).length > 0;

    return (
      <div>
        <div className="mb-1 flex items-center gap-1.5">
          <span
            className="truncate text-[7px] font-black uppercase tracking-[0.16em]"
            style={{ color: 'var(--bora-text-muted)' }}
          >
            {property.label}
          </span>

          {hasDraft && (
            <span
              title="Drafted"
              className="h-1 w-1 shrink-0 rounded-full"
              style={{ backgroundColor: 'var(--bora-gold)' }}
            />
          )}
        </div>

        <ResponsiveControl
          row={row}
          values={responsiveValues ?? {}}
          onChange={onResponsiveChange}
          onReset={onResponsiveReset}
        />
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5">
          <span
            className="truncate text-[7px] font-black uppercase tracking-[0.16em]"
            style={{ color: 'var(--bora-text-muted)' }}
          >
            {property.label}
          </span>

          {row.dirty && (
            <span
              title="Drafted"
              className="h-1 w-1 shrink-0 rounded-full"
              style={{ backgroundColor: 'var(--bora-gold)' }}
            />
          )}
        </div>

        {property.type === 'color' && (
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              aria-label={`${property.label} colour`}
              value={toSwatchColor(value)}
              onChange={(event) =>
                onChange(event.target.value)
              }
              className="h-6 w-7 shrink-0 cursor-pointer border p-0"
              style={{
                backgroundColor: 'var(--bora-background-deep)',
                borderColor: 'var(--bora-border)',
              }}
            />

            <input
              type="text"
              value={value}
              onChange={(event) =>
                onChange(event.target.value)
              }
              className={fieldClass}
              style={fieldStyle()}
            />
          </div>
        )}

        {(property.type === 'number' ||
          property.type === 'unit' ||
          property.type === 'duration') && (
          <NumberControl
            property={property}
            row={row}
            onChange={onChange}
          />
        )}

        {property.type === 'gradient' && (
          <GradientControl row={row} onChange={onChange} />
        )}

        {property.type === 'text' && (
          <input
            type="text"
            value={value}
            onChange={(event) =>
              onChange(event.target.value)
            }
            className={fieldClass}
            style={fieldStyle()}
          />
        )}

        {(property.type === 'select' ||
          property.type === 'easing') && (
          <div className="flex items-center gap-1.5">
            <select
              value={value}
              onChange={(event) =>
                onChange(event.target.value)
              }
              className={fieldClass}
              style={fieldStyle()}
            >
              {property.options?.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={value}
              onChange={(event) =>
                onChange(event.target.value)
              }
              className={fieldClass}
              style={fieldStyle()}
            />
          </div>
        )}

        {property.type === 'toggle' && (
          <button
            type="button"
            role="switch"
            aria-checked={value === 'true'}
            onClick={() =>
              onChange(value === 'true' ? 'false' : 'true')
            }
            className="flex h-6 w-11 items-center border px-0.5"
            style={{
              borderColor: 'var(--bora-border-strong)',
              backgroundColor: 'var(--bora-background-deep)',
            }}
          >
            <span
              className="h-4 w-4 transition-transform duration-200"
              style={{
                backgroundColor:
                  value === 'true'
                    ? 'var(--bora-gold)'
                    : 'var(--bora-border-strong)',
                transform:
                  value === 'true'
                    ? 'translateX(20px)'
                    : 'translateX(0)',
              }}
            />
          </button>
        )}
      </div>

      {onReset && row.dirty && (
        <button
          type="button"
          onClick={onReset}
          aria-label={`Reset ${property.label}`}
          title="Revert to source"
          className="mt-4 shrink-0 border px-1.5 py-1 text-[7px] font-black uppercase"
          style={{
            borderColor: 'var(--bora-border)',
            color: 'var(--bora-text-subtle)',
          }}
        >
          ↺
        </button>
      )}
    </div>
  );
}
