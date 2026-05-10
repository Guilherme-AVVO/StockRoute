-- ============================================================
-- queries/orders.sql
-- Consultas reutilizáveis para o módulo de pedidos.
-- Parâmetros no formato $1, $2... (node-postgres / pg).
-- ============================================================


-- ------------------------------------------------------------
-- Q01: Listar pedidos filtrados por status (com paginação)
-- Parâmetros: $1 = status, $2 = limit, $3 = offset
-- ------------------------------------------------------------
-- SELECT
--   o.id,
--   o.order_number,
--   o.customer_name,
--   o.status,
--   o.pdf_url,
--   o.created_at,
--   COUNT(oi.id) AS total_items,
--   SUM(CASE WHEN oi.status = 'PICKED'  THEN 1 ELSE 0 END) AS picked_items,
--   SUM(CASE WHEN oi.status = 'MISSING' THEN 1 ELSE 0 END) AS missing_items,
--   SUM(CASE WHEN oi.status = 'PARTIAL' THEN 1 ELSE 0 END) AS partial_items
-- FROM orders o
-- LEFT JOIN order_items oi ON oi.order_id = o.id
-- WHERE o.status = $1
-- GROUP BY o.id
-- ORDER BY o.created_at DESC
-- LIMIT $2 OFFSET $3;


-- ------------------------------------------------------------
-- Q02: Buscar pedido completo com todos os itens e produtos
-- Parâmetro: $1 = order_id
-- ------------------------------------------------------------
-- SELECT
--   o.id            AS order_id,
--   o.order_number,
--   o.customer_name,
--   o.status        AS order_status,
--   o.pdf_url,
--   oi.id           AS item_id,
--   oi.quantity,
--   oi.picked_quantity,
--   oi.missing_quantity,
--   oi.status       AS item_status,
--   p.id            AS product_id,
--   p.sku,
--   p.name          AS product_name,
--   p.unit,
--   p.image_url     AS product_image
-- FROM orders o
-- JOIN order_items oi ON oi.order_id = o.id
-- JOIN products    p  ON p.id = oi.product_id
-- WHERE o.id = $1
-- ORDER BY p.name;


-- ------------------------------------------------------------
-- Q03: Buscar itens de um pedido com suas evidências fotográficas
-- Parâmetro: $1 = order_id
-- ------------------------------------------------------------
-- SELECT
--   oi.id           AS item_id,
--   p.sku,
--   p.name          AS product_name,
--   p.unit,
--   oi.quantity,
--   oi.picked_quantity,
--   oi.status       AS item_status,
--   pe.id           AS evidence_id,
--   pe.image_url    AS evidence_url,
--   pe.created_at   AS evidence_created_at,
--   u.name          AS evidence_created_by
-- FROM order_items oi
-- JOIN products          p  ON p.id  = oi.product_id
-- LEFT JOIN picking_evidences pe ON pe.order_item_id = oi.id
-- LEFT JOIN users            u  ON u.id  = pe.created_by
-- WHERE oi.order_id = $1
-- ORDER BY oi.id, pe.created_at;


-- ------------------------------------------------------------
-- Q04: Buscar itens faltantes de um pedido com motivos
-- Parâmetro: $1 = order_id
-- ------------------------------------------------------------
-- SELECT
--   oi.id              AS item_id,
--   p.sku,
--   p.name             AS product_name,
--   p.unit,
--   oi.quantity,
--   oi.missing_quantity,
--   mi.id              AS missing_id,
--   mi.reason,
--   mi.created_at,
--   u.name             AS registered_by
-- FROM order_items oi
-- JOIN products     p  ON p.id  = oi.product_id
-- JOIN missing_items mi ON mi.order_item_id = oi.id
-- JOIN users         u  ON u.id = mi.created_by
-- WHERE oi.order_id = $1
-- ORDER BY p.name;


-- ------------------------------------------------------------
-- Q05: Atualizar status de um item do pedido
-- Parâmetros: $1 = status, $2 = picked_quantity,
--             $3 = missing_quantity, $4 = item_id
-- (backend garante que $2 + $3 <= quantity antes de chamar)
-- ------------------------------------------------------------
-- UPDATE order_items
-- SET
--   status           = $1,
--   picked_quantity  = $2,
--   missing_quantity = $3,
--   updated_at       = NOW()
-- WHERE id = $4;


-- ------------------------------------------------------------
-- Q06: Atualizar status do pedido (ex: PENDING → IN_PROGRESS)
-- Parâmetros: $1 = status, $2 = order_id
-- ------------------------------------------------------------
-- UPDATE orders
-- SET
--   status     = $1,
--   updated_at = NOW()
-- WHERE id = $2;


-- ------------------------------------------------------------
-- Q07: Buscar pedido por número (import / dedup de DAV)
-- Parâmetro: $1 = order_number
-- ------------------------------------------------------------
-- SELECT id, order_number, status
-- FROM orders
-- WHERE order_number = $1;


-- ------------------------------------------------------------
-- Q08: Buscar produto por SKU (import de DAV)
-- Parâmetro: $1 = sku
-- ------------------------------------------------------------
-- SELECT id, sku, name, unit
-- FROM products
-- WHERE sku = $1;
