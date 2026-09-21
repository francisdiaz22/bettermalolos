CREATE TABLE IF NOT EXISTS wishlist_lgu_handoff (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  wishlist_id BIGINT UNSIGNED NOT NULL,
  office_name VARCHAR(180) NOT NULL,
  delivery_method VARCHAR(80) NOT NULL,
  delivered_at DATETIME(3) NOT NULL,
  reference_url VARCHAR(500) NULL,
  response_status VARCHAR(40) NULL,
  response_note TEXT NULL,
  PRIMARY KEY (id),
  KEY ix_wishlist_lgu_handoff_item (wishlist_id, delivered_at),
  CONSTRAINT fk_wishlist_lgu_handoff_item FOREIGN KEY (wishlist_id) REFERENCES wishlist_items (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
