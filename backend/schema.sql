-- Relojes App — esquema inicial de PostgreSQL (paso 1 del plan aprobado).
-- Compatible con PostgreSQL 16+.
-- Aplicar con: psql -d <NOMBRE_BD> -f backend/schema.sql
-- Decisión: la base de datos comienza SIN datos de ejemplo.
-- Las tablas deben quedar vacías tras aplicar este archivo.

-- ---------------------------------------------------------------------------
-- Usuarios
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE CHECK (length(trim(username)) > 0),
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('admin','owner')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Negocios (tiendas públicas)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Productos
-- - id numérico autogenerado (decisión D2: BIGINT GENERATED ALWAYS AS IDENTITY).
-- - price NUMERIC(12,2): admite decimales, igual que el formulario del panel.
-- - stock con CHECK >= 0: espejo de isValidStock del frontend (E6).
-- - image_url / image_public_id: preparados para Cloudinary (etapa posterior);
--   ambos nullable y sin más restricciones que el tipo TEXT.
-- - owner_id: propietario del inventario (multiusuario).
-- ---------------------------------------------------------------------------
CREATE TABLE products (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT          NOT NULL CHECK (length(trim(name))     > 0),
  category       TEXT          NOT NULL CHECK (length(trim(category)) > 0),
  price          NUMERIC(12,2) NOT NULL CHECK (price > 0),
  stock          INTEGER       NOT NULL DEFAULT 0 CHECK (stock >= 0),
  description    TEXT          NOT NULL DEFAULT '',
  image_url      TEXT          NULL,
  image_public_id TEXT         NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON products (category);
CREATE INDEX idx_products_owner ON products (owner_id);

-- ---------------------------------------------------------------------------
-- Movimientos de stock (historial inmutable, trazabilidad).
-- - product_id nullable con ON DELETE SET NULL: eliminar un producto conserva
--   su historial (la clave queda NULL y product_name mantiene el nombre
--   vigente al momento del movimiento).
-- - product_name es copia congelada; nunca se actualiza después del INSERT.
-- - Los CHECK espejan las validaciones del panel (type, quantity > 0,
--   reason <= 120 caracteres, igual que maxLength del formulario).
-- - owner_id: propietario del historial (multiusuario).
-- ---------------------------------------------------------------------------
CREATE TABLE stock_movements (
  id           BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id   BIGINT      NULL REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT        NOT NULL CHECK (length(trim(product_name)) > 0),
  type         TEXT        NOT NULL CHECK (type IN ('entrada', 'salida')),
  quantity     INTEGER     NOT NULL CHECK (quantity > 0),
  reason       TEXT        NOT NULL DEFAULT '' CHECK (length(reason) <= 120),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_movements_product    ON stock_movements (product_id);
CREATE INDEX idx_movements_created_at ON stock_movements (created_at DESC);
CREATE INDEX idx_movements_owner      ON stock_movements (owner_id);
