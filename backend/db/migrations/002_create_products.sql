-- ============================================================
-- 002_create_products.sql
-- Produtos do estoque. Cada produto tem uma unidade de medida
-- fixa — caixa de parafuso e saco de parafuso são produtos
-- distintos mesmo que sejam do mesmo item físico.
-- ============================================================

CREATE TABLE products (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sku        TEXT        NOT NULL,
  name       VARCHAR(150) NOT NULL,
  unit       VARCHAR(10) NOT NULL,
  image_url  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT products_sku_unique  UNIQUE (sku),
  CONSTRAINT products_unit_check  CHECK  (unit IN ('UN', 'CX', 'SC', 'PC', 'CT', 'PR', 'M'))
);

-- Busca de produto por SKU (muito frequente na importação de pedidos)
CREATE INDEX idx_products_sku  ON products (sku);
-- Busca por nome (autocomplete / pesquisa)
CREATE INDEX idx_products_name ON products USING gin (to_tsvector('portuguese', name));

COMMENT ON TABLE  products       IS 'Produtos do estoque. Unidade de medida é atributo do produto.';
COMMENT ON COLUMN products.unit  IS 'UN=Unidade, CX=Caixa, SC=Saco, PC=Peça, CT=Cartela, PR=Par, M=Metro.';
COMMENT ON COLUMN products.sku   IS 'Código único do produto. Usado na importação de DAVs (PDF).';
