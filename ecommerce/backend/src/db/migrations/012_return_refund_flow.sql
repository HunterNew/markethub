ALTER TABLE return_requests ADD COLUMN proof_image_url VARCHAR(500) NULL AFTER reason;
ALTER TABLE return_requests MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'refund_pending', 'refunded') DEFAULT 'pending';
ALTER TABLE return_requests ADD COLUMN refund_amount DECIMAL(10,2) NULL;
ALTER TABLE return_requests ADD COLUMN refund_requested_at DATETIME NULL;
ALTER TABLE return_requests ADD COLUMN refund_completed_at DATETIME NULL;
ALTER TABLE return_requests ADD COLUMN admin_note TEXT NULL;
