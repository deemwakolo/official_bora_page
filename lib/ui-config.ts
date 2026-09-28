import { promises as fs } from 'fs';
import path from 'path';

import { createClient } from './supabase/server';

import {
  boraUIConfigToCss,
  EMPTY_BORA_UI_CONFIG,
  isBoraUIConfigEmpty,
  normalizeBoraUIConfig,
  type BoraUIConfig,
} from '../app/components/ui-room/boraUIConfig';

/*
 * BORA UI ROOM — CONFIG RESOLUTION (server only, model (c))
 *
 *   checked-in FILE  ->  baseline
 *   Supabase row     ->  runtime OVERRIDE
 *   failure          ->  baseline (never a broken page)
 *
 * Everything here is fail-safe: any error, missing file, missing row
 * or network problem resolves to the file baseline. The public site
 * must NEVER fail to render because of editor configuration.
 */

const CONFIG_FILE = 'bora-ui.config.json';
const COMMITTED_ROW_ID = 'committed';

export const BORA_UI_CONFIG_TABLE = 'ui_room_config';

async function loadFileConfig(): Promise<BoraUIConfig> {
  try {
    const filePath = path.join(process.cwd(), CONFIG_FILE);
    const raw = await fs.readFile(filePath, 'utf8');

    return normalizeBoraUIConfig(JSON.parse(raw));
  } catch (error) {
    // A missing or malformed baseline must not break the app.
    console.error(
      '[ui-config] baseline file unavailable, using defaults:',
      error instanceof Error ? error.message : error
    );

    return { ...EMPTY_BORA_UI_CONFIG };
  }
}

async function loadOverrideConfig(): Promise<BoraUIConfig | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from(BORA_UI_CONFIG_TABLE)
      .select('config, updated_at, updated_by')
      .eq('id', COMMITTED_ROW_ID)
      .maybeSingle();

    if (error || !data) return null;

    const config = normalizeBoraUIConfig({
      ...(data.config as Record<string, unknown>),
      updatedAt: data.updated_at,
      updatedBy: data.updated_by,
    });

    return isBoraUIConfigEmpty(config) ? null : config;
  } catch (error) {
    // Offline / table missing / RLS — fall back to the file.
    console.error(
      '[ui-config] override unavailable, using baseline:',
      error instanceof Error ? error.message : error
    );

    return null;
  }
}

/**
 * Baseline merged with the override (override wins).
 *
 * MERGE SHAPES DIFFER BY KEY, deliberately:
 *   tokens / targets / responsive -> per-key shallow spread, so a
 *     committed override can adjust ONE target without erasing the
 *     rest of the file baseline.
 *   navigation -> WHOLESALE REPLACE, not a spread. It is a single
 *     structural instruction, and a per-key spread would let a
 *     baseline `hidden` survive an override that only sets `labels`.
 */
export async function resolveBoraUIConfig(): Promise<BoraUIConfig> {
  const baseline = await loadFileConfig();
  const override = await loadOverrideConfig();

  if (!override) return baseline;

  return normalizeBoraUIConfig({
    schemaVersion: override.schemaVersion,
    paletteId: override.paletteId ?? baseline.paletteId,
    tokens: { ...baseline.tokens, ...override.tokens },
    targets: { ...baseline.targets, ...override.targets },
    responsive: { ...baseline.responsive, ...override.responsive },
    navigation: override.navigation ?? baseline.navigation,
    updatedAt: override.updatedAt,
    updatedBy: override.updatedBy,
  });
}

/** CSS to inject into the document head ('' when inert). */
export async function resolveBoraUIConfigCss(): Promise<string> {
  return boraUIConfigToCss(await resolveBoraUIConfig());
}
