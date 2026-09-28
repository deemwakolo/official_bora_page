'use server';

import { createClient } from './supabase/server';

import {
  isBoraUIConfigEmpty,
  normalizeBoraUIConfig,
  BORA_UI_CONFIG_SCHEMA_VERSION,
  type BoraUIConfig,
} from '../app/components/ui-room/boraUIConfig';

import { BORA_UI_CONFIG_TABLE } from './ui-config';

/*
 * BORA UI ROOM — SAVE (commit boundary)
 *
 * Save Draft is the ONLY action that makes a UI change persistent.
 *
 * It normalises the draft against the registry first (unknown or
 * obsolete entries are dropped, never written), then commits it as
 * the runtime override. The checked-in file baseline is untouched —
 * code stays the default, the database is the live override.
 */

export interface SaveUIConfigResult {
  success: boolean;
  error?: string;
  /** Entries dropped during validation. */
  warnings?: string[];
  updatedAt?: string;
  updatedBy?: string;
}

export async function saveUIConfig(
  draft: unknown
): Promise<SaveUIConfigResult> {
  const warnings: string[] = [];
  const config: BoraUIConfig = normalizeBoraUIConfig(draft, warnings);

  if (isBoraUIConfigEmpty(config)) {
    return {
      success: false,
      error:
        'Nothing to save: the draft is empty. Editing a property creates a change to commit.',
    };
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error:
          'Unauthorized: you must be signed in as an administrator to commit UI config.',
      };
    }

    // `navigation` is written only when present. An absent key means
    // "canonical navigation", and omitting it keeps a v1-shaped
    // payload byte-identical to what the UI Room wrote before.
    const payload = {
      paletteId: config.paletteId,
      tokens: config.tokens,
      targets: config.targets,
      responsive: config.responsive,
      ...(config.navigation
        ? { navigation: config.navigation }
        : {}),
    };

    const { data, error } = await supabase.rpc(
      'save_ui_room_config',
      {
        p_config: payload,
        p_schema_version: BORA_UI_CONFIG_SCHEMA_VERSION,
      }
    );

    if (error) {
      return {
        success: false,
        error: `Commit failed: ${error.message}`,
        warnings,
      };
    }

    return {
      success: true,
      warnings,
      updatedAt:
        (data as { updatedAt?: string } | null)?.updatedAt,
      updatedBy:
        (data as { updatedBy?: string } | null)?.updatedBy,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Commit failed unexpectedly.',
      warnings,
    };
  }
}

/** Reads the committed override (admin only) for the UI Room. */
export async function getCommittedUIConfig(): Promise<{
  config: BoraUIConfig;
  exists: boolean;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from(BORA_UI_CONFIG_TABLE)
      .select('config, updated_at, updated_by')
      .eq('id', 'committed')
      .maybeSingle();

    if (error || !data) {
      return { config: normalizeBoraUIConfig(undefined), exists: false };
    }

    return {
      config: normalizeBoraUIConfig({
        ...(data.config as Record<string, unknown>),
        updatedAt: data.updated_at,
        updatedBy: data.updated_by,
      }),
      exists: true,
    };
  } catch {
    return { config: normalizeBoraUIConfig(undefined), exists: false };
  }
}
