-- ============================================================
-- Migration 016 — Campos para integração do picking do ESTOQUISTA.
--
-- Adiciona:
--   orders:
--     - delivery_date         → ordena pedidos por entrega mais próxima
--     - assigned_to           → estoquista responsável pela separação
--     - started_at            → quando o estoquista iniciou a separação
--     - finished_at           → quando o pedido foi finalizado
--     - aceitar status PICKING (em separação) e OBSERVATION (finalizado
--       com itens não encontrados)
--
--   order_items:
--     - confirmation_photo_url → foto tirada pelo estoquista ao coletar
--     - collected_at           → quando o item foi coletado
--     - not_found_reason       → motivo enumerado quando NAO_ENCONTRADO
--     - not_found_notes        → observação livre (obrigatória se motivo = OUTRO)
--
-- Garante: 1 pedido EM_SEPARACAO (PICKING) por estoquista, via índice único parcial.
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_date DATE,
  ADD COLUMN IF NOT EXISTS assigned_to   UUID,
  ADD COLUMN IF NOT EXISTS started_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finished_at   TIMESTAMPTZ;

-- FK separada para permitir IF NOT EXISTS em ALTER
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_assigned_to_fk'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_assigned_to_fk
      FOREIGN KEY (assigned_to)
      REFERENCES users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Expande a CHECK constraint de status para suportar PICKING e OBSERVATION
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('PENDING', 'IN_PROGRESS', 'PICKING', 'COMPLETED', 'OBSERVATION', 'CANCELLED'));

-- Apenas UM pedido PICKING por estoquista (garantia no banco).
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_one_picking_per_user
  ON orders (assigned_to)
  WHERE status = 'PICKING';

CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON orders (assigned_to);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders (delivery_date);

COMMENT ON COLUMN orders.delivery_date IS 'Data de entrega do pedido. Usada para ordenar pedidos disponíveis na fila do estoquista.';
COMMENT ON COLUMN orders.assigned_to   IS 'Estoquista responsável pela separação em andamento (NULL quando aguardando).';
COMMENT ON COLUMN orders.started_at    IS 'Quando o estoquista iniciou a separação (status passou para PICKING).';
COMMENT ON COLUMN orders.finished_at   IS 'Quando o pedido foi finalizado (COMPLETED ou OBSERVATION).';

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS confirmation_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS collected_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS not_found_reason       TEXT,
  ADD COLUMN IF NOT EXISTS not_found_notes        TEXT;

COMMENT ON COLUMN order_items.confirmation_photo_url IS 'Caminho público da foto tirada pelo estoquista ao confirmar a coleta. Distinto de products.image_url (foto de referência cadastrada pelo ADMIN).';
COMMENT ON COLUMN order_items.collected_at           IS 'Quando o item foi marcado como COLETADO (status = PICKED no banco).';
COMMENT ON COLUMN order_items.not_found_reason       IS 'Motivo enumerado quando o item foi marcado como NÃO ENCONTRADO (status = MISSING no banco).';
COMMENT ON COLUMN order_items.not_found_notes        IS 'Observação livre. Obrigatória quando o motivo é OUTRO.';
