import {
  createIgnoredDavItem as insertIgnoredDavItem,
  deactivateIgnoredDavItem as deactivateIgnoredDavItemQuery,
  findIgnoredDavItemByDescription,
  findIgnoredDavItemBySku,
  listIgnoredDavItems as listIgnoredDavItemsQuery,
} from '../../db/queries/ignoredDavItems.js';
import { normalizeDescription, normalizeSku } from '../utils/normalizeDavItem.js';

const ALLOWED_MATCH_TYPES = ['SKU', 'DESCRIPTION', 'SKU_AND_DESCRIPTION'];

function inferMatchType(normalizedSku, normalizedDescription) {
  if (normalizedSku && normalizedDescription) return 'SKU_AND_DESCRIPTION';
  if (normalizedSku) return 'SKU';
  return 'DESCRIPTION';
}

function toIgnoredResult(rule) {
  return {
    ignored: Boolean(rule),
    ignoredRule: rule ?? null,
    reason: rule?.reason ?? null,
  };
}

// Cria uma regra ensinada pelo ADMIN para ignorar itens DAV no picking.
export async function createIgnoredDavItem(data = {}) {
  const normalizedSku = normalizeSku(data.rawSku);
  const normalizedDescription = normalizeDescription(data.rawDescription);
  const matchType = data.matchType ?? inferMatchType(normalizedSku, normalizedDescription);

  if (!normalizedSku && !normalizedDescription) {
    throw { status: 400, message: 'Informe SKU ou descrição para criar a regra de item DAV ignorado' };
  }
  if (!data.reason || typeof data.reason !== 'string') {
    throw { status: 400, message: 'Motivo é obrigatório' };
  }
  if (!data.createdBy) {
    throw { status: 400, message: 'Usuário criador é obrigatório' };
  }
  if (!ALLOWED_MATCH_TYPES.includes(matchType)) {
    throw { status: 400, message: 'Tipo de correspondência inválido' };
  }

  return insertIgnoredDavItem({
    rawSku: data.rawSku ?? null,
    normalizedSku,
    rawDescription: data.rawDescription ?? null,
    normalizedDescription,
    matchType,
    reason: data.reason.trim(),
    active: data.active ?? true,
    createdBy: data.createdBy,
  });
}

export async function listIgnoredDavItems(options) {
  return listIgnoredDavItemsQuery(options);
}

export async function deactivateIgnoredDavItem(id) {
  if (!id) {
    throw { status: 400, message: 'ID da regra é obrigatório' };
  }

  return deactivateIgnoredDavItemQuery(id);
}

// Verifica se um item extraído do DAV deve sair da lista física do estoquista.
// A ordem evita falso positivo por descrição quando o SKU já identifica a regra.
export async function shouldIgnoreDavItem({ rawSku, rawDescription }) {
  const normalizedSku = normalizeSku(rawSku);
  const normalizedDescription = normalizeDescription(rawDescription);

  const ruleBySku = await findIgnoredDavItemBySku(normalizedSku);
  if (ruleBySku) return toIgnoredResult(ruleBySku);

  const ruleByDescription = await findIgnoredDavItemByDescription(normalizedDescription);
  return toIgnoredResult(ruleByDescription);
}
