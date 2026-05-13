# Cadastro de produtos com referência do fabricante

## Por que referência/fabricante são necessários

O DAV traz, para cada item, uma coluna **"Referência/Fabricante"**. Exemplo
do item 011 do DAV 113364:

```
011 00000000001884
MOTMD
FITA INST. BCO TX 0.7 X 22MM - TB M 11 4.40 48.40 MULTIMARCA
W070123TX1022N 1 11
```

Onde:
- `00000000001884` → SKU interno do DAV (gerado pelo sistema da loja)
- `MULTIMARCA` → nome do fabricante
- `W070123TX1022N` → código/referência do fabricante

Sem esses dois campos no nosso catálogo, é impossível diferenciar produtos
com nome ou SKU parecidos, e impossível fazer **match automático** de itens
em DAVs futuros — o ADMIN teria que vincular tudo manualmente toda vez.

## Diferença entre SKU interno e referência do fabricante

| Campo | Origem | Exemplo | Estável? |
|---|---|---|---|
| `sku`                     | Catálogo interno (definido pelo ADMIN) | `FITA-INST-BCO-TX-022` | Sim |
| `manufacturer_reference`  | Código do fabricante no DAV            | `W070123TX1022N`       | Sim |
| `manufacturer_name`       | Nome do fabricante no DAV              | `MULTIMARCA`           | Sim |
| `rawSku` (do DAV)         | Código interno do sistema da loja      | `00000000001884`       | Não garantido entre lojas |

O `sku` do catálogo é livre; a **referência do fabricante** é a chave externa
que liga o produto ao mundo real.

## Como o DAV fornece esses dados

O parser ([backend/src/services/davParserService.js](../../backend/src/services/davParserService.js))
extrai cada item em 3-4 linhas do PDF:

- **Linha A**: `<seq3> <sku14>`
- **Linha B**: `MOTMD`
- **Linha C**: `<descrição> <UNIT> <QTY> <PRICE> <TOTAL> <FABRICANTE> [<endereço>] [<TB> <SALDO>]`
- **Linha D (opcional)**: `<REFERÊNCIA> [<endereço>] <TB> <SALDO>`

Heurística do parser:
1. Após o último match `UNIT QTY PRICE TOTAL` na linha C, o restante começa com o fabricante.
2. Removemos TB+saldo numéricos e endereço alfanumérico curto do final.
3. Se a próxima linha existe e não começa um novo item, o primeiro token alfanumérico é a referência.

A heurística não é perfeita para 100% dos casos (endereços compostos, fabricantes
com formatação atípica), mas captura corretamente os casos mais comuns (`MULTIMARCA`,
`MOTOMADEIRAS`, `LEVIMAR`, `RENNA`, `USAF`, `HAFELE`, etc.). O ADMIN pode editar
manualmente antes de salvar o produto.

## Como o matching automático funciona

Quando o `importDav` processa cada item, a ordem de busca pelo produto é:

1. **manufacturer_reference + manufacturer_name** normalizados (UPPER + TRIM)
2. **manufacturer_reference** sozinha (fallback caso o fabricante esteja diferente)
3. **SKU 14 dígitos** do DAV (fallback histórico — útil para produtos antigos)
4. **SKU 14 dígitos sem zeros à esquerda** (último fallback)

A descrição **nunca** é usada para vínculo automático: ela pode mudar entre DAVs
e gerar falsos positivos. Aparece apenas como referência visual ao ADMIN.

Função: `findProductForDavItem` em [backend/src/services/orderService.js](../../backend/src/services/orderService.js).

Query principal: `findProductByManufacturerReference` em [backend/db/queries/products.js](../../backend/db/queries/products.js).

## Como item não cadastrado vai para "Não vinculados"

Quando os 4 passos acima não encontram produto, o item é inserido em
`unlinked_dav_items` com:

- `order_id`               — pedido de origem
- `raw_sku`                — SKU 14-dígitos do DAV (preservado)
- `raw_description`        — descrição do DAV (preservada)
- `quantity`, `unit`       — quantidade/unidade originais
- `manufacturer_reference` — referência extraída pelo parser (preservada)
- `manufacturer_name`      — fabricante extraído pelo parser (preservado)
- `status`                 — `PENDING` (aguardando ação do ADMIN)

Item aparece na aba **Itens ignorados → Não vinculados** com todos os campos
acima visíveis, incluindo `Ref. fabricante` e `Fabricante`.

## Como o ADMIN cadastra produto a partir de item não vinculado

