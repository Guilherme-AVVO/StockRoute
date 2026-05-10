-- ============================================================
-- seed_001_initial.sql
-- Massa mínima para rodar o StockRoute em desenvolvimento.
--
-- Credenciais de teste:
--   ADMIN:      admin@stockroute.com / admin123
--   ESTOQUISTA: estoquista@stockroute.com / estoque123
--
-- As senhas abaixo estão armazenadas como hash bcrypt.
-- ============================================================

-- Usuário ADMIN inicial.
INSERT INTO users (id, name, email, password_hash, role)
VALUES (
  gen_random_uuid(),
  'Administrador',
  'admin@stockroute.com',
  '$2b$12$YEgvKR.2Gl6BnhP3PCFGd.eVlVfBXnwt.hH23B4zfNZ.feqDIgeT.',
  'ADMIN'
)
ON CONFLICT (email) DO NOTHING;

-- Usuário ESTOQUISTA inicial.
INSERT INTO users (id, name, email, password_hash, role)
VALUES (
  gen_random_uuid(),
  'Estoquista Padrão',
  'estoquista@stockroute.com',
  '$2b$12$qRRIZ3OrK/ET5ypzWic52.SP9P1Mu.DCGlJEcJkbUR6uTTC1tJ3ry',
  'ESTOQUISTA'
)
ON CONFLICT (email) DO NOTHING;

-- Produtos de exemplo com unidades compatíveis com a constraint products_unit_check.
INSERT INTO products (sku, name, unit) VALUES
  ('PAR-001-UN', 'Parafuso M6 x 20mm',               'UN'),
  ('PAR-001-CX', 'Parafuso M6 x 20mm (Caixa 100un)', 'CX'),
  ('PAR-001-SC', 'Parafuso M6 x 20mm (Saco 50un)',   'SC'),
  ('PST-001-PC', 'Pistão Hidráulico 50mm',            'PC'),
  ('BAT-001-CT', 'Batente de Silicone (Cartela)',     'CT'),
  ('COR-001-PR', 'Corrediça 45cm',                    'PR'),
  ('FIT-001-M',  'Fita Isolante Preta',               'M')
ON CONFLICT (sku) DO NOTHING;
