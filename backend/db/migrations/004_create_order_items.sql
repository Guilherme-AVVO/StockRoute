-- ============================================================
-- 004_create_order_items.sql
-- Itens de cada pedido. Cada item aponta para um produto e
-- rastreia quantidades pedidas, separadas e faltantes.
--
-- Regra de consistência:
--   picked_quantity + missing_quantity <= quantity
-- Esta regra é validada no backend E reforçada aqui via CHECK,
-- garantindo integridade dupla contra inconsistências.
-- ============================================================

CREATE TABLE IF NOT EXISTS order_items (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID        NOT NULL,
  product_id       UUID        NOT NULL,
  quantity         INTEGER     NOT NULL,
  picked_quantity  INTEGER     NOT NULL DEFAULT 0,
  missing_quantity INTEGER     NOT NULL DEFAULT 0,
  status           VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Chave estrangeira: itens são deletados junto com o pedido
  CONSTRAINT order_items_order_fk
    FOREIGN KEY (order_id)
    REFERENCES orders (id)
    ON DELETE CASCADE,

  -- Chave estrangeira: produto não pode ser deletado se tiver itens de pedido
  CONSTRAINT order_items_product_fk
    FOREIGN KEY (product_id)
    REFERENCES products (id)
    ON DELETE RESTRICT,

  CONSTRAINT order_items_status_check
    CHECK (status IN ('PENDING', 'PICKED', 'PARTIAL', 'MISSING')),

  -- Quantidades nunca negativas
  CONSTRAINT order_items_quantity_positive
    CHECK (quantity > 0),
  CONSTRAINT order_items_picked_non_negative
    CHECK (picked_quantity >= 0),
  CONSTRAINT order_items_missing_non_negative
    CHECK (missing_quantity >= 0),

  -- Consistência: soma não pode ultrapassar o pedido
  CONSTRAINT order_items_quantities_consistent
    CHECK (picked_quantity + missing_quantity <= quantity)
);

-- Busca de todos os itens de um pedido (query mais frequente do sistema)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON order_items (order_id);
-- Join com produtos
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);
-- Filtro por status de item
CREATE INDEX IF NOT EXISTS idx_order_items_status     ON order_items (status);

COMMENT ON TABLE  order_items                  IS 'Itens de separação de cada pedido. Um pedido tem 1..N itens.';
COMMENT ON COLUMN order_items.quantity         IS 'Quantidade total pedida (unidade definida pelo produto).';
COMMENT ON COLUMN order_items.picked_quantity  IS 'Quantidade efetivamente separada.';
COMMENT ON COLUMN order_items.missing_quantity IS 'Quantidade não encontrada no estoque.';
COMMENT ON COLUMN order_items.status           IS 'PENDING, PICKED (100%), PARTIAL (parcial), MISSING (zero separado).';
