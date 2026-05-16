-- ============================================================
-- Migration 014 — Tabela de eventos de auditoria/histórico.
--
-- Centraliza eventos significativos do sistema (produtos criados,
-- regras aplicadas, pedidos publicados, separações, decisões ADMIN,
-- etc.) para a tela de Histórico.
--
-- Princípio de design:
-- - Tabela append-only — não atualizamos eventos após gravados.
-- - entity_type/entity_id são "weak references": não usamos FK porque
--   o evento deve sobreviver mesmo se a entidade for apagada.
-- - metadata em JSONB permite estender o evento sem migration nova.
-- - Nada de tokens, senhas ou secrets no metadata.
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  event_type        TEXT        NOT NULL,
  entity_type       TEXT,
  entity_id         UUID,

  -- Contexto operacional do evento. Guardamos número/cliente em colunas
  -- dedicadas para acelerar busca/filtro na tela de Histórico, mesmo que
  -- a entidade original tenha sido apagada/renumerada.
  order_id          UUID,
  order_item_id     UUID,
  dav_number        TEXT,
  client_name       TEXT,

  -- Responsável pela ação. Quando o evento é do sistema (sem requisição
  -- HTTP de um usuário) usamos responsible_name='Sistema' e role='SYSTEM'.
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  responsible_name  TEXT,
  responsible_role  TEXT,

  status            TEXT,
  title             TEXT NOT NULL,
  description       TEXT,

  evidence_type     TEXT,
  evidence_url      TEXT,

  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices alinhados às queries da tela:
--   listagem em ordem cronológica decrescente, filtro por tipo/status,
--   busca por DAV.
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_status     ON audit_events (status);
CREATE INDEX IF NOT EXISTS idx_audit_events_dav        ON audit_events (dav_number);
CREATE INDEX IF NOT EXISTS idx_audit_events_user       ON audit_events (user_id);

COMMENT ON TABLE  audit_events            IS 'Eventos de auditoria/histórico. Append-only.';
COMMENT ON COLUMN audit_events.metadata   IS 'Detalhes extras do evento. Nunca armazenar tokens, senhas, JWT_SECRET ou DATABASE_URL.';
COMMENT ON COLUMN audit_events.entity_id  IS 'Weak reference — não há FK porque o evento sobrevive a deletes da entidade.';
