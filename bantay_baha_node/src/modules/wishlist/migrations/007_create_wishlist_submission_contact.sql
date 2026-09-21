CREATE TABLE IF NOT EXISTS wishlist_submission_contact (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  wishlist_id BIGINT UNSIGNED NOT NULL,
  account_id BIGINT UNSIGNED NULL,
  consent_policy_version VARCHAR(40) NOT NULL,
  consent_wording_version VARCHAR(40) NOT NULL,
  consented_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wishlist_submission_contact_item (wishlist_id),
  CONSTRAINT fk_wishlist_submission_contact_item FOREIGN KEY (wishlist_id) REFERENCES wishlist_items (id),
  CONSTRAINT fk_wishlist_submission_contact_account FOREIGN KEY (account_id) REFERENCES wishlist_account (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
