ALTER TABLE vendors ADD COLUMN delivery_days INT DEFAULT 5;
ALTER TABLE orders ADD COLUMN expected_delivery_date DATE NULL;
