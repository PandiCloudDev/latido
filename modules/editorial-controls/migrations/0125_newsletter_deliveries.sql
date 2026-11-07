CREATE TABLE IF NOT EXISTS newsletter_deliveries (
  issue_key text NOT NULL,
  subscriber_id uuid NOT NULL REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'attempted' CHECK (status IN ('attempted', 'sent', 'failed')),
  PRIMARY KEY (issue_key, subscriber_id)
);
