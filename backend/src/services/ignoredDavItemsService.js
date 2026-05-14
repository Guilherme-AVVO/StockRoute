// Service: regras de ocultação no picking + verificação durante importação DAV.
//
// Match types suportados (migration 010):
//   - SKU                              (igual ao normalized_sku)
//   - DESCRIPTION                      (igual ao normalized_description)
//   - SKU_AND_DESCRIPTION              (ambos exatos)
//   - SKU_CONTAINS                     (normalized_sku do item contém o pattern)
//   - DESCRIPTION_CONTAINS             (normalized_description do item contém o pattern)
//   - SKU_PREFIX                       (normalized_sku do item começa com o pattern)
//   - NAME                             (descrição do DAV ou nome do produto igual ao pattern)
//   - NAME_CONTAINS                    (descrição do DAV ou nome do produto contém o pattern)
//   - MANUFACTURER_REFERENCE           (igual à ref. fabricante, case-insensitive)
//   - MANUFACTURER_REFERENCE_CONTAINS  (ref. fabricante do item contém o pattern)
//   - MANUFACTURER_NAME                (igual ao nome do fabricante, case-insensitive)
import {
  createIgnoredDavItem as insertIgnoredDavItem,
  deactivateIgnoredDavItem as deactivateIgnoredDavItemQuery,
  findIgnoredRuleForItem,
  listIgnoredDavItems as listIgnoredDavItemsQuery,
} from '../../db/queries/ignoredDavItems.js';
import { normalizeDescription, normalizeSku } from '../utils/normalizeDavItem.js';

const ALLOWED_MATCH_TYPES = [
  'SKU',
  'DESCRIPTION',
  'SKU_AND_DESCRIPTION',
  'SKU_CONTAINS',
  'DESCRIPTION_CONTAINS',
  'SKU_PREFIX',
  'NAME',
  'NAME_CONTAINS',
  'MANUFACTURER_REFERENCE',
  'MANUFACTURER_REFERENCE_CONTAINS',
  'MANUFACTURER_NAME',
];

// Define qual campo do item DAV cada match_type compara.
// Usado para validar que o tipo escolhido foi acompanhado do valor correto.
const MATCH_TYPE_REQUIRES_FIELD = {
  SKU:                              ['rawSku'],
  DESCRIPTION:                      ['rawDescription'],
  SKU_AND_DESCRIPTION:              ['rawSku', 'rawDescription'],
  SKU_CONTAINS:                     ['rawSku'],
  DESCRIPTION_CONTAINS:             ['rawDescription'],
  SKU_PREFIX:                       ['rawSku'],
  NAME:                             ['rawDescription'],
  NAME_CONTAINS:                    ['rawDescription'],
  MANUFACTURER_REFERENCE:           ['manufacturerReference'],
  MANUFACTURER_REFERENCE_CONTAINS: ['manufacturerReference'],
  MANUFACTURER_NAME:                ['manufacturerName'],
};

function normalizeOptional(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim().replace(/\s+/g, ' ');
  return trimmed ? trimmed.toUpperCase() : null;
}

// Heurística usada quando ADMIN cria regra sem informar matchType explícito.
// Mantém compatibilidade com fluxo antigo (oculta a partir de item DAV).
function inferMatchType(normalizedSku, normalizedDescription, manufacturerReference, manufacturerName) {
  if (normalizedSku && normalizedDescription) return 'SKU_AND_DESCRIPTION';
  if (normalizedSku)            return 'SKU';
  if (normalizedDescription)    return 'DESCRIPTION';
  if (manufacturerReference)    return 'MANUFACTURER_REFERENCE';
  if (manufacturerName)         return 'MANUFACTURER_NAME';
  return null;
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

// Cria regra de ocultação. Aceita o matchType escolhido (CONTAINS, PREFIX,
// MANUFACTURER_REFERENCE, etc.) ou infere a partir dos campos preenchidos.
export async function createIgnoredDavItem(data = {}) {
  const normalizedSku            = normalizeSku(data.rawSku);
  const normalizedDescription    = normalizeDescription(data.rawDescription);
  const manufacturerReference    = normalizeOptional(data.manufacturerReference);
  const manufacturerName         = normalizeOptional(data.manufacturerName);

  const matchType = data.matchType
    ?? inferMatchType(normalizedSku, normalizedDescription, manufacturerReference, manufacturerName);

  if (!matchType) {
    throw { status: 400, message: 'Informe SKU, descrição, referência ou fabricante para a regra' };
  }
  if (!ALLOWED_MATCH_TYPES.includes(matchType)) {
    throw { status: 400, message: `Tipo de correspondência inválido. Aceitos: ${ALLOWED_MATCH_TYPES.join(', ')}` };
  }
  if (!data.reason || typeof data.reason !== 'string' || !data.reason.trim()) {
    throw { status: 400, message: 'Motivo é obrigatório' };
  }
  if (!data.createdBy) {
    throw { status: 400, message: 'Usuário criador é obrigatório' };
  }

  // Valida que os campos exigidos pelo matchType foram informados.
  const requiredFields = MATCH_TYPE_REQUIRES_FIELD[matchType] ?? [];
  for (const fld of requiredFields) {
    if (!data[fld] || !String(data[fld]).trim()) {
      throw { status: 400, message: `Campo "${fld}" é obrigatório para matchType ${matchType}` };
    }
  }

  return insertIgnoredDavItem({
    rawSku:                 data.rawSku ?? null,
    normalizedSku,
    rawDescription:         data.rawDescription ?? null,
    normalizedDescription,
    manufacturerReference,
    manufacturerName,
    matchType,
    reason:                 data.reason.trim(),
    active:                 data.active ?? true,
    createdBy:              data.createdBy,
  });
}

export async function listIgnoredDavItems(options) {
  return listIgnoredDavItemsQuery(options);
}

export async function deactivateIgnoredDavItem(id) {
  if (!id) throw { status: 400, message: 'ID da regra é obrigatório' };
  return deactivateIgnoredDavItemQuery(id);
}

// Verifica se um item extraído do DAV cai em alguma regra ativa.
// Considera SKU, descrição, referência do fabricante e nome do fabricante
// — exatos, CONTAINS ou PREFIX, conforme o matchType da regra.
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