Na aba "Não vinculados":

1. ADMIN clica em **Cadastrar** no item desejado.
2. Modal abre **pré-preenchido**:
   - SKU: `rawSku` do DAV
   - Nome: `rawDescription` do DAV
   - Unidade: `unit` do DAV (se for válida, senão `UN`)
   - **Ref. fabricante**: `manufacturer_reference` do DAV
   - **Fabricante**: `manufacturer_name` do DAV
3. ADMIN pode editar qualquer campo antes de salvar.
4. Submit faz `POST /unlinked-dav-items/:id/create-product` com o body completo.
5. Backend (`unlinkedDavItemsService.registerAsNewProduct`):
   - Valida campos (SKU/name/unit obrigatórios).
   - Retorna **409** se já existir produto com mesmo SKU. ADMIN deve usar **Vincular** nesse caso.
   - Cria produto em `products` com manufacturer_reference + manufacturer_name normalizados (UPPER).
   - Cria `order_item` (o item vai para o picking).
   - Marca `unlinked_dav_items.status = 'LINKED'`.
6. Item some da aba "Não vinculados" e produto aparece na tela Produtos.

## Como garantir que no próximo DAV o produto é puxado automaticamente

Garantido pela query `findProductByManufacturerReference`: ao reimportar
qualquer DAV cujo item tenha `manufacturer_reference` igual (case-insensitive)
ao do produto cadastrado, `findProductForDavItem` retorna o produto sem precisar
de ação manual. O item vira `order_item` direto.

## Estrutura de banco (migration 009)

```sql
ALTER TABLE products
  ADD COLUMN manufacturer_reference TEXT,
  ADD COLUMN manufacturer_name      TEXT;

CREATE INDEX idx_products_manufacturer_reference
  ON products (manufacturer_reference);

CREATE INDEX idx_products_manufacturer_ref_name
  ON products (manufacturer_reference, manufacturer_name);

ALTER TABLE unlinked_dav_items
  ADD COLUMN manufacturer_reference TEXT,
  ADD COLUMN manufacturer_name      TEXT;
```

**Decisão sobre uniqueness**: índices NÃO são `UNIQUE`. A mesma referência pode
aparecer em fabricantes diferentes (improvável, mas possível). Se virar um problema
operacional, podemos adicionar `UNIQUE (manufacturer_reference, manufacturer_name)`
depois — sem perda de dados.

## Como testar

### Caminho feliz — match automático
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@stockroute.com","password":"admin123"}' \
  | jq -r .token)

# 1) Cadastra produto com manufacturer fields
curl -X POST http://localhost:3000/products \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"sku":"FITA-INST-BCO-TX-022","name":"Fita Branca 22mm","unit":"M",
       "manufacturerReference":"W070123TX1022N","manufacturerName":"MULTIMARCA"}'

# 2) Importa DAV — item com mesma ref deve ser vinculado automaticamente
curl -X POST http://localhost:3000/orders/import \
  -H "Authorization: Bearer $TOKEN" \
  -F "pdf=@/caminho/wagner0000000113364_dav.pdf"

# 3) Não-vinculados não deve incluir esse item
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/unlinked-dav-items
```

### Caminho do ADMIN — cadastrar a partir de não vinculado
```bash
# 1) Após import, pega um item não vinculado
ITEM=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/unlinked-dav-items | jq -r '.[0].id')

# 2) Cadastra produto incluindo manufacturer
curl -X POST http://localhost:3000/unlinked-dav-items/$ITEM/create-product \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"sku":"CANT-CAPA-BR-10","name":"Cantoneira (kit 10)","unit":"CX",
       "manufacturerReference":"AP813","manufacturerName":"MULTIMARCA"}'

# 3) Item some da lista
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/unlinked-dav-items | jq length   # → 0

# 4) Próximo DAV com a mesma ref → vincula automaticamente
```

## Limitações conhecidas

1. **Heurística do parser**: para fabricantes/endereços com formatação atípica
   (ex: "C 01 D", "GALPAO 2", "FGV TN BRASIL"), o nome do fabricante pode vir com
   sufixo de endereço. O ADMIN deve editar no modal antes de salvar.
2. **Sem normalização separada**: não temos colunas `normalized_*`. A normalização
   (UPPER + colapsar espaços) é feita no service antes do INSERT. Suficiente para
   o volume atual.
3. **Sem reabertura**: itens `LINKED`/`HIDDEN` não voltam para `PENDING` via UI.
