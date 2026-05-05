-- ============================================================
-- MIGRATION 004: Add force_checkout_note column
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS force_checkout_note TEXT;
