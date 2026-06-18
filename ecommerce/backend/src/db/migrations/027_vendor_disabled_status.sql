-- Add 'disabled' to vendor status enum
ALTER TABLE vendors MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'disabled') DEFAULT 'pending';
