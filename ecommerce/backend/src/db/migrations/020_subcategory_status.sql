ALTER TABLE categories ADD COLUMN status ENUM('active', 'pending') DEFAULT 'active';
ALTER TABLE categories ADD COLUMN created_by_vendor_id INT NULL;
