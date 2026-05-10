# StockRoute — Banco de Dados

## Estrutura de arquivos

```
backend/
└── src/
    └── db/
        ├── migrations/
        │   ├── 001_create_users.sql
        │   ├── 002_create_products.sql
        │   ├── 003_create_orders.sql
        │   ├── 004_create_order_items.sql
        │   ├── 005_create_picking_evidences.sql
        │   └── 006_create_missing_items.sql
        ├── queries/
        │   └── orders.sql
        ├── seeds/
        │   └── seed_001_initial.sql
        └── pool.js
```

---

## Ordem de execução das migrations

| # | Arquivo | Motivo |
|---|---------|--------|
| 1 | `001_create_users.sql` | Sem dependências. Também cria a extensão `pgcrypto`. |
| 2 | `002_create_products.sql` | Sem dependências. |
| 3 | `003_create_orders.sql` | Sem dependências. |
| 4 | `004_create_order_items.sql` | Depende de `orders` e `products`. |
| 5 | `005_create_picking_evidences.sql` | Depende de `order_items` e `users`. |
| 6 | `006_create_missing_items.sql` | Depende de `order_items` e `users`. |

Para rodar todas em sequência (psql):
```bash
psql -U stockroute_user -d stockroute \
  -f migrations/001_create_users.sql \
  -f migrations/002_create_products.sql \
  -f migrations/003_create_orders.sql \
  -f migrations/004_create_order_items.sql \
  -f migrations/005_create_picking_evidences.sql \
  -f migrations/006_create_missing_items.sql \
  -f seeds/seed_001_initial.sql
```

---

## Tabelas

### `users`
Usuários do sistema. Dois papéis: `ADMIN` e `ESTOQUISTA`. Senha hasheada pelo backend (bcrypt) antes de salvar.

### `products`
Produtos do estoque. Cada produto tem uma **unidade de medida fixa** (`unit`). Caixa de parafuso e saco de parafuso são produtos distintos.

**Unidades disponíveis:**
| Código | Descrição |
|--------|-----------|
| `UN` | Unidade |
| `CX` | Caixa |
| `SC` | Saco |
| `PC` | Peça |
| `CT` | Cartela |
| `PR` | Par |
| `M`  | Metro |

### `orders`
Pedidos importados de DAVs (PDFs). Cada pedido tem um `order_number` único. O `pdf_url` aponta para o arquivo original que foi lido para gerar o pedido.

**Status possíveis:** `PENDING` → `IN_PROGRESS` → `COMPLETED` / `CANCELLED`

### `order_items`
Itens de cada pedido. Rastreia quantidades pedidas, separadas e faltantes.

**Regra de consistência (dupla proteção):**
- CHECK no banco: `picked_quantity + missing_quantity <= quantity`
- Validação no backend antes de qualquer UPDATE

**Status possíveis:** `PENDING`, `PICKED`, `PARTIAL`, `MISSING`

### `picking_evidences`
Fotos tiradas durante a separação. Um item pode ter zero ou mais fotos. Sem limite no banco — limite definido no backend.

### `missing_items`
Registros de itens não encontrados. `reason` é texto livre, sem enum. Um item com `missing_quantity > 0` deve ter ao menos um registro aqui (validado no backend).

---

## Decisões de ON DELETE

| FK | Política | Motivo |
|----|----------|--------|
| `order_items.order_id` | CASCADE | Itens não fazem sentido sem o pedido |
| `order_items.product_id` | RESTRICT | Produto com histórico de pedidos não deve ser deletado |
| `picking_evidences.order_item_id` | CASCADE | Evidências seguem o item |
| `picking_evidences.created_by` | RESTRICT | Não deleta usuário com evidências registradas |
| `missing_items.order_item_id` | CASCADE | Faltantes seguem o item |
| `missing_items.created_by` | RESTRICT | Não deleta usuário com registros de faltantes |

---

## Índices criados

| Índice | Tabela | Motivo |
|--------|--------|--------|
| `idx_users_email` | users | Login (busca por email) |
| `idx_users_role` | users | Listagem por papel |
| `idx_products_sku` | products | Import de DAV — lookup de SKU |
| `idx_products_name` | products | Busca textual (GIN full-text) |
| `idx_orders_order_number` | orders | Deduplicação de DAV importado |
| `idx_orders_status` | orders | Filtro de painel por status |
| `idx_orders_created_at` | orders | Ordenação padrão |
| `idx_order_items_order_id` | order_items | Query mais frequente do sistema |
| `idx_order_items_product_id` | order_items | JOIN com produtos |
| `idx_order_items_status` | order_items | Filtro por status do item |
| `idx_picking_evidences_order_item_id` | picking_evidences | Busca de fotos por item |
| `idx_picking_evidences_created_by` | picking_evidences | Auditoria por usuário |
| `idx_missing_items_order_item_id` | missing_items | Busca de faltantes por item |
| `idx_missing_items_created_by` | missing_items | Auditoria por usuário |

---

## Fluxo de importação de DAV (PDF)

1. Backend lê o PDF e extrai: `order_number`, `customer_name`, lista de itens (SKU + quantidade)
2. Backend verifica se `order_number` já existe (`Q07`) — se sim, rejeita duplicata
3. Backend insere o pedido em `orders` com `status = 'PENDING'` e `pdf_url` apontando para o arquivo salvo
4. Para cada item do PDF, faz lookup do produto por SKU (`Q08`)
5. Insere cada item em `order_items` com `quantity` e `status = 'PENDING'`

---

## Variáveis de ambiente necessárias

```env
DB_HOST=localhost
DB_PORT=5433
DB_NAME=picking_system
DB_USER=admin
DB_PASSWORD=sua_senha_aqui
DB_SSL=false
```
