-- Cenário determinístico para apresentação do fluxo completo.

UPDATE products SET
  manufacturer_name = 'FIXPRO', manufacturer_reference = 'FX-PH-3516',
  image_url = '/demo/product-fastener.svg'
WHERE sku = '00000000002671';

UPDATE products SET
  manufacturer_name = 'RENNA', manufacturer_reference = 'RN-110R',
  image_url = '/demo/product-hinge.svg'
WHERE sku = '00000000004477';

UPDATE products SET
  manufacturer_name = 'DURATEX', manufacturer_reference = 'DT-ITAPUA-15',
  image_url = '/demo/product-board.svg'
WHERE sku = '00000000002537';

UPDATE products SET
  manufacturer_name = 'HAFELE', manufacturer_reference = 'HF-MINIFIX-S200',
  image_url = '/demo/product-fastener.svg'
WHERE sku = '00000000001465';

INSERT INTO orders (
  id, order_number, customer_name, status, delivery_date, assigned_to,
  started_at, finished_at, created_at, updated_at
) VALUES
  ('10000000-0000-4000-8000-000000000101', '900101', 'Ateliê Aurora',       'PENDING',     CURRENT_DATE + 3, NULL, NULL, NULL, NOW() - INTERVAL '35 minutes', NOW() - INTERVAL '35 minutes'),
  ('10000000-0000-4000-8000-000000000102', '900102', 'Casa Horizonte',      'IN_PROGRESS', CURRENT_DATE + 1, NULL, NULL, NULL, NOW() - INTERVAL '2 hours',    NOW() - INTERVAL '90 minutes'),
  ('10000000-0000-4000-8000-000000000103', '900103', 'Studio Essencial',    'PICKING',     CURRENT_DATE,     'd3286474-39d8-4f27-a0e8-b29d8f9d6d23', NOW() - INTERVAL '24 minutes', NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '8 minutes'),
  ('10000000-0000-4000-8000-000000000104', '900104', 'Ambiente Planejado',  'COMPLETED',   CURRENT_DATE - 1, '7d69ae3d-7f21-46b0-a28e-bf182f00456a', NOW() - INTERVAL '1 day 45 minutes', NOW() - INTERVAL '1 day 12 minutes', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day 12 minutes'),
  ('10000000-0000-4000-8000-000000000105', '900105', 'Linha Clara Móveis',   'OBSERVATION', CURRENT_DATE - 1, '7d69ae3d-7f21-46b0-a28e-bf182f00456a', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 hours'),
  ('10000000-0000-4000-8000-000000000106', '900106', 'Projeto Norte',       'CANCELLED',   CURRENT_DATE + 5, NULL, NULL, NULL, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days')
ON CONFLICT (order_number) DO NOTHING;

INSERT INTO order_items (
  id, order_id, product_id, quantity, picked_quantity, missing_quantity,
  status, hidden, confirmation_photo_url, collected_at,
  not_found_reason, not_found_notes, created_at, updated_at
)
SELECT
  v.id::uuid, v.order_id::uuid, p.id, v.quantity, v.picked, v.missing,
  v.status, false, v.photo, v.collected_at, v.reason, v.notes,
  v.created_at, v.updated_at
FROM (VALUES
  ('20000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000101', '00000000002671', 4, 0, 0, 'PENDING', NULL, NULL::timestamptz, NULL, NULL, NOW() - INTERVAL '35 minutes', NOW() - INTERVAL '35 minutes'),
  ('20000000-0000-4000-8000-000000000102', '10000000-0000-4000-8000-000000000101', '00000000004477', 6, 0, 0, 'PENDING', NULL, NULL::timestamptz, NULL, NULL, NOW() - INTERVAL '35 minutes', NOW() - INTERVAL '35 minutes'),
  ('20000000-0000-4000-8000-000000000201', '10000000-0000-4000-8000-000000000102', '00000000002671', 8, 0, 0, 'PENDING', NULL, NULL::timestamptz, NULL, NULL, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '90 minutes'),
  ('20000000-0000-4000-8000-000000000202', '10000000-0000-4000-8000-000000000102', '00000000002537', 2, 0, 0, 'PENDING', NULL, NULL::timestamptz, NULL, NULL, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '90 minutes'),
  ('20000000-0000-4000-8000-000000000203', '10000000-0000-4000-8000-000000000102', '00000000001465', 12, 0, 0, 'PENDING', NULL, NULL::timestamptz, NULL, NULL, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '90 minutes'),
  ('20000000-0000-4000-8000-000000000301', '10000000-0000-4000-8000-000000000103', '00000000002671', 10, 10, 0, 'PICKED', '/demo/evidence.svg', NOW() - INTERVAL '10 minutes', NULL, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '10 minutes'),
  ('20000000-0000-4000-8000-000000000302', '10000000-0000-4000-8000-000000000103', '00000000004477', 4, 0, 0, 'PENDING', NULL, NULL::timestamptz, NULL, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '8 minutes'),
  ('20000000-0000-4000-8000-000000000401', '10000000-0000-4000-8000-000000000104', '00000000002537', 3, 3, 0, 'PICKED', '/demo/evidence.svg', NOW() - INTERVAL '1 day 20 minutes', NULL, NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day 20 minutes'),
  ('20000000-0000-4000-8000-000000000402', '10000000-0000-4000-8000-000000000104', '00000000001465', 20, 20, 0, 'PICKED', '/demo/evidence.svg', NOW() - INTERVAL '1 day 14 minutes', NULL, NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day 14 minutes'),
  ('20000000-0000-4000-8000-000000000501', '10000000-0000-4000-8000-000000000105', '00000000002671', 6, 6, 0, 'PICKED', '/demo/evidence.svg', NOW() - INTERVAL '2 hours 20 minutes', NULL, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 hours 20 minutes'),
  ('20000000-0000-4000-8000-000000000502', '10000000-0000-4000-8000-000000000105', '00000000004477', 2, 0, 2, 'MISSING', NULL, NULL::timestamptz, 'Falta no estoque', 'Reposição prevista para o próximo recebimento.', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 hours 5 minutes'),
  ('20000000-0000-4000-8000-000000000601', '10000000-0000-4000-8000-000000000106', '00000000002537', 1, 0, 0, 'PENDING', NULL, NULL::timestamptz, NULL, NULL, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days')
) AS v(id, order_id, sku, quantity, picked, missing, status, photo, collected_at, reason, notes, created_at, updated_at)
JOIN products p ON p.sku = v.sku
ON CONFLICT (id) DO NOTHING;

INSERT INTO unlinked_dav_items (
  id, order_id, raw_sku, raw_description, quantity, unit, status,
  manufacturer_reference, manufacturer_name, created_at, updated_at
) VALUES (
  '30000000-0000-4000-8000-000000000101',
  '10000000-0000-4000-8000-000000000101',
  '99999999999998', 'PUXADOR DEMO COBRE 128MM', 2, 'UN', 'PENDING',
  'DEMO-PUX-128', 'ATELIE DEMO', NOW() - INTERVAL '35 minutes', NOW() - INTERVAL '35 minutes'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO missing_items (id, order_item_id, reason, created_by, created_at)
VALUES (
  '40000000-0000-4000-8000-000000000501',
  '20000000-0000-4000-8000-000000000502',
  'Falta no estoque — reposição prevista para o próximo recebimento.',
  '7d69ae3d-7f21-46b0-a28e-bf182f00456a',
  NOW() - INTERVAL '2 hours 5 minutes'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO picking_evidences (id, order_item_id, image_url, created_by, created_at)
VALUES
  ('50000000-0000-4000-8000-000000000401', '20000000-0000-4000-8000-000000000401', '/demo/evidence.svg', '7d69ae3d-7f21-46b0-a28e-bf182f00456a', NOW() - INTERVAL '1 day 20 minutes'),
  ('50000000-0000-4000-8000-000000000402', '20000000-0000-4000-8000-000000000402', '/demo/evidence.svg', '7d69ae3d-7f21-46b0-a28e-bf182f00456a', NOW() - INTERVAL '1 day 14 minutes'),
  ('50000000-0000-4000-8000-000000000501', '20000000-0000-4000-8000-000000000501', '/demo/evidence.svg', '7d69ae3d-7f21-46b0-a28e-bf182f00456a', NOW() - INTERVAL '2 hours 20 minutes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_events (
  id, event_type, entity_type, entity_id, order_id, order_item_id,
  dav_number, client_name, user_id, responsible_name, responsible_role,
  status, title, description, evidence_type, evidence_url, created_at
) VALUES
  ('60000000-0000-4000-8000-000000000101', 'DAV_IMPORTED', 'ORDER', '10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000101', NULL, '900101', 'Ateliê Aurora', '4681ae42-0304-42f4-bc17-6d7fa679c52a', 'Administrador Demo', 'ADMIN', 'Pendente', 'DAV 900101 importado', 'Dois itens vinculados e um item aguardando vínculo.', NULL, NULL, NOW() - INTERVAL '35 minutes'),
  ('60000000-0000-4000-8000-000000000102', 'ORDER_PUBLISHED', 'ORDER', '10000000-0000-4000-8000-000000000102', '10000000-0000-4000-8000-000000000102', NULL, '900102', 'Casa Horizonte', '4681ae42-0304-42f4-bc17-6d7fa679c52a', 'Administrador Demo', 'ADMIN', 'Aguardando', 'Pedido publicado para o estoque', 'Pedido disponível para separação.', NULL, NULL, NOW() - INTERVAL '90 minutes'),
  ('60000000-0000-4000-8000-000000000103', 'PICKING_STARTED', 'ORDER', '10000000-0000-4000-8000-000000000103', '10000000-0000-4000-8000-000000000103', NULL, '900103', 'Studio Essencial', 'd3286474-39d8-4f27-a0e8-b29d8f9d6d23', 'Ana Estoquista', 'ESTOQUISTA', 'Em separação', 'Separação iniciada', 'Pedido assumido por Ana Estoquista.', NULL, NULL, NOW() - INTERVAL '24 minutes'),
  ('60000000-0000-4000-8000-000000000104', 'PICKING_FINISHED', 'ORDER', '10000000-0000-4000-8000-000000000104', '10000000-0000-4000-8000-000000000104', NULL, '900104', 'Ambiente Planejado', '7d69ae3d-7f21-46b0-a28e-bf182f00456a', 'Estoquista Demo', 'ESTOQUISTA', 'Concluído', 'Picking concluído', 'Todos os itens foram coletados com evidência.', 'Foto', '/demo/evidence.svg', NOW() - INTERVAL '1 day 12 minutes'),
  ('60000000-0000-4000-8000-000000000105', 'PICKING_ITEM_NOT_FOUND', 'ORDER_ITEM', '20000000-0000-4000-8000-000000000502', '10000000-0000-4000-8000-000000000105', '20000000-0000-4000-8000-000000000502', '900105', 'Linha Clara Móveis', '7d69ae3d-7f21-46b0-a28e-bf182f00456a', 'Estoquista Demo', 'ESTOQUISTA', 'Observação', 'Item não encontrado', 'Dobradiça sem saldo no endereço informado.', NULL, NULL, NOW() - INTERVAL '2 hours 5 minutes'),
  ('60000000-0000-4000-8000-000000000106', 'PICKING_FINISHED', 'ORDER', '10000000-0000-4000-8000-000000000105', '10000000-0000-4000-8000-000000000105', NULL, '900105', 'Linha Clara Móveis', '7d69ae3d-7f21-46b0-a28e-bf182f00456a', 'Estoquista Demo', 'ESTOQUISTA', 'Observação', 'Picking finalizado com pendência', 'Pedido encaminhado para análise do ADMIN.', NULL, NULL, NOW() - INTERVAL '2 hours'),
  ('60000000-0000-4000-8000-000000000107', 'HIDE_RULE_CREATED', 'HIDE_RULE', NULL, NULL, NULL, NULL, NULL, '4681ae42-0304-42f4-bc17-6d7fa679c52a', 'Administrador Demo', 'ADMIN', 'Ativo', 'Regra de serviço criada', 'Serviços de furação são removidos automaticamente do picking.', NULL, NULL, NOW() - INTERVAL '4 days')
ON CONFLICT (id) DO NOTHING;
