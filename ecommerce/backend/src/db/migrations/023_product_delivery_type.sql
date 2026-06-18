ALTER TABLE products ADD COLUMN delivery_type ENUM('vendor_default', 'per_product', 'per_kg') DEFAULT 'vendor_default';
ALTER TABLE products ADD COLUMN delivery_charge DECIMAL(10,2) NULL;
