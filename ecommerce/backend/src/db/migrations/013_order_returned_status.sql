ALTER TABLE orders MODIFY COLUMN status ENUM('confirmed', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returned') DEFAULT 'confirmed';
