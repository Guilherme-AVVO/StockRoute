-- ============================================================
-- Migration 009 — Referência e fabricante em produtos e em itens DAV não vinculados
--
-- Motivação:
-- O DAV traz, junto de cada item, uma coluna "Referência/Fabricante":
--   ex: linha 011 ... MULTIMARCA / W070123TX1022N
--
-- Sem persistir esses dois campos, o sistema não consegue:
--   1. diferenciar produtos com nome/SKU parecidos;
--   2. fazer match automático em DAVs futuros pela referência do fabricante.
--
-- Os campos ficam opcionais (NULLABLE) para não quebrar produtos já cadastrados.
-- A normalização (UPPER + TRIM) é feita no service antes do INSERT/UPDATE,
-- então o índice simples já funciona.
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS manufacturer_reference TEXT,
  ADD COLUMN IF NOT EXISTS manufacturer_name      TEXT;

-- Índice para lookup rápido por referência do fabricante (caso mais comum)
CREATE INDEX IF NOT EXISTS idx_products_manufacturer_reference
  ON products (manufacturer_reference);

-- Índice composto para lookup preciso (referência + fabricante)
-- Sem UNIQUE: a mesma referência pode aparecer em fabricantes diferentes.
CREATE INDEX IF NOT EXISTS idx_products_manufacturer_ref_name
  ON products (manufacturer_reference, manufacturer_name);

-- Mesmos campos em unlinked_dav_items para preservar o que veio do DAV
-- e permitir que o ADMIN, ao cadastrar produto, mantenha o vínculo correto.
ALTER TABLE unlinked_dav_items
  ADD COLUMN IF NOT EXISTS manufacturer_reference TEXT,
  ADD COLUMN IF NOT EXISTS manufacturer_name      TEXT;
