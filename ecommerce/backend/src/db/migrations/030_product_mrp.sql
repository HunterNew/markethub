-- Add MRP column to products table
ALTER TABLE products ADD COLUMN mrp DECIMAL(10,2) NULL AFTER price;
