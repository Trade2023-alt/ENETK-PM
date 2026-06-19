-- README
-- ============================================================================
-- Migration: add_sub_task_notes
--
-- This migration adds a `sub_task_notes` table that stores timestamped notes
-- attached to individual sub-tasks. Notes are linked both to the sub-task and
-- to the parent job so the combined Job Notes view can show job-level notes and
-- sub-task notes together in a single tiered timeline.
--
-- HOW TO RUN:
-- This project uses Supabase. Apply this migration by opening the Supabase
-- dashboard for your project, going to the SQL Editor, pasting the SQL below,
-- and clicking "Run". It is safe to run more than once (all statements use
-- IF NOT EXISTS).
-- ============================================================================

CREATE TABLE IF NOT EXISTS sub_task_notes (
    id BIGSERIAL PRIMARY KEY,
    sub_task_id BIGINT NOT NULL REFERENCES sub_tasks(id) ON DELETE CASCADE,
    job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_task_notes_sub_task_id ON sub_task_notes(sub_task_id);
CREATE INDEX IF NOT EXISTS idx_sub_task_notes_job_id ON sub_task_notes(job_id);
CREATE INDEX IF NOT EXISTS idx_sub_task_notes_created_at ON sub_task_notes(created_at DESC);
