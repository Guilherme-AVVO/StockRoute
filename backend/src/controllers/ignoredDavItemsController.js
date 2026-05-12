import {
  createIgnoredDavItem,
  listIgnoredDavItems,
  deactivateIgnoredDavItem,
} from '../services/ignoredDavItemsService.js';

// Converte linha do banco (snake_case) para camelCase para o frontend.
function toDto(row) {
  return {
    id:                  row.id,
    rawSku:              row.raw_sku              ?? null,
    normalizedSku:       row.normalized_sku       ?? null,
    rawDescription:      row.raw_description      ?? null,
    normalizedDescription: row.normalized_description ?? null,
    matchType:           row.match_type,
    reason:              row.reason,
    active:              row.active,
    createdBy:           row.created_by,
    createdAt:           row.created_at,
    updatedAt:           row.updated_at,
  };
}

export async function listIgnoredDavItemsController(req, res, next) {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const rows = await listIgnoredDavItems({ includeInactive });
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

export async function deactivateIgnoredDavItemController(req, res, next) {
  try {
    const row = await deactivateIgnoredDavItem(req.params.id);
    if (!row) {
      return res.status(404).json({ message: 'Regra não encontrada' });
    }
    return res.json(toDto(row));
  } catch (err) {
    next(err);
  }
}
