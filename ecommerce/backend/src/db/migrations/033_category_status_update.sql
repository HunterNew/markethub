-- Add 'disabled' and 'rejected' to category status enum
ALTER TABLE categories MODIFY COLUMN status ENUM('active', 'pending', 'disabled', 'rejected') DEFAULT 'active';
