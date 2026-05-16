# Histórico real (audit_events)

A tela **Histórico** consome eventos reais persistidos em `audit_events`. Toda ação relevante do sistema gera um evento; nada na tela é mockado.

## Tabela

Migration: [014_create_audit_events.sql](../../backend/db/migrations/014_create_audit_events.sql).

Campos relevantes:

| Coluna | Tipo | Uso |
|--------|------|------|
| `id` | UUID | PK |
| `event_type` | TEXT | Tipo canônico (ver lista) |
| `entity_type` / `entity_id` | TEXT / UUID | Weak reference para a entidade afetada |
| `order_id` / `order_item_id` | UUID | Contexto operacional |
| `dav_number` / `client_name` | TEXT | Snapshot textual — sobrevive a deletes |
| `user_id` | UUID FK users | Quem disparou; `NULL` para eventos do sistema |
| `responsible_name` / `responsible_role` | TEXT | Snapshot — preenche a coluna "Responsável" |
| `status` | TEXT | Concluído / Aguardando / Em separação / Observação / Aplicado / Desativado / Pendente / Erro / Sistema |
| `title` / `description` | TEXT | Mostrados na tabela e no modal |
| `evidence_type` / `evidence_url` | TEXT | Para foto/PDF/etc.; ausentes = "Sem evidência" |
| `metadata` | JSONB | Detalhes operacionais (sanitizados — sem tokens, senhas ou secrets) |
| `created_at` | TIMESTAMPTZ | Ordenação cronológica |

Append-only. Não há UPDATE/DELETE de eventos.

## Endpoints

Todos protegidos por `authMiddleware + requireRole('ADMIN')`.

| Método | Rota | Função |
|--------|------|------|
| GET | `/audit-events` | Lista paginada com filtros |
| GET | `/audit-events/summary` | StatCards (todos os números calculados do banco) |
| GET | `/audit-events/:id` | Detalhe de um evento |

Filtros aceitos em `GET /audit-events`:

`search`, `eventType`, `status`, `davNumber`, `userId`, `dateFrom`, `dateTo`, `onlyPending`, `page`, `limit` (máx 200).

`onlyPending = true` filtra `status IN ('Observação','Aguardando','Pendente','Erro')`.

## Tipos de evento canônicos

Definidos como constantes em [auditService.AUDIT_EVENT_TYPES](../../backend/src/services/auditService.js): `DAV_UPLOADED`, `DAV_IMPORTED`, `ORDER_CREATED`, `ORDER_REVIEW_STARTED`, `ORDER_PUBLISHED`, `ORDER_STATUS_CHANGED`, `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_DELETED`, `UNLINKED_ITEM_CREATED`, `UNLINKED_ITEM_LINKED`, `PRODUCT_CREATED_FROM_UNLINKED`, `HIDE_RULE_CREATED`, `HIDE_RULE_UPDATED`, `HIDE_RULE_DELETED`, `HIDE_RULE_STATUS_CHANGED`, `ITEM_HIDDEN_BY_RULE`, `ITEM_HIDDEN_MANUALLY`, `ITEM_UNHIDDEN`, `PICKING_STARTED`, `PICKING_ITEM_COLLECTED`, `PICKING_ITEM_NOT_FOUND`, `PICKING_FINISHED`, `USER_CREATED`, `USER_UPDATED`, `USER_STATUS_CHANGED`, `SETTINGS_UPDATED`.

## Onde os eventos são gravados

Hooks `logAuditEvent` foram adicionados nos controllers (camada HTTP — sempre temos `req.user`):

- **`productController`**: `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_DELETED`.
- **`ignoredDavItemsController`**: `HIDE_RULE_CREATED`, `HIDE_RULE_UPDATED`, `HIDE_RULE_STATUS_CHANGED`, `HIDE_RULE_DELETED`.
- **`unlinkedDavItemsController`**:
  - Single-item: `UNLINKED_ITEM_LINKED`, `PRODUCT_CREATED_FROM_UNLINKED`, `ITEM_HIDDEN_MANUALLY`.
  - Grupos: `PRODUCT_CREATED_FROM_UNLINKED`, `UNLINKED_ITEM_LINKED`, `ITEM_HIDDEN_MANUALLY` (com `affectedOrdersCount`/`hiddenItemsCount` em metadata).
