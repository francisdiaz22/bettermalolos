CREATE TABLE IF NOT EXISTS wishlist_support (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  wishlist_id BIGINT UNSIGNED NOT NULL,
  account_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_wishlist_support_once (wishlist_id, account_id),
  CONSTRAINT fk_wishlist_support_item FOREIGN KEY (wishlist_id) REFERENCES wishlist_items (id),
  CONSTRAINT fk_wishlist_support_account FOREIGN KEY (account_id) REFERENCES wishlist_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
