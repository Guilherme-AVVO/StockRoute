-- ============================================================
-- 001_create_users.sql
-- Usuários do sistema. Dois papéis: ADMIN e ESTOQUISTA.
-- A senha é hasheada no backend (Node.js) antes de salvar.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_role_check   CHECK  (role IN ('ADMIN', 'ESTOQUISTA'))
);

-- Busca por email no login
CREATE INDEX idx_users_email ON users (email);
-- Filtro por papel (ex: listar só estoquistas)
CREATE INDEX idx_users_role  ON users (role);

COMMENT ON TABLE  users            IS 'Usuários do sistema com autenticação JWT.';
COMMENT ON COLUMN users.role       IS 'ADMIN ou ESTOQUISTA.';
COMMENT ON COLUMN users.password_hash IS 'Hash bcrypt gerado no backend, nunca texto puro.';
