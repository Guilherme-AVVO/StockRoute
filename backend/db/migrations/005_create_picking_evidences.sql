-- ============================================================
-- 005_create_picking_evidences.sql
-- Evidências fotográficas da separação. Um item pode ter zero
-- ou mais fotos. O limite de fotos por item é definido no backend.
-- ============================================================

CREATE TABLE picking_evidences (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID        NOT NULL,
  image_url     TEXT        NOT NULL,
  created_by    UUID        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Evidências são deletadas junto com o item
  CONSTRAINT picking_evidences_order_item_fk
    FOREIGN KEY (order_item_id)
    REFERENCES order_items (id)
    ON DELETE CASCADE,

  -- Usuário não pode ser deletado enquanto tiver evidências registradas
  CONSTRAINT picking_evidences_user_fk
    FOREIGN KEY (created_by)
    REFERENCES users (id)
    ON DELETE RESTRICT
);

-- Busca de todas as evidências de um item (query direta)
CREATE INDEX idx_picking_evidences_order_item_id ON picking_evidences (order_item_id);
-- Auditoria: evidências criadas por um usuário
CREATE INDEX idx_picking_evidences_created_by    ON picking_evidences (created_by);

COMMENT ON TABLE  picking_evidences               IS 'Fotos tiradas durante a separação de um item do pedido.';
COMMENT ON COLUMN picking_evidences.order_item_id IS 'Item ao qual a foto pertence.';
COMMENT ON COLUMN picking_evidences.created_by    IS 'Usuário (estoquista) que registrou a evidência.';
COMMENT ON COLUMN picking_evidences.image_url     IS 'URL da imagem armazenada (ex: S3, Supabase Storage, etc.).';
