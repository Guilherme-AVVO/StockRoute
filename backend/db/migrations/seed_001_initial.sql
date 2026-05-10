-- ============================================================
-- seed_001_initial.sql
-- Massa mínima para o sistema rodar em produção/dev.
-- ATENÇÃO: os hashes abaixo são bcrypt de senhas de exemplo.
-- Gere novos hashes no backend antes de usar em produção.
--
-- Senha do admin:      admin123
-- Senha do estoquista: estoque123
-- ============================================================

-- Usuário ADMIN inicial
INSERT INTO users (id, name, email, password_hash, role)
VALUES (
  gen_random_uuid(),
  'Administrador',
  'admin@stockroute.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/uFCVBdFEe', -- admin123
  'ADMIN'
)
ON CONFLICT (email) DO NOTHING;

-- Usuário ESTOQUISTA inicial
INSERT INTO users (id, name, email, password_hash, role)
VALUES (
  gen_random_uuid(),
  'Estoquista Padrão',
  'estoquista@stockroute.com',
  '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWFdgTW', -- estoque123
  'ESTOQUISTA'
)
ON CONFLICT (email) DO NOTHING;

-- Produtos de exemplo (alguns com unidades distintas)
INSERT INTO products (sku, name, unit) VALUES
  ('PAR-001-UN', 'Parafuso M6 x 20mm',               'UN'),
  ('PAR-001-CX', 'Parafuso M6 x 20mm (Caixa 100un)', 'CX'),
  ('PAR-001-SC', 'Parafuso M6 x 20mm (Saco 50un)',   'SC'),
  ('PST-001-PC', 'Pistão Hidráulico 50mm',            'PC'),
  ('BAT-001-CT', 'Batente de Silicone (Cartela)',     'CT'),
  ('COR-001-PR', 'Corrediça 45cm',                   'PR'),
  ('FIT-001-M',  'Fita Isolante Preta',               'M')
ON CONFLICT (sku) DO NOTHING;
