-- ============================================================
-- 006_create_missing_items.sql
-- Registro de itens faltantes com motivo em texto livre.
-- Todo item com missing_quantity > 0 deve ter ao menos um
-- registro aqui (validado no backend).
-- ============================================================

CREATE TABLE missing_items (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID        NOT NULL,
  reason        TEXT        NOT NULL,
  created_by    UUID        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Registros de faltantes são deletados junto com o item
  CONSTRAINT missing_items_order_item_fk
    FOREIGN KEY (order_item_id)
    REFERENCES order_items (id)
    ON DELETE CASCADE,

  -- Usuário não pode ser deletado enquanto tiver registros de faltantes
  CONSTRAINT missing_items_user_fk
    FOREIGN KEY (created_by)
    REFERENCES users (id)
    ON DELETE RESTRICT
);

-- Busca de faltantes por item
CREATE INDEX idx_missing_items_order_item_id ON missing_items (order_item_id);
-- Auditoria: faltantes registrados por usuário
CREATE INDEX idx_missing_items_created_by    ON missing_items (created_by);

COMMENT ON TABLE  missing_items               IS 'Registros de itens não encontrados durante a separação, com motivo obrigatório.';
COMMENT ON COLUMN missing_items.order_item_id IS 'Item do pedido ao qual o registro pertence.';
COMMENT ON COLUMN missing_items.reason        IS 'Motivo em texto livre (sem enum). Ex: "Produto esgotado", "Não localizado".';
COMMENT ON COLUMN missing_items.created_by    IS 'Usuário que registrou o item faltante.';
