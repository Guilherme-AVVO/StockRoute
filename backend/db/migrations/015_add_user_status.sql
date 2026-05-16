-- ============================================================
-- 015_add_user_status.sql
-- Permite desativar usuários sem apagar histórico/auditoria.
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active);

COMMENT ON COLUMN users.is_active IS 'Controla se o usuário pode acessar e aparecer como ativo no sistema.';
