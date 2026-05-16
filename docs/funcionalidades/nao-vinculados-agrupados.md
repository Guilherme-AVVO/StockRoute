# Itens não vinculados agrupados

A aba "Não vinculados" agora apresenta **um card por produto não cadastrado**, não um card por ocorrência. Itens iguais vindos de pedidos diferentes ficam sob a mesma entrada; uma única ação do ADMIN (cadastrar, vincular ou ocultar) resolve o produto em todos os pedidos afetados.

## Como itens iguais são identificados

Função central: [`buildUnlinkedItemGroupKey`](../../backend/src/utils/unlinkedDavItemGroup.js) em `backend/src/utils/unlinkedDavItemGroup.js`.

A chave segue a regra de prioridade abaixo (a primeira que dá match é usada):

1. `REF:<manufacturerReference>|FAB:<manufacturerName>`
2. `REF:<manufacturerReference>` (quando o fabricante não está preenchido)
3. `SKU:<rawSku>|FAB:<manufacturerName>`
4. `SKU:<rawSku>`
5. `DESC:<rawDescription>|FAB:<manufacturerName>`
6. `DESC:<rawDescription>` (sem fabricante)

Normalização aplicada antes de gerar a chave:

- `trim`;
- colapso de espaços duplos;
- `toUpperCase`;
- remoção de diacríticos para a descrição.

Quantidade, DAV e pedido **não** entram na chave — itens com mesma identidade em pedidos diferentes pertencem ao mesmo grupo.

## Endpoints

Todos exigem auth + role `ADMIN`. Prefixo: `/unlinked-dav-items`.

| Método | Rota | Função |
|--------|------|--------|
| GET    | `/groups`          | Lista grupos pendentes |
| POST   | `/groups/register` | Cadastra produto a partir do grupo + vincula todos os itens |
| POST   | `/groups/link`     | Vincula todos os itens do grupo a um produto existente |
| POST   | `/groups/hide`     | Oculta todos os itens do grupo + cria regra `NAME_CONTAINS` |

### `GET /groups` — formato de resposta

```json
[
  {
    "groupKey": "REF:ABC123|FAB:ALTERNATIVA",
    "sampleItemId": "uuid",
    "manufacturerReference": "ABC123",
    "manufacturerName": "ALTERNATIVA",
    "sku": "00000000000994",
    "rawDescription": "PUX PERFIL 5046T 15MM BRONZE 3M",
    "unit": "UN",
    "occurrences": 10,
    "totalQuantity": 42,
    "affectedOrdersCount": 7,
    "orders": [
      { "orderId": "uuid", "davNumber": "...", "clientName": "...", "quantity": 11 }
    ],
    "itemIds": ["uuid", "uuid", "..."],
    "createdAt": "..."
  }
]
```

Critérios: apenas `unlinked_dav_items.status = 'PENDING'`. Itens ocultos (HIDDEN) e itens já vinculados (LINKED) não aparecem.

### `POST /groups/register`

Payload: `{ groupKey, sku, name, unit, imageUrl?, manufacturerReference?, manufacturerName? }`.

Resposta:
```json
{ "product": { "id": "...", "...": "..." }, "linkedItemsCount": 10, "affectedOrdersCount": 7 }
```

Se já existe produto com o mesmo SKU → `409` com `existingProductId`. **Decisão**: não criamos duplicado silenciosamente nem reaproveitamos automaticamente; o ADMIN deve usar **Vincular** apontando o SKU existente. Isso mantém SKU global único, alinhado ao fluxo single-item original.

### `POST /groups/link`

Payload: `{ groupKey, productId }`. Resposta: `{ product, linkedItemsCount, affectedOrdersCount }`.

### `POST /groups/hide`

Payload: `{ groupKey, reason }`. Resposta: `{ rule, hiddenItemsCount, affectedOrdersCount }`.

Marca os itens com `hidden_manually = TRUE` **antes** de criar a regra (a ordem importa: ao criar a regra, a reaplicação automática vê os itens já manuais e os preserva). A regra criada (`NAME_CONTAINS` pela descrição do sample) entra em vigor para próximos DAVs.

## Persistência

Tudo acontece no banco — nada permanece apenas no estado React:

- `unlinked_dav_items`: itens do grupo recebem `product_id`, `status = LINKED`, `resolved_at`, `resolved_by`, `resolution_note`.
- `order_items`: um novo registro por pedido afetado, mantendo a quantidade original.
- `products`: o novo produto (com ref/fabricante) entra no catálogo e passa a ser usado para matching automático em DAVs futuros.

## Frontend

Página `AdminIgnoredItems`, aba **Não vinculados**:

- Uma linha por grupo (não por ocorrência).
- Coluna "Pedidos": botão que expande a lista detalhada de DAVs/clientes/quantidades.
- Botões: **Cadastrar**, **Vincular**, **Ocultar**, **Criar regra**.
- Após cada ação, o feedback inclui contagens: `X item(ns) em Y pedido(s)`.
- A lista é recarregada via API; o grupo resolvido some.

## Como testar

1. Importar 3 DAVs com o mesmo item não cadastrado (mesma `manufacturerReference` + `manufacturerName`), quantidades distintas.
2. Verificar no banco que existem 3 linhas em `unlinked_dav_items` com `status = 'PENDING'`.
3. Abrir a aba **Não vinculados** — deve aparecer **uma única entrada** com `occurrences = 3`.
4. Clicar **Cadastrar produto** e salvar.
5. Resultado: o grupo some, o produto aparece em **Produtos**, cada pedido tem um `order_item` com a quantidade original.
6. Recarregar o navegador: o grupo continua sumido (persistência verificada).
7. Repetir com **Vincular a produto existente** e **Ocultar grupo** para validar os outros fluxos.

## Cuidados conhecidos

- A query lista todos os PENDING; com volume muito alto, considerar paginação no futuro.
- Se um item for adicionado entre o `listGroups` e o `register`/`link`/`hide`, a função `resolveGroupItemIds` recalcula os ids no momento da ação — então itens recém-adicionados ao mesmo grupo também são incluídos.
- Ocultação manual de um grupo cria uma regra que pode afetar DAVs futuros pelo padrão `NAME_CONTAINS`. Isso é coerente com o fluxo single-item que já criava regra ao ocultar.
