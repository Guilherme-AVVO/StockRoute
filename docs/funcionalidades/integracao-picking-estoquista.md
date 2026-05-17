# Integração do picking do ESTOQUISTA com backend e banco

Substitui o fluxo do estoquista que estava 100% mockado por chamadas reais à API.

## Visão geral do fluxo

1. ESTOQUISTA faz login (`POST /auth/login`) e o frontend redireciona para `StockistApp`
   (já existia: `App.jsx` chaveia por `user.role`).
2. `StockistApp` consulta `GET /stockist/my-active` para retomar um pedido em
   separação caso o estoquista já tenha um aberto.
3. `StockistOrders` chama `GET /stockist/orders` e mostra pedidos publicados
   (status `IN_PROGRESS` no banco) ainda não atribuídos — exibidos como
   `AGUARDANDO` no DTO.
4. Ao clicar em "Iniciar separação" o frontend chama
   `POST /stockist/orders/:id/start`. Backend:
   - rejeita com 409 se o estoquista já tem outro pedido `PICKING`;
   - rejeita com 409 se o pedido não está mais `IN_PROGRESS`;
   - atualiza `status=PICKING`, `assigned_to`, `started_at`.
5. `StockistPicking` chama `GET /stockist/orders/:id` e renderiza itens reais.
6. Para coletar um item, o frontend envia `multipart/form-data` com a foto
   para `POST /stockist/order-items/:itemId/collect`. Backend:
   - exige foto (400 sem ela);
   - valida que o item está em um pedido `PICKING` atribuído ao usuário;
   - grava em disco em `backend/uploads/picking/`;
   - atualiza `order_items.status=PICKED`, `picked_quantity=quantity`,
     `confirmation_photo_url`, `collected_at`.
7. "Não encontrado" chama `POST /stockist/order-items/:itemId/not-found`
   exigindo um dos motivos enumerados; quando o motivo é `Outro`, a nota
   também é obrigatória. Backend grava `status=MISSING`,
   `not_found_reason`, `not_found_notes`.
8. "Finalizar pedido" chama `POST /stockist/orders/:id/finish`. Backend:
   - bloqueia (400) enquanto houver item visível `PENDING`;
   - decide `status=COMPLETED` (todos coletados) ou `status=OBSERVATION`
     (algum não encontrado);
   - preenche `finished_at`.
9. `StockistOrderSummary` chama `GET /stockist/orders/:id/summary` e renderiza
   tempos, fotos, motivos e status final reais. Quando final é OBSERVAÇÃO,
   mostra alerta orientando o ADMIN a revisar.

## Endpoints criados

Todas protegidas por `authMiddleware` + `requireRole('ESTOQUISTA')`.

| Método | Caminho                                       | Descrição                                            |
| -----: | --------------------------------------------- | ---------------------------------------------------- |
| GET    | `/stockist/orders`                            | Lista pedidos AGUARDANDO separação                   |
| GET    | `/stockist/my-active`                         | Pedido EM_SEPARACAO do estoquista logado (se houver) |
| POST   | `/stockist/orders/:orderId/start`             | Inicia separação                                     |
| GET    | `/stockist/orders/:orderId`                   | Pedido + itens + progresso                           |
| GET    | `/stockist/orders/:orderId/summary`           | Resumo final agregado                                |
| POST   | `/stockist/orders/:orderId/finish`            | Finaliza (calcula CONCLUIDO/OBSERVACAO)              |
| POST   | `/stockist/order-items/:itemId/collect`       | Confirma coleta com foto (multipart `photoFile`)     |
| POST   | `/stockist/order-items/:itemId/not-found`     | Marca como não encontrado com motivo e nota          |

## Esquema do banco (migration 016)

- `orders`: novas colunas `delivery_date`, `assigned_to`, `started_at`,
  `finished_at`. Expande `status` para aceitar `PICKING` e `OBSERVATION`.
  Índice único parcial garante 1 pedido `PICKING` por estoquista.
- `order_items`: novas colunas `confirmation_photo_url`, `collected_at`,
  `not_found_reason`, `not_found_notes`.
- Mapeamento status banco → label do estoquista (somente nas rotas /stockist):
  - `IN_PROGRESS` → `AGUARDANDO`
  - `PICKING` → `EM_SEPARACAO`
  - `COMPLETED` → `CONCLUIDO`
  - `OBSERVATION` → `OBSERVACAO`

## Regra "1 pedido ativo por estoquista"

Garantida em duas camadas:

1. `pickingService.startPicking` consulta `findActivePickingByUser` antes de
   transicionar e retorna 409 com `activeOrderId` se já houver pedido aberto.
2. Índice único parcial `uq_orders_one_picking_per_user` (migration 016).

## Foto de referência vs foto de confirmação

- **Foto de referência**: `products.image_url`, cadastrada pelo ADMIN no CRUD
  de produtos. Aparece no card do item e no modal "Referência" para o
  estoquista identificar o produto. **Nunca é alterada pelo estoquista.**
- **Foto de confirmação**: `order_items.confirmation_photo_url`, capturada
  pelo estoquista ao confirmar a coleta. Salva em `backend/uploads/picking/`
  e exposta via `/uploads/picking/<arquivo>`. Aparece no card do item
  coletado e no resumo final.

