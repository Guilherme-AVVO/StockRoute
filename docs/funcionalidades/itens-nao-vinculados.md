# Itens não vinculados (unlinked DAV items)

## O que é

Um **item não vinculado** é uma linha extraída de um DAV durante a importação
que **não tem produto correspondente** no catálogo. Por exemplo, quando o SKU
do DAV (14 dígitos) não foi cadastrado em `products` e também não bate com
nenhuma regra de ignorar.

Como o `order_items.product_id` é `NOT NULL`, esses itens **não podem ser
guardados em `order_items`**. Para não perdê-los, eles são salvos numa tabela
auxiliar: `unlinked_dav_items`.

## Como nasce

Durante `POST /orders/import`:

1. PDF é parseado e itens são extraídos.
2. Para cada item:
   - se a regra de ocultação ativa em `ignored_dav_items` casa, é classificado
     como **ignorado** (não é salvo);
   - se existe produto em `products` com SKU igual (ou sem zeros à esquerda),
     vira **order_item** (entra no picking);
   - **se nenhum dos dois bate**, vira **unlinked_dav_item** com
     `status='PENDING'`.

Veja [`backend/src/services/orderService.js`](../../backend/src/services/orderService.js).

## Tabela `unlinked_dav_items`

Migration: [`backend/db/migrations/008_create_unlinked_dav_items.sql`](../../backend/db/migrations/008_create_unlinked_dav_items.sql).

Colunas:

| Coluna            | Tipo            | Comentário                                              |
|-------------------|-----------------|---------------------------------------------------------|
| `id`              | uuid            | PK                                                      |
| `order_id`        | uuid → orders   | DAV de origem (CASCADE delete)                          |
| `raw_sku`         | text            | SKU/código exatamente como veio no DAV                  |
| `raw_description` | text NOT NULL   | Descrição exatamente como veio no DAV                   |
| `quantity`        | int NOT NULL    | Quantidade pedida                                       |
| `unit`            | varchar(10)     | Unidade do DAV (UN, KT, SC, M…)                         |
| `status`          | varchar(20)     | `PENDING` / `LINKED` / `HIDDEN`                         |
| `product_id`      | uuid → products | Preenchido quando `status=LINKED`                       |
| `resolution_note` | text            | Motivo (ocultação) ou observação livre                  |
| `resolved_at`     | timestamptz     | Quando o ADMIN tomou ação                               |
| `resolved_by`     | uuid → users    | Quem resolveu                                           |
| `created_at`      | timestamptz     | Importação                                              |
| `updated_at`      | timestamptz     | Última mudança                                          |

## Onde aparece no ADMIN

Tela **Itens ignorados** → aba **Não vinculados**.

Apenas itens com `status='PENDING'` são exibidos. Itens resolvidos (`LINKED`
ou `HIDDEN`) somem da aba mas permanecem na tabela para auditoria.

Frontend:
- Service: [`frontend/src/services/unlinkedDavItemsService.js`](../../frontend/src/services/unlinkedDavItemsService.js)
- Tela: [`frontend/src/pages/admin/AdminIgnoredItems.jsx`](../../frontend/src/pages/admin/AdminIgnoredItems.jsx)

## Ações disponíveis

### Vincular a produto existente
`PATCH /unlinked-dav-items/:id/link-product` — body `{ "productId": "<uuid>" }`

Marca item como `LINKED`, salva `product_id`, registra `resolved_by/at`.
O item some da aba "Não vinculados" e o produto do catálogo continua o mesmo.

### Cadastrar como novo produto
`POST /unlinked-dav-items/:id/create-product` — body `{ sku, name, unit, imageUrl? }`

Cria produto novo em `products`, marca o item como `LINKED` apontando para o
produto recém-criado. Se o SKU já existir, responde **409** com o
`existingProductId` — para evitar duplicata silenciosa o ADMIN deve usar
"Vincular" nesse caso.

### Ocultar no picking
`POST /unlinked-dav-items/:id/hide` — body `{ "reason": "..." }`

