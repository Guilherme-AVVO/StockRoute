-- ============================================================
-- 007_create_ignored_dav_items.sql
-- Regras cadastradas pelo ADMIN para ignorar automaticamente
-- itens do DAV que não exigem separação física no estoque.
--
-- Importante: esta tabela não apaga itens do histórico do pedido.
-- Ela apenas registra padrões que o parser/revisão deve usar para
-- classificar itens como ignorados no fluxo de picking.
-- ============================================================

CREATE TABLE IF NOT EXISTS ignored_dav_items (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_sku                TEXT,
  normalized_sku         TEXT,
  raw_description        TEXT,
  normalized_description TEXT,
  match_type             VARCHAR(30) NOT NULL,
  reason                 TEXT        NOT NULL,
  active                 BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by             UUID        NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ignored_dav_items_match_type_check
    CHECK (match_type IN ('SKU', 'DESCRIPTION', 'SKU_AND_DESCRIPTION')),

  -- Pelo menos uma chave normalizada precisa existir para comparação futura.
  CONSTRAINT ignored_dav_items_lookup_required_check
    CHECK (
      normalized_sku IS NOT NULL
      OR normalized_description IS NOT NULL
    ),

  -- Usuário ADMIN que cadastrou a regra. Não apagamos o usuário se houver auditoria.
  CONSTRAINT ignored_dav_items_created_by_fk
    FOREIGN KEY (created_by)
    REFERENCES users (id)
    ON DELETE RESTRICT
);

-- Lookup por SKU normalizado durante o processamento do DAV.
CREATE INDEX IF NOT EXISTS idx_ignored_dav_items_normalized_sku
  ON ignored_dav_items (normalized_sku);

-- Fallback por descrição normalizada quando o DAV não tiver SKU confiável.
CREATE INDEX IF NOT EXISTS idx_ignored_dav_items_normalized_description
  ON ignored_dav_items (normalized_description);

-- Filtro frequente: apenas regras ativas devem ser usadas pelo parser.
CREATE INDEX IF NOT EXISTS idx_ignored_dav_items_active
  ON ignored_dav_items (active);

-- Auditoria das regras criadas por ADMIN.
CREATE INDEX IF NOT EXISTS idx_ignored_dav_items_created_by
  ON ignored_dav_items (created_by);

COMMENT ON TABLE ignored_dav_items IS 'Regras para ignorar itens DAV que não exigem separação física no picking.';
COMMENT ON COLUMN ignored_dav_items.raw_sku IS 'SKU/código original extraído do DAV.';
COMMENT ON COLUMN ignored_dav_items.normalized_sku IS 'SKU/código normalizado para comparação automática.';
COMMENT ON COLUMN ignored_dav_items.raw_description IS 'Descrição original extraída do DAV, preservada para auditoria.';
COMMENT ON COLUMN ignored_dav_items.normalized_description IS 'Descrição normalizada usada como fallback de comparação.';
COMMENT ON COLUMN ignored_dav_items.match_type IS 'Tipo de correspondência: SKU, DESCRIPTION ou SKU_AND_DESCRIPTION.';
COMMENT ON COLUMN ignored_dav_items.reason IS 'Motivo informado pelo ADMIN para ignorar o item no picking.';
COMMENT ON COLUMN ignored_dav_items.active IS 'Permite desativar a regra sem apagar o histórico.';
COMMENT ON COLUMN ignored_dav_items.created_by IS 'Usuário ADMIN que cadastrou a regra.';
