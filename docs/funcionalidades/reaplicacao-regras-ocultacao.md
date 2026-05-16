# Reaplicação de regras de ocultação

Sempre que uma regra de ocultação é criada, editada, ativada, desativada ou apagada, o backend recalcula o estado de **todos** os itens DAV/pedidos já persistidos para que reflitam as regras vigentes.

## Quando dispara

A reaplicação é executada automaticamente após cada uma destas mutações em `ignored_dav_items`:

- `POST /ignored-dav-items` — criar regra
- `PUT /ignored-dav-items/:id` — editar regra
- `PATCH /ignored-dav-items/:id/status` — ativar/desativar
- `DELETE /ignored-dav-items/:id` — soft delete

A resposta da API agora inclui o resumo da reaplicação:

```json
{
  "rule":  { "id": "…", "matchType": "NAME_CONTAINS", "...": "..." },
  "reapplySummary": {
    "evaluated":       12,
    "hidden":          3,
    "unhidden":        2,
    "keptHidden":      1,
    "keptVisible":     6,
    "preservedManual": 4
  }
}
```

## Como itens antigos passam a ser ocultados

Para cada `order_item` (item já vinculado a produto) e cada `unlinked_dav_items` elegível:

1. Avalia contra todas as regras ativas (`active = TRUE AND deleted_at IS NULL`) via `shouldIgnoreDavItem`.
2. Se bate uma regra:
   - `order_items`: marca `hidden = TRUE`, `ignored_rule_id`, `hide_reason`.
   - `unlinked_dav_items`: muda `status` para `HIDDEN`, preenche `ignored_rule_id` e `resolution_note`.
3. Se **não** bate nenhuma regra ativa **e** estava oculto por regra anteriormente:
   - `order_items`: limpa `hidden`, `ignored_rule_id`, `hide_reason` — volta para revisão/picking.
   - `unlinked_dav_items`: volta `status` para `PENDING`, limpa `ignored_rule_id` e `resolution_note`.

Isso vale para pedidos antigos: se uma regra é criada **depois** que o pedido foi importado, ela é aplicada da mesma forma que se a regra existisse no momento do upload.

## Ocultação manual vs ocultação por regra

A coluna `unlinked_dav_items.hidden_manually` (migration 013) distingue as duas origens:

- `hidden_manually = TRUE` — o ADMIN ocultou explicitamente aquele item pelo botão **Ocultar** na aba "Não vinculados". A reaplicação **nunca** desfaz uma ocultação manual.
- `hidden_manually = FALSE` — o item ficou oculto pela aplicação automática de uma regra. A reaplicação reavalia e pode trazer de volta para PENDING.

`order_items.hidden` representa exclusivamente ocultação por regra — não existe ocultação manual de item já vinculado a produto.

## Caso especial: pedidos antigos

> Pedido importado antes da regra existir → cria regra → o item antigo passa a ficar oculto.

Coberto por `listAllOrderItemsForReapply()` e `listUnlinkedDavItemsForReapply()` que varrem **todas** as linhas relevantes do banco, não só do pedido corrente.

## Frontend

A página `AdminIgnoredItems`:

1. Antes de chamar o backend, mostra `Reaplicando regras aos itens existentes…`.
2. Após a resposta, exibe o resumo retornado: `Regras reaplicadas: X itens avaliados, Y ocultados, Z desocultados.`
3. Recarrega regras, ocultos e não vinculados em sequência.

A aba "Ocultos" agora une `unlinked_dav_items.status=HIDDEN` com `order_items.hidden=TRUE` em um único stream, distinguindo `Oculto manualmente` vs `Oculto por regra` pela coluna `hiddenManually` do DTO.

## Como testar

1. Subir o sistema (`docker compose up -d` + `npm run dev` no backend e frontend).
2. Importar um DAV com itens contendo `MDF` no nome.
3. Confirmar que aparecem em revisão (com produto) ou "Não vinculados" (sem produto).
4. Criar regra **Nome contém: MDF**.
5. Confirmar que os itens foram movidos para a aba **Ocultos** e o feedback mostra a contagem.
6. **Desativar** a regra → itens voltam para revisão/não vinculados.
7. **Editar** a regra para `INST.` → itens MDF saem do oculto, itens com INST. entram.
8. Ocultar manualmente um item da aba "Não vinculados" → ele fica em **Ocultos** com badge "Oculto manualmente". Desative a regra criada por essa ação e confirme que o item continua oculto manualmente.
9. Apagar a regra → reaplicação acontece, resumo é exibido.

## Garantias

- Itens ocultos manualmente são preservados em qualquer mutação de regra.
- Histórico/auditoria nunca é apagado (soft delete + `resolution_note`).
- Itens ocultos por regra não entram em picking nem na aba "Não vinculados".
- Reaplicação é idempotente — rodar duas vezes consecutivas produz o mesmo estado final.
