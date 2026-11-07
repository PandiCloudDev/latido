CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  requested_at timestamptz NOT NULL DEFAULT now(),
  confirmation_hash text UNIQUE,
  confirmed_at timestamptz,
  unsubscribe_key uuid NOT NULL UNIQUE,
  CHECK ((confirmed_at IS NULL) = (confirmation_hash IS NOT NULL))
);
