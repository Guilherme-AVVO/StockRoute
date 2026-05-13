-- ============================================================
-- 001_create_users.sql
-- Usuários do sistema. Dois papéis: ADMIN e ESTOQUISTA.
-- A senha é hasheada no backend (Node.js) antes de salvar.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash TEXT         NOT NULL,
  role          VARCHAR(20)  NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_email_format CHECK (email LIKE '%@%'),
  CONSTRAINT users_role_check   CHECK (role IN ('ADMIN', 'ESTOQUISTA'))
);

-- Busca por email no login
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
-- Filtro por papel (ex: listar só estoquistas)
CREATE INDEX IF NOT EXISTS idx_users_role  ON users (role);

COMMENT ON TABLE  users            IS 'Usuários do sistema com autenticação JWT.';
COMMENT ON COLUMN users.role       IS 'ADMIN ou ESTOQUISTA.';
COMMENT ON COLUMN users.password_hash IS 'Hash bcrypt gerado no backend, nunca texto puro.';
