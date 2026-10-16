'use client';

import React from 'react';

import Chart from './Chart/Chart';

import { createClient } from '@/lib/supabase/client';

import {
  castSecureVote,
  newIdempotencyKey,
} from '@/lib/supabase/secure-vote';

import { ingestAcceptedVoteEvent } from '@/app/actions';

import { useMasterSound } from './components-themes/haptics/MasterSound';
import { useMasterHaptics } from './components-themes/haptics/MasterHaptics';

/**
 * SECURE VOTING SWITCH (default OFF).
 *
 * The hardened cast_vote_secure path activates only when
 * NEXT_PUBLIC_BORA_SECURE_VOTING is exactly 'true'.
 */
const SECURE_VOTING =
  process.env.NEXT_PUBLIC_BORA_SECURE_VOTING === 'true';

interface Song {
  id: string;
  slot_number: number;
  title: string;
  artist: string;
  cover_url: string;
  momentum_score: number;
  yt_views: number;
  sp_plays: number;
}

const supabase = createClient();

export default function ChartWrapper({
  songs,
}: {
  songs: Song[];
}) {
  const { playVotePing, playShushaPing } = useMasterSound();
  const { voteHaptic, shushaHaptic } = useMasterHaptics();

  /**
   * Register the vote without inventing scores or ranks in the browser.
   * The displayed chart remains sourced from the incoming song data.
   */
  const handleVote = async (
    id: string,
    type: 'up' | 'down'
  ): Promise<boolean> => {
    // Immediate interaction feedback.
    if (type === 'up') {
      playVotePing();
      voteHaptic();
    } else {
      playShushaPing();
      shushaHaptic();
    }

    try {
      if (SECURE_VOTING) {
        const result = await castSecureVote({
          songId: id,
          voteType: type,
          idempotencyKey: newIdempotencyKey(),
        });

        if (!result.ok) {
          throw new Error(
            `SECURE_VOTE_FAILED: ${result.reason}${
              result.code ? ` (${result.code})` : ''
            }`
          );
        }

        // STEP 2 — best-effort Engine handoff AFTER the vote is committed.
        // `result.eventId` carries the canonical event ID for BOTH the
        // 'accepted' and the 'duplicate' outcome (an exact retry returns the
        // original committed event), so a previously failed handoff can be
        // re-delivered here. Delivery problems are logged only — they never
        // revert the accepted vote, decrement a counter, or surface a
        // vote-rejected result. The durable ingest RPC (`bora_engine_ingest_
        // vote_event`, Step 3) does not exist yet, so a pending delivery is
        // the expected state until it ships.
        if (result.eventId) {
          try {
            const delivery = await ingestAcceptedVoteEvent(result.eventId);

            if (!delivery.ok) {
              console.error(
                'BORA_ENGINE_DELIVERY_PENDING',
                result.eventId,
                delivery.reason,
              );
            }
          } catch (error) {
            console.error(
              'BORA_ENGINE_DELIVERY_PENDING',
              result.eventId,
              error,
            );
          }
        }
      } else {
        // Existing legacy path remains unchanged.
        const { error } = await supabase.rpc(
          'handle_song_vote',
          {
            song_id: id,
            vote_type: type,
          }
        );

        if (error) {
          throw error;
        }
      }

      console.log(
        `BORA_SIGNAL: ${type.toUpperCase()} registered for ID: ${id}`
      );

      return true;
    } catch (err) {
      console.error('MATITU_CORE_SYNC_FAILURE:', err);
      return false;
    }
  };

  return <Chart songs={songs} onVote={handleVote} />;
}