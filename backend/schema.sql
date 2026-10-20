-- Relojes App — esquema inicial de PostgreSQL (paso 1 del plan aprobado).
-- Compatible con PostgreSQL 16+.
-- Aplicar con: psql -d <NOMBRE_BD> -f backend/schema.sql
-- Decisión: la base de datos comienza SIN datos de ejemplo.
-- Las tablas deben quedar vacías tras aplicar este archivo.

-- ---------------------------------------------------------------------------
-- Productos
-- - id numérico autogenerado (decisión D2: BIGINT GENERATED ALWAYS AS IDENTITY).
-- - price NUMERIC(12,2): admite decimales, igual que el formulario del panel.
-- - stock con CHECK >= 0: espejo de isValidStock del frontend (E6).
-- - image_url / image_public_id: preparados para Cloudinary (etapa posterior);
--   ambos nullable y sin más restricciones que el tipo TEXT.
-- ---------------------------------------------------------------------------
CREATE TABLE products (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT          NOT NULL CHECK (length(trim(name))     > 0),
  category    TEXT          NOT NULL CHECK (length(trim(category)) > 0),
  price       NUMERIC(12,2) NOT NULL CHECK (price > 0),
  stock       INTEGER       NOT NULL DEFAULT 0 CHECK (stock >= 0),
  description TEXT          NOT NULL DEFAULT '',
  image_url        TEXT     NULL,
  image_public_id  TEXT     NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON products (category);

-- ---------------------------------------------------------------------------
-- Movimientos de stock (historial inmutable, trazabilidad).
-- - product_id nullable con ON DELETE SET NULL: eliminar un producto conserva
--   su historial (la clave queda NULL y product_name mantiene el nombre
--   vigente al momento del movimiento).
-- - product_name es copia congelada; nunca se actualiza después del INSERT.
-- - Los CHECK espejan las validaciones del panel (type, quantity > 0,
--   reason <= 120 caracteres, igual que maxLength del formulario).
-- ---------------------------------------------------------------------------
CREATE TABLE stock_movements (
  id           BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id   BIGINT      NULL REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT        NOT NULL CHECK (length(trim(product_name)) > 0),
  type         TEXT        NOT NULL CHECK (type IN ('entrada', 'salida')),
  quantity     INTEGER     NOT NULL CHECK (quantity > 0),
  reason       TEXT        NOT NULL DEFAULT '' CHECK (length(reason) <= 120),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_movements_product     ON stock_movements (product_id);
CREATE INDEX idx_movements_created_at  ON stock_movements (created_at DESC);
