// Service: regras de ocultação no picking + verificação durante importação DAV.
//
// Match types aceitos para novas regras:
//   - NAME_CONTAINS                    (descrição do DAV ou nome do produto contém o pattern)
//   - MANUFACTURER_NAME                (igual ao nome do fabricante, case-insensitive)
//   - MANUFACTURER_NAME_CONTAINS       (nome do fabricante contém o pattern)
import {
  createIgnoredDavItem as insertIgnoredDavItem,
  findIgnoredRuleForItem,
  findIgnoredDavItemById,
  listIgnoredDavItems as listIgnoredDavItemsQuery,
  setIgnoredDavItemActive,
  softDeleteIgnoredDavItem,
  updateIgnoredDavItem as updateIgnoredDavItemQuery,
} from '../../db/queries/ignoredDavItems.js';
import { normalizeDescription, normalizeSku } from '../utils/normalizeDavItem.js';

const ALLOWED_MATCH_TYPES = [
  'NAME_CONTAINS',
  'MANUFACTURER_NAME_CONTAINS',
  'MANUFACTURER_NAME',
];

const MATCH_TYPE_REQUIRES_FIELD = {
  NAME_CONTAINS:                    ['rawDescription'],
  MANUFACTURER_NAME_CONTAINS:       ['manufacturerName'],
  MANUFACTURER_NAME:                ['manufacturerName'],
};

function normalizeOptional(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim().replace(/\s+/g, ' ');
  return trimmed ? trimmed.toUpperCase() : null;
}

function toIgnoredResult(rule) {
  if (!rule) return { ignored: false };
  return {
    ignored:      true,
    ruleId:       rule.id,
    reason:       rule.reason,
    matchType:    rule.match_type,
    matchedValue:
         rule.raw_sku
      ?? rule.raw_description
      ?? rule.manufacturer_reference
      ?? rule.manufacturer_name
      ?? null,
    rule,
  };
}

function normalizeRulePayload(data = {}, { requireCreatedBy = false } = {}) {
  const normalizedDescription    = normalizeDescription(data.rawDescription);
  const manufacturerName         = normalizeOptional(data.manufacturerName);
  const matchType                = data.matchType;

  if (!matchType) {
    throw { status: 400, message: 'Tipo de regra é obrigatório' };
  }
  if (!ALLOWED_MATCH_TYPES.includes(matchType)) {
    throw { status: 400, message: 'Tipo de regra inválido. Use Nome contém, Fabricante contém ou Fabricante igual.' };
  }
  if (!data.reason || typeof data.reason !== 'string' || !data.reason.trim()) {
    throw { status: 400, message: 'Motivo é obrigatório' };
  }
  if (requireCreatedBy && !data.createdBy) {
    throw { status: 400, message: 'Usuário criador é obrigatório' };
  }

  // Valida que os campos exigidos pelo matchType foram informados.
  const requiredFields = MATCH_TYPE_REQUIRES_FIELD[matchType] ?? [];
  for (const fld of requiredFields) {
    if (!data[fld] || !String(data[fld]).trim()) {
      throw { status: 400, message: `Campo "${fld}" é obrigatório para matchType ${matchType}` };
    }
  }

  return {
    rawSku:                 null,
    normalizedSku:          null,
    rawDescription:         matchType === 'NAME_CONTAINS' ? data.rawDescription : null,
    normalizedDescription,
    manufacturerReference:  null,
    manufacturerName:       matchType === 'MANUFACTURER_NAME' || matchType === 'MANUFACTURER_NAME_CONTAINS'
      ? manufacturerName
      : null,
    matchType,
    reason:                 data.reason.trim(),
    active:                 data.active ?? true,
    createdBy:              data.createdBy ?? null,
  };
}

export async function createIgnoredDavItem(data = {}) {
  return insertIgnoredDavItem({
    ...normalizeRulePayload(data, { requireCreatedBy: true }),
    createdBy: data.createdBy,
  });
}

export async function listIgnoredDavItems(options) {
  return listIgnoredDavItemsQuery(options);
}

export async function updateIgnoredDavItem(id, data = {}) {
  if (!id) throw { status: 400, message: 'ID da regra é obrigatório' };
  const existing = await findIgnoredDavItemById(id);
  if (!existing) throw { status: 404, message: 'Regra não encontrada' };
  if (!ALLOWED_MATCH_TYPES.includes(existing.match_type)) {
    throw { status: 409, message: 'Regra antiga/incompatível não pode ser editada. Apague e crie uma nova regra.' };
  }

  const updated = await updateIgnoredDavItemQuery(id, normalizeRulePayload({
    ...data,
    active: existing.active,
  }));
  if (!updated) throw { status: 404, message: 'Regra não encontrada' };
  return updated;
}

export async function setIgnoredDavItemStatus(id, active) {
  if (!id) throw { status: 400, message: 'ID da regra é obrigatório' };
  if (typeof active !== 'boolean') throw { status: 400, message: 'Campo active deve ser booleano' };
  const existing = await findIgnoredDavItemById(id);
  if (!existing) throw { status: 404, message: 'Regra não encontrada' };

  const updated = await setIgnoredDavItemActive(id, active);
  if (!updated) throw { status: 404, message: 'Regra não encontrada' };
  return updated;
}

export async function deleteIgnoredDavItem(id) {
  if (!id) throw { status: 400, message: 'ID da regra é obrigatório' };
  const deleted = await softDeleteIgnoredDavItem(id);
  if (!deleted) throw { status: 404, message: 'Regra não encontrada' };
  return deleted;
}

// Verifica se um item extraído do DAV cai em alguma regra ativa.
// As regras aplicadas no fluxo atual são somente por nome ou fabricante.
export async function shouldIgnoreDavItem({ rawSku, rawDescription, productName, manufacturerReference, manufacturerName }) {
  const rule = await findIgnoredRuleForItem({
    normalizedSku:         normalizeSku(rawSku),
    normalizedDescription: normalizeDescription(rawDescription),
    normalizedProductName: normalizeDescription(productName),
    manufacturerReference,
    manufacturerName,
  });
  return toIgnoredResult(rule);
}
