// Controllers HTTP para itens não vinculados do DAV.
import {
  getUnlinkedDavItems,
  linkToExistingProduct,
  registerAsNewProduct,
  hideUnlinkedItem,
} from '../services/unlinkedDavItemsService.js';
import {
  listUnlinkedDavItemGroups,
  registerProductForGroup,
  linkGroupToExistingProduct,
  hideGroup,
} from '../services/unlinkedDavItemGroupsService.js';
import { logAuditEvent, AUDIT_EVENT_TYPES } from '../services/auditService.js';

export async function listUnlinkedController(req, res, next) {
  try {
    // Por padrão lista apenas pendentes; aceita ?status=LINKED|HIDDEN|all para auditoria.
    const raw = req.query.status;
    const status = raw === 'all' ? null : (raw ?? 'PENDING');
    const items = await getUnlinkedDavItems({ status });
    return res.json(items);
  } catch (err) {
    next(err);
  }
}

export async function linkProductController(req, res, next) {
  try {
    const { productId } = req.body ?? {};
    if (!productId) {
      return res.status(400).json({ message: 'productId é obrigatório' });
    }
    const result = await linkToExistingProduct(req.params.id, productId, req.user.id);
    await logAuditEvent({
      eventType:   AUDIT_EVENT_TYPES.UNLINKED_ITEM_LINKED,
      entityType:  'unlinked_dav_item',
      entityId:    result.item?.id,
      orderId:     result.item?.orderId,
      davNumber:   result.item?.davNumber,
      clientName:  result.item?.customerName,
      status:      'Concluído',
      title:       'Item DAV vinculado a produto',
      description: `Item "${result.item?.rawDescription}" vinculado ao produto ${result.product?.sku}.`,
      metadata:    { productId: result.product?.id, productSku: result.product?.sku },
    }, { req });
    return res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

export async function createProductController(req, res, next) {
  try {
    const { sku, name, unit, imageUrl, manufacturerReference, manufacturerName } = req.body ?? {};
    const result = await registerAsNewProduct(
      req.params.id,
      { sku, name, unit, imageUrl, manufacturerReference, manufacturerName },
      req.user.id,
    );
    await logAuditEvent({
      eventType:   AUDIT_EVENT_TYPES.PRODUCT_CREATED_FROM_UNLINKED,
      entityType:  'product',
      entityId:    result.product?.id,
      orderId:     result.item?.orderId,
      davNumber:   result.item?.davNumber,
      clientName:  result.item?.customerName,
      status:      'Concluído',
      title:       'Produto cadastrado a partir de item DAV',
      description: `Produto "${result.product?.name}" (SKU ${result.product?.sku}) criado a partir do item DAV não vinculado.`,
      metadata:    { productId: result.product?.id, productSku: result.product?.sku },
    }, { req });
    return res.status(201).json(result);
  } catch (err) {
    if (err.status) {
      const body = { message: err.message };
      if (err.existingProductId) body.existingProductId = err.existingProductId;
      return res.status(err.status).json(body);
    }
    next(err);
  }
}

export async function hideUnlinkedController(req, res, next) {
  try {
    const { reason } = req.body ?? {};
    const item = await hideUnlinkedItem(req.params.id, reason, req.user.id);
    await logAuditEvent({
      eventType:   AUDIT_EVENT_TYPES.ITEM_HIDDEN_MANUALLY,
      entityType:  'unlinked_dav_item',
      entityId:    item.id,
      orderId:     item.orderId,
      davNumber:   item.davNumber,
      clientName:  item.customerName,
      status:      'Observação',
      title:       'Item DAV ocultado manualmente',
      description: `Item "${item.rawDescription}" foi ocultado manualmente. Motivo: ${reason}`,
      metadata:    { reason },
    }, { req });
    return res.json(item);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

// --- Grupos ---------------------------------------------------------------

export async function listUnlinkedGroupsController(req, res, next) {
  try {
    const groups = await listUnlinkedDavItemGroups();
    return res.json(groups);
  } catch (err) {
    next(err);
  }
}

export async function registerGroupController(req, res, next) {
  try {
    const { groupKey, sku, name, unit, imageUrl, manufacturerReference, manufacturerName } = req.body ?? {};
    const result = await registerProductForGroup({
      groupKey,
      productData: { sku, name, unit, imageUrl, manufacturerReference, manufacturerName },
      userId: req.user.id,
    });
    await logAuditEvent({
      eventType:   AUDIT_EVENT_TYPES.PRODUCT_CREATED_FROM_UNLINKED,
      entityType:  'product',
      entityId:    result.product?.id,
      status:      'Concluído',
      title:       'Produto cadastrado a partir de grupo DAV',
      description: `Produto "${result.product?.name}" (SKU ${result.product?.sku}) cadastrado a partir de grupo: ${result.linkedItemsCount} item(ns) em ${result.affectedOrdersCount} pedido(s) vinculados.`,
      metadata:    {
        groupKey,
        linkedItemsCount:    result.linkedItemsCount,
        affectedOrdersCount: result.affectedOrdersCount,
      },
    }, { req });
    return res.status(201).json(result);
  } catch (err) {
    if (err.status) {
      const body = { message: err.message };
      if (err.existingProductId) body.existingProductId = err.existingProductId;
      return res.status(err.status).json(body);
    }
    next(err);
  }
}

export async function linkGroupController(req, res, next) {
  try {
    const { groupKey, productId } = req.body ?? {};
    const result = await linkGroupToExistingProduct({
      groupKey,
      productId,
      userId: req.user.id,
    });
    await logAuditEvent({
      eventType:   AUDIT_EVENT_TYPES.UNLINKED_ITEM_LINKED,
      entityType:  'product',
      entityId:    result.product?.id,
      status:      'Concluído',
      title:       'Grupo DAV vinculado a produto existente',
      description: `Grupo vinculado ao produto ${result.product?.sku}: ${result.linkedItemsCount} item(ns) em ${result.affectedOrdersCount} pedido(s).`,
      metadata:    {
        groupKey,
        productId:           result.product?.id,
        productSku:          result.product?.sku,
        linkedItemsCount:    result.linkedItemsCount,
        affectedOrdersCount: result.affectedOrdersCount,
      },
    }, { req });
    return res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

export async function hideGroupController(req, res, next) {
  try {
    const { groupKey, reason } = req.body ?? {};
    const result = await hideGroup({
      groupKey,
      reason,
      userId: req.user.id,
    });
    await logAuditEvent({
      eventType:   AUDIT_EVENT_TYPES.ITEM_HIDDEN_MANUALLY,
      entityType:  'hide_rule',
      entityId:    result.rule?.id,
      status:      'Observação',
      title:       'Grupo DAV ocultado',
      description: `Grupo ocultado: ${result.hiddenItemsCount} item(ns) em ${result.affectedOrdersCount} pedido(s). Motivo: ${reason}`,
      metadata:    {
        groupKey,
        ruleId:              result.rule?.id,
        hiddenItemsCount:    result.hiddenItemsCount,
        affectedOrdersCount: result.affectedOrdersCount,
        reason,
      },
    }, { req });
    return res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}
