-- Initial schema for the expense management system.

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL CHECK (char_length(btrim(name)) > 0),
  email         VARCHAR(254) NOT NULL CHECK (email = lower(email) AND position('@' IN email) > 1),
  password_hash TEXT         NOT NULL,
  role          VARCHAR(10)  NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE TABLE expenses (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100)  NOT NULL CHECK (char_length(btrim(name)) > 0),
  amount     NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date       DATE          NOT NULL,
  -- RESTRICT: a user's expenses are deleted explicitly, in the same transaction, before the user.
  user_id    INTEGER       NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Owner + date covers "my expenses, newest first" and per-user date filters.
CREATE INDEX expenses_user_id_date_idx ON expenses (user_id, date DESC, id DESC);
-- Date alone covers the admin-wide list and dashboard aggregation.
CREATE INDEX expenses_date_idx ON expenses (date DESC, id DESC);

CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expenses_set_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Session store used by connect-pg-simple.
CREATE TABLE user_sessions (
  sid    VARCHAR      NOT NULL PRIMARY KEY,
  sess   JSON         NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX user_sessions_expire_idx ON user_sessions (expire);
