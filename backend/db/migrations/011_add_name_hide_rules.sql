-- ============================================================
-- Migration 011 — Regras de ocultação por nome do item/produto
--
-- Adiciona NAME e NAME_CONTAINS como match_types reais.
-- O padrão textual continua armazenado em raw_description /
-- normalized_description, porque "nome" é um critério textual do item.
-- Durante o roteamento, NAME_* compara contra a descrição do DAV e,
-- quando houver produto cadastrado, também contra products.name.
-- ============================================================

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
    'MANUFACTURER_NAME'
  ));
