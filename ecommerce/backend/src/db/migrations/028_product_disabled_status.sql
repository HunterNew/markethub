-- Add 'disabled' to product status enum
ALTER TABLE products MODIFY COLUMN status ENUM('pending_approval', 'active', 'rejected', 'deleted', 'out_of_stock', 'disabled') DEFAULT 'pending_approval';