- **`orderController`**: `DAV_UPLOADED`, `DAV_IMPORTED`, `ORDER_PUBLISHED`.

Tipos como `PICKING_*` e `SETTINGS_*` estão definidos no enum porque o pipeline já os reconhece; serão gravados quando os respectivos fluxos forem implementados. Eventos `USER_CREATED`, `USER_UPDATED` e `USER_STATUS_CHANGED` já são gravados pelo CRUD administrativo de usuários.

## Como responsável é preenchido

`logAuditEvent(data, { req })` extrai do JWT:

- `userId   = req.user.id`
- `responsibleName  = req.user.name ?? req.user.email`
- `responsibleRole  = req.user.role`

Para isso, `authService` agora inclui `name` no payload do JWT e o `authMiddleware` propaga `req.user.name`. Eventos sem `req` autenticado (jobs) caem em `responsibleName='Sistema'`, `responsibleRole='SYSTEM'`.

## Como status é preenchido

Cada hook escolhe um status textual coerente com a ação:

- Criação/sucesso → `Concluído`.
- Regra criada/editada/reativada → `Aplicado`.
- Regra desativada/apagada → `Desativado`.
- Item ocultado / observação → `Observação`.
- Publicação pendente de picking → `Aguardando`.

Quando o evento estiver ligado diretamente a um pedido em andamento, o status reflete o pedido (futuro: `PICKING_*` usa `Em separação`).

## Como evidência é preenchida

`evidence_type` + `evidence_url` são preenchidos quando o evento gera uma evidência real (ex.: hoje, `DAV_UPLOADED` grava `evidenceType='pdf'`; uploads de foto durante picking gravarão URL real quando o fluxo de fotos for implementado).

Quando vazios, o frontend mostra **"Sem evidência"** — nunca placeholder falso.

## Frontend

Página [AdminHistory.jsx](../../frontend/src/pages/admin/AdminHistory.jsx):

- Não há mais arrays mockados (`EVENTS`, `FILTERS`, fotos fictícias) — removidos.
- Carrega `GET /audit-events` e `GET /audit-events/summary` no mount.
- Estados: loading, erro, vazio (mensagem explícita "Nenhum evento registrado para os filtros atuais.").
- Filtros: tipo de evento (chips), período (hoje/7/30/todos → `dateFrom`), busca textual, toggle "Somente eventos com pendência" → todos enviados ao backend via query params.
- Modal "Ver evento": mostra título, tipo, responsável + role, data/hora, status, evidência (link clicável se `evidenceUrl`), descrição, metadata formatada.
- Coluna "Ação" derivada do tipo/status: `Resolver` se pendente, `Ver regra` para HIDE_RULE_*, `Ver produto` para PRODUCT_*, `Ver detalhes` padrão.

## Segurança

- Rotas exigem `ADMIN`; sem token → 401, sem ADMIN → 403.
- `password_hash` nunca é exposto; o evento não inclui campos sensíveis.
- `sanitizeMetadata` remove chaves perigosas (`password`, `token`, `jwt`, `secret`, `DATABASE_URL`, `authorization`).
- Queries todas parametrizadas (`postgres-js` template tags).
- `logAuditEvent` nunca lança — falha de auditoria não pode quebrar fluxo principal; apenas loga warning.

## Como testar

1. Subir backend + frontend.
2. Logar como ADMIN (`admin@stockroute.com / admin123`).
3. Abrir Histórico → tela exibe estado vazio se banco estiver limpo.
4. Executar ações reais: criar produto, criar regra, desativar regra, vincular item DAV.
5. Voltar ao Histórico → eventos aparecem com responsável, data, status e descrição reais.
6. Filtrar por tipo / período / texto.
7. Recarregar navegador — eventos persistem (vêm do banco).

## Limitações atuais

- Picking ainda não dispara eventos `PICKING_*` (fluxo não implementado nos services atuais).
- Upload de evidências (fotos de coleta) ainda não existe — `evidence_url` virá quando o fluxo for criado.
- Reset de senha administrativo e tela de Configurações ainda não geram eventos porque os fluxos correspondentes não existem em backend.
- Não há paginação infinita na UI — o limite é 100 eventos por carga; aceitável para o volume atual.
