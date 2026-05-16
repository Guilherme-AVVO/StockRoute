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
    return res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}
