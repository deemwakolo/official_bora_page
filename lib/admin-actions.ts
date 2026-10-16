import { revalidatePath } from 'next/cache';

import { createClient } from './supabase/server';
import { createPublicServerClient } from './supabase/public-server';
import { authorizeBoraAdministrator } from './administrator-authorization';

/**
 * FETCH REGISTRY (SAFE + STABLE)
 */
export async function getRegistry() {
  const getDiagnosticField = (source: unknown, field: string) => {
    if (typeof source !== 'object' || source === null) {
      return undefined;
    }

    const value = (source as Record<string, unknown>)[field];

    return typeof value === 'string' ||
      typeof value === 'number' ||
      value === null
      ? value
      : undefined;
  };

  try {
    const supabase = createPublicServerClient();

    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('slot_number', { ascending: true });

    if (error) {
      console.error(
        'Supabase Error:',
        {
          name: getDiagnosticField(error, 'name'),
          message: getDiagnosticField(error, 'message'),
          code: getDiagnosticField(error, 'code'),
          details: getDiagnosticField(error, 'details'),
          hint: getDiagnosticField(error, 'hint'),
          status: getDiagnosticField(error, 'status'),
        }
      );
      return [];
    }

    return data ?? [];
  } catch (error: unknown) {
    console.error(
      'Registry Fetch Error:',
      {
        name: getDiagnosticField(error, 'name'),
        message: getDiagnosticField(error, 'message'),
      }
    );
    return [];
  }
}

/**
 * UPDATE SLOT (HARDENED ENGINE VERSION)
 */
export async function updateSlot(
  formData: FormData
) {
  try {
    const supabase = await createClient();

    // ADMINISTRATOR AUTHORIZATION (server-side write boundary).
    // updateSlot performs an administrative upsert on the `songs`
    // chart registry. Only a verified site administrator may do this.
    // The identity is server-verified (auth.getUser) and matched
    // against the server-only BORA_ADMIN_USER_IDS allowlist; this
    // fails closed for unauthenticated and ordinary authenticated
    // callers.
    const authorization = await authorizeBoraAdministrator();
    if (authorization.status !== 'authorized') {
      return {
        success: false,
        error:
          'Unauthorized: administrator access is required to update a chart slot.',
      };
    }

    const rawSlot =
      formData.get('slot_number');

    if (!rawSlot) {
      throw new Error(
        'Missing slot number'
      );
    }

    const slot_number = Number(rawSlot);

    // STRICT VALIDATION
    if (
      !Number.isInteger(slot_number) ||
      slot_number <= 0
    ) {
      throw new Error(
        'Invalid slot number'
      );
    }

    const title = String(
      formData.get('title') ||
        'Empty Slot'
    );

    const artist = String(
      formData.get('artist') ||
        'Matitu Nation'
    );

    const yt_views_raw =
      formData.get('yt_views');

    const sp_plays_raw =
      formData.get('sp_plays');

    const momentum_raw =
      formData.get('momentum_score');

    // STRICT NUMBER CHECK
    const yt_views =
      Number(yt_views_raw);

    const sp_plays =
      Number(sp_plays_raw);

    const momentum_score =
      Number(momentum_raw);

    if (
      [
        yt_views,
        sp_plays,
        momentum_score,
      ].some((v) =>
        Number.isNaN(v)
      )
    ) {
      throw new Error(
        'Invalid numeric metrics provided'
      );
    }

    let cover_url = String(
      formData.get(
        'existing_cover_url'
      ) || ''
    );

    const file =
      formData.get('cover') as
        | File
        | null;

    // UPLOAD FIRST
    if (
      file &&
      file.size > 0
    ) {
      const fileExt =
        file.name
          .split('.')
          .pop();

      const fileName =
        `slot_${slot_number}_${Date.now()}.${fileExt}`;

      const filePath =
        `covers/${fileName}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from('bora-assets')
        .upload(
          filePath,
          file,
          {
            upsert: true,
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: urlData,
      } =
        supabase.storage
          .from('bora-assets')
          .getPublicUrl(
            filePath
          );

      cover_url =
        urlData.publicUrl;
    }

    // DB WRITE (privileged RPC). Migration 0019 revokes direct table
    // writes on `songs` from anon/authenticated, so the administrative
    // upsert goes through the SECURITY DEFINER `admin_upsert_song`, which
    // enforces the administrator claim itself and preserves the
    // ON CONFLICT (slot_number) upsert semantics.
    const {
      data,
      error,
    } = await supabase.rpc(
      'admin_upsert_song',
      {
        p_slot_number: slot_number,
        p_title: title,
        p_artist: artist,
        p_yt_views: yt_views,
        p_sp_plays: sp_plays,
        p_momentum_score: momentum_score,
        p_cover_url: cover_url,
      }
    );

    if (error) {
      throw error;
    }

    // REFRESH UI
    revalidatePath('/');

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    console.error(
      'Action Error:',
      err.message
    );

    return {
      success: false,
      error: err.message,
    };
  }
}