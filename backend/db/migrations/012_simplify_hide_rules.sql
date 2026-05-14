-- ============================================================
-- Migration 012 — Simplificar regras de ocultação
--
-- Regras novas passam a ser apenas por nome ou fabricante.
-- Mantemos match_types antigos na constraint para não quebrar dados
-- existentes, mas o backend não permite criar novas regras antigas.
-- deleted_at permite "apagar" uma regra sem perder auditoria.
-- ============================================================

ALTER TABLE ignored_dav_items
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

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
    'NAME',
    'NAME_CONTAINS',
    'MANUFACTURER_REFERENCE',
    'MANUFACTURER_REFERENCE_CONTAINS',
    'MANUFACTURER_NAME',
    'MANUFACTURER_NAME_CONTAINS'
  ));

CREATE INDEX IF NOT EXISTS idx_ignored_dav_items_deleted_at
  ON ignored_dav_items (deleted_at);
