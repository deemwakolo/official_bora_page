-- ============================================================================
-- Migration: 0024_update_test_song_youtube_id.sql
-- Description: Binds a verified YouTube ID to the test song for Stage 03 verification.
-- ============================================================================

UPDATE public.songs
SET youtube_id = 'kJQP7kiw5Fk',
    updated_at = NOW()
WHERE id = '2a850219-819b-4ec6-b07f-eefe6c50acc0';
