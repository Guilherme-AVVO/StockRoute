import {
  createIgnoredDavItem,
  listIgnoredDavItems,
  updateIgnoredDavItem,
  setIgnoredDavItemStatus,
  deleteIgnoredDavItem,
} from '../services/ignoredDavItemsService.js';

// Converte linha do banco (snake_case) para camelCase para o frontend.
function toDto(row) {
  return {
    id:                  row.id,
    rawSku:              row.raw_sku              ?? null,
    normalizedSku:       row.normalized_sku       ?? null,
    rawDescription:      row.raw_description      ?? null,
    normalizedDescription: row.normalized_description ?? null,
    manufacturerReference: row.manufacturer_reference ?? null,
    manufacturerName:    row.manufacturer_name    ?? null,
    matchType:           row.match_type,
    reason:              row.reason,
    active:              row.active,
    deletedAt:           row.deleted_at ?? null,
    createdBy:           row.created_by,
    createdAt:           row.created_at,
    updatedAt:           row.updated_at,
  };
}

export async function listIgnoredDavItemsController(req, res, next) {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const includeDeleted = req.query.includeDeleted === 'true';
    const rows = await listIgnoredDavItems({ includeInactive, includeDeleted });
    return res.json(rows.map(toDto));
  } catch (err) {
    next(err);
  }
}

export async function createIgnoredDavItemController(req, res, next) {
  try {
    const row = await createIgnoredDavItem({
      ...(req.body ?? {}),
      createdBy: req.user.id,
    });
    return res.status(201).json(toDto(row));
  } catch (err) {
    next(err);
  }
}

export async function updateIgnoredDavItemController(req, res, next) {
  try {
    const row = await updateIgnoredDavItem(req.params.id, req.body ?? {});
    return res.json(toDto(row));
  } catch (err) {
    next(err);
  }
}

export async function setIgnoredDavItemStatusController(req, res, next) {
  try {
    const row = await setIgnoredDavItemStatus(req.params.id, req.body?.active);
    return res.json(toDto(row));
  } catch (err) {
    next(err);
  }
}

export async function deleteIgnoredDavItemController(req, res, next) {
  try {
    const row = await deleteIgnoredDavItem(req.params.id);
    return res.json(toDto(row));
  } catch (err) {
    next(err);
  }
}
