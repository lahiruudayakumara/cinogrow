-- Add missing columns to plots table to match frontend expectations
ALTER TABLE plots ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PREPARING';
ALTER TABLE plots ADD COLUMN IF NOT EXISTS planting_date TIMESTAMP;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS expected_harvest_date TIMESTAMP;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS age_months INTEGER;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;

-- Add hybrid yield columns
ALTER TABLE plots ADD COLUMN IF NOT EXISTS total_trees INTEGER;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS stem_diameter_mm FLOAT;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS hybrid_yield_estimate FLOAT;