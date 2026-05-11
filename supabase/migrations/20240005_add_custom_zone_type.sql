-- Add "custom" value to zone_type enum
ALTER TYPE zone_type ADD VALUE IF NOT EXISTS 'custom';
