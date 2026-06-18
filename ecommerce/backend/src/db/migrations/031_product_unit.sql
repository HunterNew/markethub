-- Add unit/measurement column to products
ALTER TABLE products ADD COLUMN unit VARCHAR(50) NULL AFTER weight_kg;