Cria regra em `ignored_dav_items` (SKU + descrição normalizados) e marca o
item como `HIDDEN`. Próximos DAVs com o mesmo identificador ficam ignorados
automaticamente.

## Endpoints

Todos protegidos por `authMiddleware` + `requireRole('ADMIN')`.

| Método | Rota                                       | Descrição                                |
|--------|--------------------------------------------|------------------------------------------|
| GET    | `/unlinked-dav-items`                      | Lista pendentes (`?status=all` p/ todos) |
| PATCH  | `/unlinked-dav-items/:id/link-product`     | Vincula a produto existente              |
| POST   | `/unlinked-dav-items/:id/create-product`   | Cria produto novo e vincula              |
| POST   | `/unlinked-dav-items/:id/hide`             | Oculta + cria regra em ignored_dav_items |

## Como testar

### 1. Subir tudo
```bash
# Backend
cd backend && node src/server.js &

# Frontend
cd frontend && npx vite
```

### 2. Importar DAVs reais (gera ~24 itens não vinculados)
Os 3 DAVs de exemplo em `/home/taiko/Downloads/wagner0000000113{364,372,347}_dav.pdf`
contêm múltiplos itens de serviço (FURACAO, CORTE, DESLOCAMENTO, USINAGEM…).
Se as regras de `seed_003_ignore_rules.sql` não estiverem aplicadas, esses
itens vão direto para a aba "Não vinculados".

```bash
# Aplicar seeds
psql ... -f backend/db/seeds/seed_002_dav_products.sql
psql ... -f backend/db/seeds/seed_003_ignore_rules.sql

# Limpar pedidos de teste
psql ... -c "DELETE FROM orders WHERE order_number IN ('113364','113372','113347');"

# Login ADMIN
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@stockroute.com","password":"admin123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

# Importar
for pdf in 113364 113372 113347; do
  curl -X POST http://localhost:3000/orders/import \
    -H "Authorization: Bearer $TOKEN" \
    -F "pdf=@/home/taiko/Downloads/wagner0000000${pdf}_dav.pdf"
done
```

### 3. Testar fluxo no frontend
1. Login `admin@stockroute.com` / `admin123`
2. Itens ignorados → Não vinculados → verificar 24 itens
3. Em algum item → "Cadastrar" → preencher SKU/Nome/Unit → salvar
4. Confirmar:
   - mensagem de sucesso
   - item sumiu da aba
   - tela Produtos lista o produto novo

### 4. Testar endpoints com curl
```bash
# Listar
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/unlinked-dav-items | jq

# Cadastrar
ITEM_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/unlinked-dav-items | jq -r '.[0].id')
curl -X POST http://localhost:3000/unlinked-dav-items/$ITEM_ID/create-product \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"sku":"TESTE-001","name":"Produto teste","unit":"UN"}'

# Vincular
curl -X PATCH http://localhost:3000/unlinked-dav-items/<ID>/link-product \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"productId":"<UUID>"}'

# Ocultar
curl -X POST http://localhost:3000/unlinked-dav-items/<ID>/hide \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"reason":"Serviço interno"}'
```

## Limitações conhecidas

1. **Sem soft delete** — só temos transição de status (`PENDING` → `LINKED|HIDDEN`).
   Itens não são apagados, ficam visíveis via `?status=all`.
2. **Sem transação multi-tabela** — `create-product` e `hide` fazem 2 inserts/updates
   em sequência. Em caso de falha entre eles, há risco pequeno de estado inconsistente.
   O `postgres` (Postgres.js) suporta transações via `sql.begin`; podemos refatorar
   se isso virar problema operacional.
3. **Regras por padrão (Nome contém, SKU prefix…)** continuam mock no frontend;
   `match_type` em `ignored_dav_items` aceita só `SKU`/`DESCRIPTION`/`SKU_AND_DESCRIPTION`
   (match exato). Para virar real precisa expandir o enum + ajustar `shouldIgnoreDavItem`.
4. **Não há reabertura de itens resolvidos** — uma vez `LINKED` ou `HIDDEN`,
   o item não volta para `PENDING` via UI. Para reabrir, hoje precisaria de UPDATE manual.
