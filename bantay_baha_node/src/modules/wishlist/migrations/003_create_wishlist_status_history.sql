CREATE TABLE IF NOT EXISTS wishlist_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  wishlist_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(40) NULL,
  to_status VARCHAR(40) NOT NULL,
  notes TEXT NULL,
  reference_url VARCHAR(500) NULL,
  changed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_wishlist_status_history_item (wishlist_id, changed_at),
  CONSTRAINT fk_wishlist_status_history_item FOREIGN KEY (wishlist_id) REFERENCES wishlist_items (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
