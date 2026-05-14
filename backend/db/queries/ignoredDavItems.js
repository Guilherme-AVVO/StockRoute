import sql from '../pool.js';

// Campos retornados em todas as queries de regra de ocultação.
// Inclui manufacturer_reference/manufacturer_name desde a migration 010.
const ignoredDavItemFields = sql`
  id,
  raw_sku,
  normalized_sku,
  raw_description,
  normalized_description,
  manufacturer_reference,
  manufacturer_name,
  match_type,
  reason,
  active,
  deleted_at,
  created_by,
  created_at,
  updated_at
`;

// Match unificado: dado um item DAV, retorna a regra ativa que primeiro casa.
// Suporta todos os match_types da migration 010 numa única query.
//
// Normalização: o item já chega com normalized_sku/description.
// Para manufacturer comparamos em UPPER para ser case-insensitive.
export async function findIgnoredRuleForItem({
  normalizedSku,
  normalizedDescription,
  normalizedProductName,
  manufacturerReference,
  manufacturerName,
}) {
  const desc = normalizedDescription   ?? '';
  const pname = normalizedProductName  ?? '';
  const mnam = (manufacturerName       ?? '').toString().trim().toUpperCase();

  const rows = await sql`
    SELECT ${ignoredDavItemFields}
    FROM ignored_dav_items
    WHERE active = TRUE
      AND deleted_at IS NULL
      AND (
        (match_type = 'NAME_CONTAINS'
              AND normalized_description IS NOT NULL
              AND (
                (${desc  !== ''} AND POSITION(LOWER(normalized_description) IN LOWER(${desc})) > 0)
                OR (${pname !== ''} AND POSITION(LOWER(normalized_description) IN LOWER(${pname})) > 0)
              ))
        OR (match_type = 'MANUFACTURER_NAME'
              AND ${mnam !== ''}
              AND manufacturer_name IS NOT NULL
              AND UPPER(manufacturer_name) = ${mnam})
        OR (match_type = 'MANUFACTURER_NAME_CONTAINS'
              AND ${mnam !== ''}
              AND manufacturer_name IS NOT NULL
              AND POSITION(UPPER(manufacturer_name) IN ${mnam}) > 0)
      )
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

// Mantidas para compatibilidade com chamadores legados.
export async function findIgnoredDavItemBySku(normalizedSku) {
  if (!normalizedSku) return null;
  const rows = await sql`
    SELECT ${ignoredDavItemFields}
    FROM ignored_dav_items
    WHERE normalized_sku = ${normalizedSku}
      AND active = TRUE
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function findIgnoredDavItemByDescription(normalizedDescription) {
  if (!normalizedDescription) return null;
  const rows = await sql`
    SELECT ${ignoredDavItemFields}
    FROM ignored_dav_items
    WHERE normalized_description = ${normalizedDescription}
      AND active = TRUE
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function createIgnoredDavItem(data) {
  const rows = await sql`
    INSERT INTO ignored_dav_items (
      raw_sku, normalized_sku,
      raw_description, normalized_description,
      manufacturer_reference, manufacturer_name,
      match_type, reason, active, created_by
    )
    VALUES (
      ${data.rawSku ?? null}, ${data.normalizedSku ?? null},
      ${data.rawDescription ?? null}, ${data.normalizedDescription ?? null},
      ${data.manufacturerReference ?? null}, ${data.manufacturerName ?? null},
      ${data.matchType}, ${data.reason}, ${data.active ?? true}, ${data.createdBy}
    )
    RETURNING ${ignoredDavItemFields}
  `;
  return rows[0];
}

export async function listIgnoredDavItems({ includeInactive = false, includeDeleted = false } = {}) {
  return sql`
    SELECT ${ignoredDavItemFields}
    FROM ignored_dav_items
    WHERE (${includeDeleted} = TRUE OR deleted_at IS NULL)
      AND (${includeInactive} = TRUE OR active = TRUE)
    ORDER BY created_at DESC
  `;
}

export async function findIgnoredDavItemById(id, { includeDeleted = false } = {}) {
  const rows = await sql`
    SELECT ${ignoredDavItemFields}
    FROM ignored_dav_items
    WHERE id = ${id}
      AND (${includeDeleted} = TRUE OR deleted_at IS NULL)
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function updateIgnoredDavItem(id, data) {
  const rows = await sql`
    UPDATE ignored_dav_items
    SET raw_sku                = ${data.rawSku ?? null},
        normalized_sku         = ${data.normalizedSku ?? null},
        raw_description        = ${data.rawDescription ?? null},
        normalized_description = ${data.normalizedDescription ?? null},
        manufacturer_reference = ${data.manufacturerReference ?? null},
        manufacturer_name      = ${data.manufacturerName ?? null},
        match_type             = ${data.matchType},
        reason                 = ${data.reason},
        updated_at             = NOW()
    WHERE id = ${id}
      AND deleted_at IS NULL
    RETURNING ${ignoredDavItemFields}
  `;
  return rows[0] ?? null;
}

export async function setIgnoredDavItemActive(id, active) {
  const rows = await sql`
    UPDATE ignored_dav_items
    SET active = ${active},
        updated_at = NOW()
    WHERE id = ${id}
      AND deleted_at IS NULL
    RETURNING ${ignoredDavItemFields}
  `;
  return rows[0] ?? null;
}

export async function softDeleteIgnoredDavItem(id) {
  const rows = await sql`
    UPDATE ignored_dav_items
    SET active = FALSE,
        deleted_at = NOW(),
        updated_at = NOW()
    WHERE id = ${id}
      AND deleted_at IS NULL
    RETURNING ${ignoredDavItemFields}
  `;
  return rows[0] ?? null;
}
