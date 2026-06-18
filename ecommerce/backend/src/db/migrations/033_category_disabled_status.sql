-- Add 'disabled' to category status enum
ALTER TABLE categories MODIFY COLUMN status ENUM('active', 'pending', 'rejected', 'disabled') DEFAULT 'active';
