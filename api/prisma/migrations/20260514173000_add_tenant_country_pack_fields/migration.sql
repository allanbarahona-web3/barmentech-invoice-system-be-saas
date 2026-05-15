-- Phase 1 safe migration for fiscal-country expansion
-- Adds tenant-level country metadata without breaking existing rows.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS country_pack TEXT;

-- Safe backfill for existing tenants
UPDATE tenants
SET country_pack = COALESCE(country_pack, 'default')
WHERE country_pack IS NULL;

-- Optional defaults for new rows (country_code remains nullable and neutral)
ALTER TABLE tenants
  ALTER COLUMN country_code DROP DEFAULT,
  ALTER COLUMN country_pack SET DEFAULT 'default';
