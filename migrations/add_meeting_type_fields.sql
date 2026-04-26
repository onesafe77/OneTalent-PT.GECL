-- Add meeting type, agenda, and pemateri fields to meetings table
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_type VARCHAR DEFAULT 'internal';
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS agenda TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS pemateri VARCHAR;
