INSERT INTO wishlist_categories (slug, name, sort_order)
VALUES
  ('environment', 'Environment', 10),
  ('transport-mobility', 'Transport & Mobility', 20),
  ('public-spaces', 'Public Spaces', 30),
  ('health-wellness', 'Health & Wellness', 40),
  ('education', 'Education', 50),
  ('safety-resilience', 'Safety & Resilience', 60),
  ('digital-services', 'Digital Services', 70),
  ('livelihood', 'Livelihood', 80),
  ('accessibility', 'Accessibility', 90),
  ('culture-heritage', 'Culture & Heritage', 100),
  ('other', 'Other', 110)
ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order);
