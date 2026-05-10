-- ============================================================
-- 003_create_orders.sql
-- Pedidos importados via PDF (DAV). Cada pedido tem um número
-- único e rastreia o PDF original que lhe deu origem.
-- ============================================================

CREATE TABLE orders (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number  VARCHAR(50)  NOT NULL,
  customer_name VARCHAR(150) NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
  pdf_url       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT orders_order_number_unique UNIQUE (order_number),
  CONSTRAINT orders_status_check        CHECK  (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))
);

-- Lookup por número do pedido (já coberto pela constraint UNIQUE)
-- Filtro por status (listagens do painel, muito frequente)
-- Filtro por status (listagens do painel, muito frequente)
CREATE INDEX idx_orders_status             ON orders (status);
-- Ordenação padrão por data de criação
CREATE INDEX idx_orders_created_at         ON orders (created_at DESC);

COMMENT ON TABLE  orders              IS 'Pedidos importados de DAVs (PDFs). Um pedido agrupa itens a serem separados.';
COMMENT ON COLUMN orders.order_number IS 'Número único do pedido extraído do DAV.';
COMMENT ON COLUMN orders.pdf_url      IS 'URL do PDF original armazenado. Opcional no banco; backend valida obrigatoriedade por fluxo.';
COMMENT ON COLUMN orders.status       IS 'PENDING=Aguardando, IN_PROGRESS=Em separação, COMPLETED=Concluído, CANCELLED=Cancelado.';
