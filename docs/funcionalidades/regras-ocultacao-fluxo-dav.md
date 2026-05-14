# Regras de ocultação no fluxo DAV

## Ordem de roteamento do item DAV

Para cada item extraído do DAV, o backend decide o destino nesta ordem:

1. Verifica regras ativas em `ignored_dav_items`.
2. Se alguma regra casar, registra a ocorrência como `HIDDEN` em `unlinked_dav_items`, salva `ignored_rule_id` e motivo, e não cria `order_items`.
3. Se não houver regra e existir produto cadastrado, cria `order_items` para revisão e picking.
4. Se não houver regra nem produto cadastrado, registra em `unlinked_dav_items` com `status='PENDING'`.

A função central dessa decisão é `resolveDavItemRouting`, em `backend/src/services/orderService.js`.

## Quando vai para revisão

O item vai para revisão normal apenas quando não cai em regra de ocultação e possui produto cadastrado. Esses itens são gravados em `order_items` e retornam em `GET /orders/:id`.

## Quando vai para não vinculados

O item vai para "Não vinculados" quando não cai em regra de ocultação e não possui produto cadastrado. Ele fica em `unlinked_dav_items` com `status='PENDING'`.

Itens ocultos por regra não aparecem nessa aba.

## Quando vai para ocultos

O item vai para "Ocultos" quando alguma regra ativa casa por SKU, descrição, prefixo, referência do fabricante ou fabricante, conforme `match_type`.

Nesse caso:

- `unlinked_dav_items.status = 'HIDDEN'`
- `ignored_rule_id` aponta para a regra aplicada
- `resolution_note` preserva o motivo
- o item não entra em `order_items`
- o item não vai para picking

## Mostrar itens ocultos na revisão

A tela de Revisões tem o toggle "Mostrar itens ocultos", desligado por padrão.

Quando desligado, a tela chama `GET /orders/:id` e mostra só os itens normais.

Quando ligado, chama `GET /orders/:id?includeHidden=true` e mostra uma seção separada "Itens ocultos deste pedido" com badge "Oculto por regra", motivo e regra aplicada.

## Como testar a regra INST.

1. Criar regra ativa:
   - Tipo: `DESCRIPTION_CONTAINS`
   - Valor: `INST.`
   - Motivo: `Item de instalação/fábrica não deve ir para picking.`
2. Importar ou simular DAV com descrição `FITA INST. BCO TX 0.7 X 22MM - TB`.
3. Confirmar que o item:
   - aparece em Ocultos
   - não aparece em Não vinculados
   - não aparece na revisão normal
   - aparece na revisão quando "Mostrar itens ocultos" está ligado

## Limitações atuais

- Itens ocultos ficam em `unlinked_dav_items` porque `order_items.product_id` é obrigatório.
- Desativar uma regra não reprocessa DAVs já importados.
- Não há endpoint específico de desocultar ocorrência já importada; a UI desativa regras futuras.
