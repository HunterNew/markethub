-- Add 'disabled' to brand status enum
ALTER TABLE brands MODIFY COLUMN status ENUM('active', 'disabled') DEFAULT 'active';
