-- ============================================================
-- Migration 008 — itens DAV sem vínculo com catálogo (auditoria + resolução)
--
-- Motivação:
-- order_items.product_id é NOT NULL — itens DAV sem produto cadastrado
-- não podem ser persistidos lá. Esta tabela registra esses itens para que
-- o ADMIN possa, manualmente, decidir o destino (vincular, cadastrar ou ocultar).
-- ============================================================

CREATE TABLE IF NOT EXISTS unlinked_dav_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  raw_sku         TEXT,
  raw_description TEXT NOT NULL,
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  unit            VARCHAR(10),

  -- PENDING: aguardando ação do ADMIN
  -- LINKED:  resolvido — vinculado a produto existente OU cadastrado como novo
  -- HIDDEN:  ocultado no picking (rule criada em ignored_dav_items)
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING', 'LINKED', 'HIDDEN')),

  -- Quando o item foi vinculado, guarda o produto resolvido
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,

  -- Motivo da ocultação (se status=HIDDEN) ou observação livre
  resolution_note TEXT,

  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES users(id),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unlinked_dav_items_status   ON unlinked_dav_items(status);
CREATE INDEX IF NOT EXISTS idx_unlinked_dav_items_order_id ON unlinked_dav_items(order_id);
