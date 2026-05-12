-- Migration 004: Product Variants support

-- Option types for a product (e.g., "Size", "Color")
CREATE TABLE IF NOT EXISTS variant_option_types (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_product_option (product_id, name)
);

-- Values for each option type (e.g., "S", "M", "L")
CREATE TABLE IF NOT EXISTS variant_option_values (
  id INT PRIMARY KEY AUTO_INCREMENT,
  option_type_id INT NOT NULL,
  value VARCHAR(100) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  FOREIGN KEY (option_type_id) REFERENCES variant_option_types(id) ON DELETE CASCADE,
  UNIQUE KEY unique_type_value (option_type_id, value)
);

-- Purchasable variant combinations
CREATE TABLE IF NOT EXISTS product_variants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  option_combination JSON NOT NULL COMMENT '{"Size":"M","Color":"Red"}',
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  sku VARCHAR(100) NULL,
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  KEY idx_product_active (product_id, is_active)
);

-- cart_items: add variant reference
ALTER TABLE cart_items
  ADD COLUMN variant_id INT NULL AFTER product_id,
  ADD FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;

ALTER TABLE cart_items
  ADD UNIQUE KEY unique_cart_product_variant (cart_id, product_id, variant_id);

-- order_items: add variant reference and snapshot
ALTER TABLE order_items
  ADD COLUMN variant_id INT NULL AFTER product_id,
  ADD COLUMN variant_snapshot JSON NULL COMMENT '{"Size":"M","Color":"Red","price":599}',
  ADD FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;

-- products: add has_variants flag
ALTER TABLE products
  ADD COLUMN has_variants BOOLEAN DEFAULT false AFTER wholesale_min_qty;
