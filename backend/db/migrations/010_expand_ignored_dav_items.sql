-- ============================================================
-- Migration 010 — Regras de ocultação por padrão + rastreio de itens ocultos
--
-- Mudanças:
-- 1. Expande match_type para incluir CONTAINS, PREFIX, MANUFACTURER_*.
-- 2. Adiciona manufacturer_reference / manufacturer_name em ignored_dav_items
--    para permitir regras por referência ou fabricante.
-- 3. Adiciona ignored_rule_id em unlinked_dav_items para rastrear qual
--    regra ocultou cada item (auditoria).
-- 4. Relaxa a CHECK constraint de lookup_required para aceitar regras
--    baseadas em manufacturer_reference / manufacturer_name.
-- ============================================================

-- 1) Adiciona colunas manufacturer_* em ignored_dav_items
ALTER TABLE ignored_dav_items
  ADD COLUMN IF NOT EXISTS manufacturer_reference TEXT,
  ADD COLUMN IF NOT EXISTS manufacturer_name      TEXT;

-- 2) Substitui CHECK do match_type por versão expandida
ALTER TABLE ignored_dav_items
  DROP CONSTRAINT IF EXISTS ignored_dav_items_match_type_check;

ALTER TABLE ignored_dav_items
  ADD CONSTRAINT ignored_dav_items_match_type_check
  CHECK (match_type IN (
    'SKU',
    'DESCRIPTION',
    'SKU_AND_DESCRIPTION',
    'SKU_CONTAINS',
    'DESCRIPTION_CONTAINS',
    'SKU_PREFIX',
    'MANUFACTURER_REFERENCE',
    'MANUFACTURER_REFERENCE_CONTAINS',
    'MANUFACTURER_NAME'
  ));

-- 3) Substitui CHECK do lookup_required para aceitar regras com manufacturer fields
ALTER TABLE ignored_dav_items
  DROP CONSTRAINT IF EXISTS ignored_dav_items_lookup_required_check;

ALTER TABLE ignored_dav_items
  ADD CONSTRAINT ignored_dav_items_lookup_required_check
  CHECK (
    normalized_sku           IS NOT NULL
    OR normalized_description IS NOT NULL
    OR manufacturer_reference IS NOT NULL
    OR manufacturer_name      IS NOT NULL
  );

-- Índices auxiliares para o matching durante importação
CREATE INDEX IF NOT EXISTS idx_ignored_dav_items_manufacturer_reference
  ON ignored_dav_items (manufacturer_reference);
CREATE INDEX IF NOT EXISTS idx_ignored_dav_items_manufacturer_name
  ON ignored_dav_items (manufacturer_name);
CREATE INDEX IF NOT EXISTS idx_ignored_dav_items_match_type
  ON ignored_dav_items (match_type);

-- 4) ignored_rule_id em unlinked_dav_items: liga item oculto à regra aplicada
ALTER TABLE unlinked_dav_items
  ADD COLUMN IF NOT EXISTS ignored_rule_id UUID;

-- FK separada para permitir IF NOT EXISTS em ALTER (Postgres aceita só ADD CONSTRAINT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unlinked_dav_items_ignored_rule_fk'
  ) THEN
    ALTER TABLE unlinked_dav_items
      ADD CONSTRAINT unlinked_dav_items_ignored_rule_fk
      FOREIGN KEY (ignored_rule_id)
      REFERENCES ignored_dav_items(id)
      ON DELETE SET NULL;
  END IF;
END $$;
