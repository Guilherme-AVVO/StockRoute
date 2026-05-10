import sql from '../pool.js';

const ignoredDavItemFields = sql`
  id,
  raw_sku,
  normalized_sku,
  raw_description,
  normalized_description,
  match_type,
  reason,
  active,
  created_by,
  created_at,
  updated_at
`;

// Busca regra ativa por SKU normalizado durante o processamento do DAV.
export async function findIgnoredDavItemBySku(normalizedSku) {
  if (!normalizedSku) return null;

  const rows = await sql`
    SELECT ${ignoredDavItemFields}
    FROM ignored_dav_items
    WHERE normalized_sku = ${normalizedSku}
      AND active = TRUE
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

// Busca regra ativa por descrição normalizada quando não houver SKU confiável.
export async function findIgnoredDavItemByDescription(normalizedDescription) {
  if (!normalizedDescription) return null;

  const rows = await sql`
    SELECT ${ignoredDavItemFields}
    FROM ignored_dav_items
    WHERE normalized_description = ${normalizedDescription}
      AND active = TRUE
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function createIgnoredDavItem(data) {
  const rows = await sql`
    INSERT INTO ignored_dav_items (
      raw_sku,
      normalized_sku,
      raw_description,
      normalized_description,
      match_type,
      reason,
      active,
      created_by
    )
    VALUES (
      ${data.rawSku ?? null},
      ${data.normalizedSku ?? null},
      ${data.rawDescription ?? null},
      ${data.normalizedDescription ?? null},
      ${data.matchType},
      ${data.reason},
      ${data.active ?? true},
      ${data.createdBy}
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
