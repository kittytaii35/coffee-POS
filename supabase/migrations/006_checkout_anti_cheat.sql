-- ============================================================
-- MIGRATION 006: Add Anti-Cheat fields for Check Out
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS check_out_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS check_out_longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS check_out_image TEXT;
