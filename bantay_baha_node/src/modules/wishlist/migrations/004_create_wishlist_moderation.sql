CREATE TABLE IF NOT EXISTS wishlist_moderation (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  wishlist_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(40) NOT NULL,
  reason VARCHAR(120) NULL,
  moderator_notes TEXT NULL,
  original_content JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_wishlist_moderation_item (wishlist_id, created_at),
  CONSTRAINT fk_wishlist_moderation_item FOREIGN KEY (wishlist_id) REFERENCES wishlist_items (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
