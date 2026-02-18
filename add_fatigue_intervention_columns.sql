-- Add intervention columns to sidak_fatigue_records
-- Author: Assistant
-- Date: 2026-02-17

ALTER TABLE sidak_fatigue_records 
ADD COLUMN IF NOT EXISTS catatan_intervensi TEXT;

ALTER TABLE sidak_fatigue_records 
ADD COLUMN IF NOT EXISTS bukti_intervensi TEXT;

-- Create index on bukti_intervensi for faster lookups if needed (optional)
CREATE INDEX IF NOT EXISTS "IDX_fatigue_records_intervention" ON sidak_fatigue_records(bukti_intervensi);
