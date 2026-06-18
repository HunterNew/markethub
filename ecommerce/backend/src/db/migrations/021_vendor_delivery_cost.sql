ALTER TABLE vendors ADD COLUMN delivery_type ENUM('per_product', 'per_kg') DEFAULT 'per_product';
ALTER TABLE vendors ADD COLUMN delivery_charge_per_product DECIMAL(10,2) DEFAULT 0;
ALTER TABLE vendors ADD COLUMN delivery_charge_per_kg DECIMAL(10,2) DEFAULT 0;
ALTER TABLE vendors ADD COLUMN free_delivery_above DECIMAL(10,2) NULL;

ALTER TABLE products ADD COLUMN weight_kg DECIMAL(5,2) NULL;
