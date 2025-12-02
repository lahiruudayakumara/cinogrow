-- Add seedling_count and cinnamon_variety columns to plots table
-- This aligns the database schema with UI expectations

-- Add seedling_count column
ALTER TABLE plots 
ADD COLUMN IF NOT EXISTS seedling_count INTEGER DEFAULT 0;

-- Add cinnamon_variety column  
ALTER TABLE plots 
ADD COLUMN IF NOT EXISTS cinnamon_variety VARCHAR(100) DEFAULT 'Ceylon Cinnamon';

-- Update existing records with default values if needed
UPDATE plots 
SET seedling_count = 0 
WHERE seedling_count IS NULL;

UPDATE plots 
SET cinnamon_variety = COALESCE(crop_type, 'Ceylon Cinnamon')
WHERE cinnamon_variety IS NULL OR cinnamon_variety = '';

-- Make columns NOT NULL after setting defaults
ALTER TABLE plots 
ALTER COLUMN seedling_count SET NOT NULL;

ALTER TABLE plots 
ALTER COLUMN cinnamon_variety SET NOT NULL;

-- Show the updated table structure
\d plots;