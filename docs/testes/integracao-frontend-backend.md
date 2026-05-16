# Integração frontend, backend e banco

Este documento resume o estado atual da integração real do StockRoute entre frontend, backend e PostgreSQL.

## Telas com dados reais

- Dashboard ADMIN: consome `GET /dashboard/stats` para contadores e usa componentes que leem pedidos e regras ignoradas reais.
- Produtos: consome `GET /products`, `POST /products`, `PUT /products/:id` e `DELETE /products/:id`.
- Upload DAV: valida PDF no frontend e envia para `POST /orders/import` quando o arquivo é processado.
- DAVs recentes: consome `GET /orders`.
- Pedidos: consome `GET /orders`, `GET /dashboard/stats` e `PUT /orders/:id/publish`.
- Revisões: consome `GET /orders?status=PENDING`, `GET /orders/:id` e `PUT /orders/:id/publish`.
- Usuários: consome `GET /users`, `GET /users/:id`, `POST /users`, `PUT /users/:id` e `PATCH /users/:id/status`.
- Itens ignorados: consome `GET /ignored-dav-items`, `POST /ignored-dav-items` e `DELETE /ignored-dav-items/:id`.

## Telas ou partes ainda mockadas
- Configurações: ainda é visual/local porque não existe endpoint de configuração/status operacional.
- Notificações do header: ainda são locais porque não existe endpoint de notificações.
- Últimas aplicações em Itens ignorados: ainda é local porque o backend não registra/exibe histórico de aplicação das regras.
- Revisões de itens sem vínculo/ignorados: o backend calcula contadores na importação, mas hoje só persiste em `order_items` os itens vinculados a produtos. Itens sem vínculo e ignorados ainda não ficam disponíveis em uma tela real de revisão/auditoria.

## Endpoints usados

- `POST /auth/login`
- `GET /auth/me`
- `GET /products`
- `POST /products`
- `PUT /products/:id`
- `DELETE /products/:id`
- `GET /ignored-dav-items?includeInactive=true`
- `POST /ignored-dav-items`
- `DELETE /ignored-dav-items/:id`
- `GET /orders`
- `GET /orders?status=PENDING`
- `GET /orders/:id`
- `POST /orders/import`
- `PUT /orders/:id/publish`
- `GET /dashboard/stats`
- `GET /users`
- `GET /users/:id`
- `POST /users`
- `PUT /users/:id`
- `PATCH /users/:id/status`

## Seeds e DAVs

Foram encontrados seeds de produtos e regras ignoradas:

- `backend/db/seeds/seed_001_initial.sql`
- `backend/db/seeds/seed_002_dav_products.sql`
- `backend/db/seeds/seed_003_ignore_rules.sql`

Os PDFs reais dos três DAVs não foram encontrados no repositório. O banco local de desenvolvimento contém três pedidos reais/importados para teste:

- DAV `113364` - `REVITALIZE PLANEJADOS`
- DAV `113372` - `EDUARDO DA SILVA ANTUNES`
- DAV `113347` - `DREAMS HOME MOVEIS E DECORACOES LTDA`

Ainda não existe um seed SQL reprodutível para criar esses três pedidos e seus itens. Para tornar o ambiente reproduzível, a próxima decisão é criar um seed manual de pedidos com dados fictícios/representativos ou disponibilizar os PDFs DAV originais para importação real.

## Como rodar

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Seeds existentes, apenas em ambiente local/de desenvolvimento:

```bash
cd backend
npm run migrate -- --seed
```

Atenção: o runner atual de migrations não registra migrations aplicadas. Em bancos já migrados, rodar novamente pode falhar se as tabelas já existirem.

## Como testar

1. Subir backend e frontend.
2. Entrar com `admin@stockroute.com` e senha de desenvolvimento.
3. Abrir Dashboard ADMIN e confirmar contadores vindos de `/dashboard/stats`.
4. Abrir Produtos e testar listar, buscar, criar, editar, SKU duplicado e excluir produto sem vínculo.
5. Abrir Itens ignorados e testar listar, criar e desativar regra.
6. Abrir Upload DAV e confirmar que DAVs recentes vêm de `/orders`.
7. Abrir Pedidos e confirmar que os pedidos reais aparecem com status e progresso.
8. Abrir Revisões e confirmar que pedidos `PENDING` e itens vinculados aparecem.
9. Abrir Usuários e testar listar, criar, editar, desativar e reativar com persistência no banco.
10. Confirmar que Configurações e Notificações continuam documentadas como visuais enquanto não há API.

## Limitações atuais

- A aba Usuários foi integrada ao backend real; detalhes em `docs/funcionalidades/admin-users-real.md`.
- Não há endpoint de notificações.
- Não há endpoint de configurações/status operacional detalhado.
- Não há seed reproduzível para os três pedidos DAV atuais.
- Itens sem vínculo e ignorados durante importação não são persistidos em uma estrutura consultável pela tela de Revisões.
- O upload real depende dos PDFs DAV originais para teste completo de parser.

## Próximos passos

- Decidir como persistir itens extraídos sem vínculo e ignorados para auditoria/revisão.
- Criar seed reprodutível dos três DAVs ou versionar fixtures seguras de teste.
- Criar API de histórico/auditoria.
- Criar API de notificações ou remover o contador visual mockado até existir regra real.
