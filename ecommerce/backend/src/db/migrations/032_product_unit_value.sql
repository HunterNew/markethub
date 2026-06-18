-- Add unit_value column for quantity per unit (e.g., 500 for 500ml)
ALTER TABLE products ADD COLUMN unit_value DECIMAL(10,2) NULL AFTER unit;