## Upload de fotos

- Multer com disk storage em `backend/uploads/picking/`.
- Limite 8MB, somente `image/*`.
- Servidor expõe pasta estática em `/uploads`.
- Se o backend rejeitar a coleta (regra de negócio), o controller apaga
  o arquivo recém-gravado para não sobrar lixo.
- `.gitignore` já ignora `uploads/`.

## Auditoria

Eventos emitidos via `auditService.logAuditEvent`:

- `PICKING_STARTED` — quando o estoquista inicia
- `PICKING_ITEM_COLLECTED` — em cada coleta (com `evidence_url` da foto)
- `PICKING_ITEM_NOT_FOUND` — quando o item é marcado como faltante
- `PICKING_FINISHED` — no fechamento do pedido
- `ORDER_STATUS_CHANGED` — par PICKING → COMPLETED/OBSERVATION

## Frontend

- `frontend/src/services/stockistService.js` concentra `listAvailableOrders`,
  `startPicking`, `getPickingOrder`, `collectItem`, `markItemNotFound`,
  `finishPicking`, `getOrderSummary`, `getMyActivePicking` e o helper
  `resolveAssetUrl` (resolve caminhos `/uploads/...` para URL absoluta usando
  `VITE_API_URL`). Tudo com `fetch` nativo e `Authorization: Bearer <token>`.
- `frontend/src/pages/stockist/mockData.js` foi removido. Formatadores e
  enums foram extraídos para `stockistFormat.js`.
- Componentes de modal (`CollectItemModal`, `NotFoundModal`,
  `ProductReferenceModal`) usam os campos reais: `productName`,
  `productPhotoUrl`, `confirmationPhotoUrl`, `manufacturerName`,
  `manufacturerReference`, `reason`, `notes`. O modal de coleta agora
  recebe `busy` para desabilitar o botão durante o upload e o item só é
  marcado como COLETADO após a confirmação da API.
- `StockistApp.jsx` consulta `GET /stockist/my-active` ao montar para
  permitir retomar o pedido aberto se o estoquista recarregar o navegador.

## Como testar manualmente

1. Suba o ambiente (Postgres + backend + frontend).
2. Logue como `estoquista@stockroute.com / estoque123`.
3. Crie pedidos `IN_PROGRESS` (via importação DAV + publicação do ADMIN,
   ou via SQL como nos exemplos abaixo).
4. Liste, inicie a separação, tente iniciar outro (deve dar 409), abra
   "Referência", coleta com foto, marque outro como "Não encontrado",
   tente finalizar antes de processar tudo (deve dar 400), finalize.
5. Recarregue a página: a tela deve retomar o pedido aberto ou abrir a
   lista, conforme o estado salvo no banco.

Exemplo SQL para semear pedidos publicados:

```sql
INSERT INTO orders (order_number, customer_name, status, delivery_date)
VALUES ('DAV-TEST-001', 'Cliente Teste', 'IN_PROGRESS', CURRENT_DATE)
RETURNING id;
-- depois insira order_items vinculando ao id retornado.
```

## Resolução de pendências pelo ADMIN (OBSERVAÇÃO)

Quando o picking termina como `OBSERVATION` (pelo menos 1 item `MISSING`),
o ADMIN pode atuar diretamente na tela **Pedidos**:

1. Selecionar o pedido e clicar em **"Resolver pendências"** —
   abre o modal carregando `GET /orders/:id` com a lista de itens MISSING.
2. Para cada item, **"Marcar encontrado"** abre o input de foto
   (obrigatória). Frontend chama
   `POST /orders/:orderId/items/:itemId/resolve-missing` (multipart
   `photoFile`). O item vira `PICKED` no banco; se foi a última
   pendência, o pedido vai automaticamente para `COMPLETED` e
   `finished_at` é atualizado.
3. **"Enviar mesmo com pendência"** abre um campo opcional de
   justificativa e chama
   `POST /orders/:orderId/ship-with-missing`. Pedido vira `COMPLETED`;
   itens `MISSING` continuam como tais no histórico (auditoria registra
   quem autorizou e a nota).

Regras backend (`adminPickingService.js`):
- só atua sobre pedidos em `OBSERVATION`;
- só converte itens com status `MISSING` (não toca `PENDING` nem
  `PICKED`);
- foto é obrigatória em resolve-missing (mesmo storage / pasta /
  limites do upload do estoquista).

Eventos de auditoria adicionados:
- `PICKING_ITEM_RESOLVED_BY_ADMIN` — uma resolução de item.
- `ORDER_SHIPPED_WITH_MISSING` — autorização do envio com pendência.
- Quando há auto-promoção `OBSERVATION → COMPLETED`, também grava
  `ORDER_STATUS_CHANGED` com `autoPromoted: true`.

## Limitações atuais

- Não há limpeza periódica de fotos órfãs em `uploads/picking/` (se o item
  for re-coletado, a foto antiga continua no disco).
- A área ADMIN ainda mostra os status legados (`PENDING`, `IN_PROGRESS`,
  `COMPLETED`). Os novos status `PICKING` e `OBSERVATION` aparecerão no
  filtro do admin sem rótulo customizado até que a tela de admin seja
  atualizada — esse trabalho fica fora do escopo desta integração.
