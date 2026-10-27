-- ============================================================
-- BORA ENGINE — CONSOLIDATED RECONCILIATION MIGRATION 0025
-- Idempotently ensures all BORA Engine tables, ledgers, and columns exist.
-- ============================================================

-- 1. Ensure vote events provenance columns exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bora_engine_vote_events' AND column_name = 'idempotency_key') THEN
        ALTER TABLE public.bora_engine_vote_events ADD COLUMN idempotency_key text not null default '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bora_engine_vote_events' AND column_name = 'source_identity_method') THEN
        ALTER TABLE public.bora_engine_vote_events ADD COLUMN source_identity_method text not null default 'server';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bora_engine_vote_events' AND column_name = 'source_identity_version') THEN
        ALTER TABLE public.bora_engine_vote_events ADD COLUMN source_identity_version integer not null default 1;
    END IF;
END $$;

-- 2. Ensure platform observations columns exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bora_engine_platform_observations' AND column_name = 'metric_type') THEN
        ALTER TABLE public.bora_engine_platform_observations ADD COLUMN metric_type text not null default 'views';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bora_engine_platform_observations' AND column_name = 'source_observation_id') THEN
        ALTER TABLE public.bora_engine_platform_observations ADD COLUMN source_observation_id text;
    END IF;
END $$;

-- 3. Ensure hourly input coverage columns exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bora_engine_hourly_input_coverage' AND column_name = 'derived_delta') THEN
        ALTER TABLE public.bora_engine_hourly_input_coverage ADD COLUMN derived_delta bigint not null default 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bora_engine_hourly_input_coverage' AND column_name = 'evidence_id') THEN
        ALTER TABLE public.bora_engine_hourly_input_coverage ADD COLUMN evidence_id text;
    END IF;
END $$;

-- 4. Ensure songs table has youtube_id mapping if not present
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'songs' AND column_name = 'youtube_id') THEN
        ALTER TABLE public.songs ADD COLUMN youtube_id text;
    END IF;
END $$;
