import {
  createIgnoredDavItem,
  listIgnoredDavItems,
  updateIgnoredDavItem,
  setIgnoredDavItemStatus,
  deleteIgnoredDavItem,
} from '../services/ignoredDavItemsService.js';
import { logAuditEvent, AUDIT_EVENT_TYPES } from '../services/auditService.js';

function describeRule(rule) {
  const value = rule.rawDescription ?? rule.manufacturerName ?? rule.rawSku ?? '—';
  return `${rule.matchType} "${value}"`;
}

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
    const { rule, reapplySummary } = await createIgnoredDavItem({
      ...(req.body ?? {}),
      createdBy: req.user.id,
    });
    const dto = toDto(rule);
    await logAuditEvent({
      eventType:   AUDIT_EVENT_TYPES.HIDE_RULE_CREATED,
      entityType:  'hide_rule',
      entityId:    dto.id,
      status:      'Aplicado',
      title:       'Regra de ocultação criada',
      description: `Nova regra: ${describeRule(dto)}. Motivo: ${dto.reason}`,
      metadata:    { reapplySummary, matchType: dto.matchType, reason: dto.reason },
    }, { req });
    return res.status(201).json({ rule: dto, reapplySummary });
  } catch (err) {
    next(err);
  }
}

export async function updateIgnoredDavItemController(req, res, next) {
  try {
    const { rule, reapplySummary } = await updateIgnoredDavItem(req.params.id, req.body ?? {});
    const dto = toDto(rule);
    await logAuditEvent({
      eventType:   AUDIT_EVENT_TYPES.HIDE_RULE_UPDATED,
      entityType:  'hide_rule',
      entityId:    dto.id,
      status:      'Aplicado',
      title:       'Regra de ocultação atualizada',
      description: `Regra ${describeRule(dto)} foi editada.`,
      metadata:    { reapplySummary, matchType: dto.matchType },
    }, { req });
    return res.json({ rule: dto, reapplySummary });
  } catch (err) {
    next(err);
  }
}

export async function setIgnoredDavItemStatusController(req, res, next) {
  try {
    const { rule, reapplySummary } = await setIgnoredDavItemStatus(req.params.id, req.body?.active);
    const dto = toDto(rule);
    await logAuditEvent({
      eventType:   AUDIT_EVENT_TYPES.HIDE_RULE_STATUS_CHANGED,
      entityType:  'hide_rule',
      entityId:    dto.id,
      status:      dto.active ? 'Aplicado' : 'Desativado',
      title:       dto.active ? 'Regra reativada' : 'Regra desativada',
      description: `Regra ${describeRule(dto)} ${dto.active ? 'ativada' : 'desativada'}.`,
      metadata:    { reapplySummary, active: dto.active },
    }, { req });
    return res.json({ rule: dto, reapplySummary });
  } catch (err) {
    next(err);
  }
}

export async function deleteIgnoredDavItemController(req, res, next) {
  try {
    const { rule, reapplySummary } = await deleteIgnoredDavItem(req.params.id);
    const dto = toDto(rule);
    await logAuditEvent({
      eventType:   AUDIT_EVENT_TYPES.HIDE_RULE_DELETED,
      entityType:  'hide_rule',
      entityId:    dto.id,
      status:      'Desativado',
      title:       'Regra de ocultação apagada',
      description: `Regra ${describeRule(dto)} foi apagada (soft delete).`,
      metadata:    { reapplySummary },
    }, { req });
    return res.json({ rule: dto, reapplySummary });
  } catch (err) {
    next(err);
  }
}
