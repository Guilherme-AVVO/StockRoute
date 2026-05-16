-- ============================================================
-- Migration 013 — Suportar reaplicação de regras de ocultação
--   em itens DAV/pedidos já existentes.
--
-- 1) order_items ganha colunas para representar ocultação por regra
--    (itens com produto vinculado que passam a bater uma regra após
--     o pedido já ter sido importado).
--
-- 2) unlinked_dav_items ganha hidden_manually para diferenciar
--    ocultação manual feita pelo ADMIN (preservada pela reaplicação)
--    da ocultação automática causada por regra (reavaliada).
-- ============================================================

-- 1) order_items: campos de ocultação por regra
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS hidden          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ignored_rule_id UUID,
  ADD COLUMN IF NOT EXISTS hide_reason     TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_items_ignored_rule_fk'
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT order_items_ignored_rule_fk
      FOREIGN KEY (ignored_rule_id)
      REFERENCES ignored_dav_items(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_order_items_hidden ON order_items (hidden);

COMMENT ON COLUMN order_items.hidden          IS 'TRUE quando o item está oculto por regra de ocultação ativa (não vai para picking).';
COMMENT ON COLUMN order_items.ignored_rule_id IS 'FK opcional para a regra que ocultou o item (auditoria).';
COMMENT ON COLUMN order_items.hide_reason     IS 'Motivo textual gravado no momento da ocultação por regra.';

-- 2) unlinked_dav_items: distinguir oculto manualmente vs por regra
ALTER TABLE unlinked_dav_items
  ADD COLUMN IF NOT EXISTS hidden_manually BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN unlinked_dav_items.hidden_manually IS 'TRUE quando o ADMIN ocultou explicitamente este item específico. A reaplicação de regras nunca desfaz uma ocultação manual.';
