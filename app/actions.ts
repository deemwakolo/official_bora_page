'use server';

import { revalidatePath } from 'next/cache';

type PulseType = 'up' | 'down';

interface PulseResult {
  success: boolean;
  error?: string;
}

/**
 * handleVoteAction
 * BORA PULSE ENGINE (Server Action Layer)
 * Handles voting events + triggers cache invalidation.
 */
export async function handleVoteAction(
  songId: string,
  type: PulseType
): Promise<PulseResult> {
  const timestamp = new Date().toISOString();

  try {
    // 🧠 STRUCTURED EVENT LOG (future analytics-ready)
    console.log(
      JSON.stringify({
        event: 'BORA_PULSE',
        songId,
        type,
        timestamp,
      })
    );

    // 🚧 PLACEHOLDER: RATE LIMIT CHECK (future upgrade)
    // Example: prevent spam voting per IP / user session
    // if (await isRateLimited(songId)) {
    //   return { success: false, error: 'Rate limit exceeded' };
    // }

    // 🗄️ DATABASE LAYER HOOK (future Supabase / Prisma / etc.)
    // Keep isolated so you don't mix logic with framework code
    // Example:
    // await db.registry.update({
    //   where: { id: songId },
    //   data: {
    //     votes: { increment: type === 'up' ? 1 : -1 }
    //   }
    // });

    // 🔄 CACHE INVALIDATION (live chart refresh)
    revalidatePath('/');

    return { success: true };
  } catch (error: unknown) {
    console.error('BORA_PULSE_ERROR:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown failure',
    };
  }
}