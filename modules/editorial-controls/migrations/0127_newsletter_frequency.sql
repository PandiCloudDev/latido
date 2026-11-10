ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'weekly';
