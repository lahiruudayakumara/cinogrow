-- Add missing columns to plots table to match frontend expectations
ALTER TABLE plots ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PREPARING';
ALTER TABLE plots ADD COLUMN IF NOT EXISTS planting_date TIMESTAMP;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS expected_harvest_date TIMESTAMP;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS age_months INTEGER;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;