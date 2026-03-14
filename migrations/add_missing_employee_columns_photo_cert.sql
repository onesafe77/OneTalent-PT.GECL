-- Migration: Add missing employee columns (photo_url and sertifikat_os_url)
-- Safe to run multiple times (IF NOT EXISTS)

ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS sertifikat_os_url TEXT;
