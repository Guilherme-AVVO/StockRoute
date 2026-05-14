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
  const sku  = normalizedSku           ?? '';
  const desc = normalizedDescription   ?? '';
  const pname = normalizedProductName  ?? '';
  const mref = (manufacturerReference  ?? '').toString().trim().toUpperCase();
  const mnam = (manufacturerName       ?? '').toString().trim().toUpperCase();

  const rows = await sql`
    SELECT ${ignoredDavItemFields}
    FROM ignored_dav_items
    WHERE active = TRUE
      AND (
        (match_type = 'SKU'                              AND normalized_sku = ${sku} AND ${sku !== ''})
        OR (match_type = 'DESCRIPTION'                   AND normalized_description = ${desc} AND ${desc !== ''})
        OR (match_type = 'SKU_AND_DESCRIPTION'
              AND normalized_sku         = ${sku}  AND ${sku  !== ''}
              AND normalized_description = ${desc} AND ${desc !== ''})
        OR (match_type = 'SKU_CONTAINS'
              AND ${sku !== ''}
              AND normalized_sku IS NOT NULL
              AND POSITION(LOWER(normalized_sku) IN LOWER(${sku})) > 0)
        OR (match_type = 'DESCRIPTION_CONTAINS'
              AND ${desc !== ''}
              AND normalized_description IS NOT NULL
              AND POSITION(LOWER(normalized_description) IN LOWER(${desc})) > 0)
        OR (match_type = 'SKU_PREFIX'
              AND ${sku !== ''}
              AND normalized_sku IS NOT NULL
              AND LOWER(${sku}) LIKE LOWER(normalized_sku) || '%')
        OR (match_type = 'NAME'
              AND normalized_description IS NOT NULL
              AND (
                (normalized_description = ${desc}  AND ${desc  !== ''})
                OR (normalized_description = ${pname} AND ${pname !== ''})
              ))
        OR (match_type = 'NAME_CONTAINS'
              AND normalized_description IS NOT NULL
              AND (
                (${desc  !== ''} AND POSITION(LOWER(normalized_description) IN LOWER(${desc})) > 0)
                OR (${pname !== ''} AND POSITION(LOWER(normalized_description) IN LOWER(${pname})) > 0)
              ))
        OR (match_type = 'MANUFACTURER_REFERENCE'
              AND ${mref !== ''}
              AND manufacturer_reference IS NOT NULL
              AND UPPER(manufacturer_reference) = ${mref})
        OR (match_type = 'MANUFACTURER_REFERENCE_CONTAINS'
              AND ${mref !== ''}
              AND manufacturer_reference IS NOT NULL
              AND POSITION(UPPER(manufacturer_reference) IN ${mref}) > 0)
        OR (match_type = 'MANUFACTURER_NAME'
              AND ${mnam !== ''}
              AND manufacturer_name IS NOT NULL
              AND UPPER(manufacturer_name) = ${mnam})
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
    WHERE normalized_sku = ${normalizedSku} AND active = TRUE
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
    WHERE normalized_description = ${normalizedDescription} AND active = TRUE
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

export async function listIgnoredDavItems({ includeInactive = false } = {}) {
  return sql`
    SELECT ${ignoredDavItemFields}
    FROM ignored_dav_items
    WHERE ${includeInactive} = TRUE
      OR active = TRUE
    ORDER BY created_at DESC
  `;
}

export async function deactivateIgnoredDavItem(id) {
  const rows = await sql`
    UPDATE ignored_dav_items
    SET active = FALSE,
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING ${ignoredDavItemFields}
  `;
  return rows[0] ?? null;
}
