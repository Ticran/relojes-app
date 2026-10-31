BEGIN;

CREATE TABLE businesses (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id      BIGINT      NOT NULL,
  slug          TEXT        NOT NULL,
  name          TEXT        NOT NULL CHECK (length(trim(name)) > 0),
  description   TEXT        NOT NULL DEFAULT '',
  logo_url      TEXT        NULL,
  cover_url     TEXT        NULL,
  primary_color TEXT        NOT NULL DEFAULT '#9e4a5a'
                            CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  is_published  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT businesses_owner_id_key UNIQUE (owner_id),
  CONSTRAINT businesses_slug_key UNIQUE (slug),
  CONSTRAINT businesses_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT businesses_slug_check CHECK (
    char_length(slug) <= 100
    AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    AND slug NOT IN ('admin', 'login', 'api', 'tienda')
  ),
  CONSTRAINT businesses_published_data_check CHECK (
    NOT is_published
    OR (
      length(trim(name)) > 0
      AND char_length(slug) <= 100
      AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      AND slug NOT IN ('admin', 'login', 'api', 'tienda')
    )
  )
);

COMMIT;
