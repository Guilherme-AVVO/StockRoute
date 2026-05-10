# Itens DAV ignorados no picking

## 1. Contexto

O DAV pode conter produtos da fábrica, serviços, processos internos, cortes, furações, beneficiamentos ou outros itens que aparecem no pedido, mas não exigem separação física no estoque.

## 2. Problema

Enviar esses itens para o estoquista gera ruído operacional, retrabalho e confusão. A lista do estoquista deve representar apenas os produtos que precisam ser localizados e separados fisicamente no estoque.

## 3. Decisão

O ADMIN poderá marcar um item extraído do DAV como “ignorar sempre no picking”. Essa decisão será registrada em `ignored_dav_items` para que o sistema reconheça o mesmo SKU/código/descrição em futuros PDFs DAV.

## 4. Como funciona

Fluxo esperado:

```text
PDF DAV
→ extração dos itens
→ comparação com catálogo de produtos
→ comparação com ignored_dav_items
→ item cadastrado no catálogo entra no picking
→ item com regra ativa sai da lista do estoquista
→ item desconhecido vai para revisão ADMIN
```

O item ignorado não deve ser apagado do pedido. Ele deve continuar registrado para auditoria/histórico quando o módulo de pedidos tiver suporte a essa marcação.

## 5. Benefícios

- Reduz revisão repetida pelo ADMIN.
- Evita que itens da fábrica apareçam para o estoquista.
- Mantém rastreabilidade.
- Melhora a precisão da lista de picking.
- Permite que o sistema aprenda com revisões anteriores do ADMIN.

## 6. Impacto no banco

Foi criada a migration `007_create_ignored_dav_items.sql` para a tabela `ignored_dav_items`.

Campos:

- `id`: chave primária UUID.
- `raw_sku`: SKU/código original extraído do DAV.
- `normalized_sku`: SKU/código normalizado para comparação.
- `raw_description`: descrição original extraída do DAV.
- `normalized_description`: descrição normalizada para fallback de comparação.
- `match_type`: tipo de correspondência (`SKU`, `DESCRIPTION`, `SKU_AND_DESCRIPTION`).
- `reason`: motivo informado pelo ADMIN.
- `active`: permite desativar regra sem apagar histórico.
- `created_by`: usuário ADMIN que cadastrou a regra.
- `created_at` e `updated_at`: auditoria temporal.

A migration cria índices para `normalized_sku`, `normalized_description`, `active` e `created_by`. Não foi criada constraint única parcial nesta etapa para evitar bloquear casos futuros de dados reais sem validação de produto definida.

## 7. Impacto no backend

Foram criados:

- `backend/db/queries/ignoredDavItems.js`: consultas SQL puras para criar, listar, desativar e buscar regras ativas.
- `backend/src/utils/normalizeDavItem.js`: normalização simples de SKU e descrição.
- `backend/src/services/ignoredDavItemsService.js`: service com `shouldIgnoreDavItem({ rawSku, rawDescription })`.

A função `shouldIgnoreDavItem` normaliza o item extraído do DAV, procura primeiro por SKU ativo e depois por descrição normalizada. O retorno indica se o item deve ser ignorado, qual regra foi encontrada e o motivo cadastrado.

## 8. Impacto no fluxo ADMIN

Quando a tela de revisão do DAV for implementada, ela deve permitir:

- Vincular item a produto existente.
- Cadastrar produto novo.
- Ignorar apenas neste pedido.
- Ignorar sempre no picking.

A opção “ignorar sempre no picking” deve criar uma regra em `ignored_dav_items`.

## 9. Impacto no fluxo ESTOQUISTA

Itens com regra ativa em `ignored_dav_items` não devem aparecer na lista física do estoquista. O estoquista deve receber apenas itens separáveis no estoque.

## 10. Auditoria

Itens ignorados não devem ser apagados. A regra `ignored_dav_items` registra o padrão que causou a exclusão da lista de picking, enquanto o módulo de pedidos deve preservar a ocorrência do item no histórico do pedido quando essa etapa for implementada.

## 11. Como explicar em entrevista

Durante o desenvolvimento do StockRoute, percebi que nem todo item do DAV representava um produto que precisava ser separado no estoque. Alguns itens eram serviços ou processos internos, como corte e furação. Para evitar que o estoquista recebesse itens que não exigiam coleta física, modelei uma tabela de regras chamada `ignored_dav_items`. Assim, quando o ADMIN identifica um item não separável, o sistema aprende esse padrão e passa a ignorá-lo automaticamente nos próximos PDFs, sem apagar o histórico do pedido. Essa solução reduz retrabalho, mantém rastreabilidade e separa melhor o fluxo administrativo do fluxo operacional do estoquista.
