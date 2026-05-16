// Service: reaplica regras de ocultação ativas em itens DAV/pedidos já existentes.
//
// Quando uma regra de ocultação é criada, editada, ativada, desativada ou apagada,
// o estado dos itens persistidos pode ficar fora de sincronia com as regras vigentes.
// Esta função recalcula o estado de cada item, preservando ocultações manuais.
//
// Itens cobertos:
// 1) order_items                  — itens já vinculados a produtos cadastrados.
// 2) unlinked_dav_items (PENDING e HIDDEN-por-regra) — itens DAV sem produto ou
//    que foram ocultados automaticamente. HIDDEN com hidden_manually=TRUE é
//    preservado integralmente.
//
// Saída: resumo com contagens para feedback ao ADMIN no frontend.

import sql from '../../db/pool.js';
import {
  listAllOrderItemsForReapply,
  setOrderItemHidden,
  clearOrderItemHidden,
} from '../../db/queries/orders.js';
import {
  listUnlinkedDavItemsForReapply,
  markPendingAsHiddenByRule,
  updateHiddenRuleBinding,
  revertHiddenToPending,
} from '../../db/queries/unlinkedDavItems.js';
import { shouldIgnoreDavItem } from './ignoredDavItemsService.js';

function buildSummary() {
  return {
    evaluated:        0,
    hidden:           0, // ocultados (não estavam ocultos e agora batem regra)
    unhidden:         0, // desocultados (estavam ocultos por regra e não batem mais)
    keptHidden:       0, // permaneceram ocultos por regra
    keptVisible:      0, // permaneceram visíveis
    preservedManual:  0, // ocultos manualmente — não tocados (preservados)
  };
}

// Reaplica regras a um order_item. product_* vem da JOIN com products.
async function reapplyToOrderItem(item) {
  const match = await shouldIgnoreDavItem({
    rawSku:                item.product_sku,
    rawDescription:        null,
    productName:           item.product_name,
    manufacturerReference: item.manufacturer_reference,
    manufacturerName:      item.manufacturer_name,
  });

  const wasHidden = item.hidden === true;

  if (match.ignored) {
    if (!wasHidden) {
      await setOrderItemHidden(item.id, {
        ignoredRuleId: match.ruleId,
        hideReason:    match.reason,
      });
      return 'hidden';
    }
    // continua oculto — atualiza vínculo da regra se mudou.
    if (item.ignored_rule_id !== match.ruleId) {
      await setOrderItemHidden(item.id, {
        ignoredRuleId: match.ruleId,
        hideReason:    match.reason,
      });
    }
    return 'keptHidden';
  }

  if (wasHidden) {
    await clearOrderItemHidden(item.id);
    return 'unhidden';
  }
  return 'keptVisible';
}

// Reaplica regras a um item unlinked_dav_items elegível (PENDING ou HIDDEN não-manual).
async function reapplyToUnlinkedItem(item) {
  // Itens manualmente ocultos não devem ser reavaliados.
  if (item.hidden_manually) return 'preservedManual';

  const match = await shouldIgnoreDavItem({
    rawSku:                item.raw_sku,
    rawDescription:        item.raw_description,
    manufacturerReference: item.manufacturer_reference,
    manufacturerName:      item.manufacturer_name,
  });

  const wasHidden = item.status === 'HIDDEN';

  if (match.ignored) {
    if (!wasHidden) {
      await markPendingAsHiddenByRule(item.id, {
        ignoredRuleId:  match.ruleId,
        resolutionNote: match.reason,
      });
      return 'hidden';
    }
    if (item.ignored_rule_id !== match.ruleId) {
      await updateHiddenRuleBinding(item.id, {
        ignoredRuleId:  match.ruleId,
        resolutionNote: match.reason,
      });
    }
    return 'keptHidden';
  }

  if (wasHidden) {
    await revertHiddenToPending(item.id);
    return 'unhidden';
  }
  return 'keptVisible';
}

// Função principal — chamada após qualquer mutação em ignored_dav_items.
// Não usa transação SQL explícita: cada item é atualizado de forma idempotente
// e a função pode ser re-executada sem efeitos colaterais, mantendo o padrão
// do projeto (postgres-js, sem helper `sql.begin` no fluxo atual).
export async function reapplyHideRulesToExistingItems() {
  const summary = buildSummary();

  const orderItems = await listAllOrderItemsForReapply();
  for (const oi of orderItems) {
    const result = await reapplyToOrderItem(oi);
    summary.evaluated++;
    summary[result]++;
  }

  const unlinkedItems = await listUnlinkedDavItemsForReapply();
  for (const u of unlinkedItems) {
    const result = await reapplyToUnlinkedItem(u);
    summary.evaluated++;
    summary[result]++;
  }

  // Conta itens manualmente ocultos preservados — eles não são reavaliados
  // mas entram no resumo para tornar explícito que foram intencionalmente
  // mantidos ocultos pela política de "preservar ocultação manual".
  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count
    FROM unlinked_dav_items
    WHERE status = 'HIDDEN' AND hidden_manually = TRUE
  `;
  summary.preservedManual = count;

  return summary;
}
