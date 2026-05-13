import sql from '../pool.js';

// Campos retornados em todas as queries de produto.
// Inclui manufacturer_reference/manufacturer_name desde a migration 009.
const productFields = sql`
  id,
  sku,
  name,
  unit,
  image_url,
  manufacturer_reference,
  manufacturer_name,
  created_at,
  updated_at
`;

// Lista produtos com busca opcional por SKU, nome, referência ou fabricante.
// Ordena por name ASC — mais intuitivo para navegar um catálogo alfabeticamente.
export async function listProducts({ search } = {}) {
  if (search) {
    const pattern = `%${search}%`;
    return sql`
      SELECT ${productFields}
      FROM products
      WHERE sku                    ILIKE ${pattern}
         OR name                   ILIKE ${pattern}
         OR manufacturer_reference ILIKE ${pattern}
         OR manufacturer_name      ILIKE ${pattern}
      ORDER BY name ASC
    `;
  }

  return sql`
    SELECT ${productFields}
    FROM products
    ORDER BY name ASC
  `;
}

export async function findProductById(id) {
  const rows = await sql`
    SELECT ${productFields}
    FROM products
    WHERE id = ${id}
  `;
  return rows[0] ?? null;
}

// Usada para checar duplicidade de SKU antes de insert/update.
export async function findProductBySku(sku) {
  const rows = await sql`
    SELECT ${productFields}
    FROM products
    WHERE sku = ${sku}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

// Lookup por referência do fabricante — match principal durante import de DAV.
// Quando manufacturerName é passado, prioriza match (ref + name) exato;
// senão cai para match somente por referência. Sempre comparação normalizada
// (UPPER + colapsar espaços) — a normalização também é feita no save.
export async function findProductByManufacturerReference(reference, manufacturerName) {
  if (!reference) return null;
  const ref = String(reference).trim().toUpperCase();
  if (!ref) return null;

  if (manufacturerName) {
    const name = String(manufacturerName).trim().toUpperCase();
    const rows = await sql`
      SELECT ${productFields}
      FROM products
      WHERE UPPER(manufacturer_reference) = ${ref}
        AND UPPER(manufacturer_name)      = ${name}
      LIMIT 1
    `;
    if (rows[0]) return rows[0];
  }

  // Fallback: só referência (caso o fabricante não esteja gravado / esteja diferente)
  const rows = await sql`
    SELECT ${productFields}
    FROM products
    WHERE UPPER(manufacturer_reference) = ${ref}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function createProduct({ sku, name, unit, imageUrl, manufacturerReference, manufacturerName }) {
  const rows = await sql`
    INSERT INTO products (sku, name, unit, image_url, manufacturer_reference, manufacturer_name)
    VALUES (${sku}, ${name}, ${unit}, ${imageUrl ?? null}, ${manufacturerReference ?? null}, ${manufacturerName ?? null})
    RETURNING ${productFields}
  `;
  return rows[0];
}

export async function updateProduct(id, { sku, name, unit, imageUrl, manufacturerReference, manufacturerName }) {
  const rows = await sql`
    UPDATE products
    SET sku                    = ${sku},
        name                   = ${name},
        unit                   = ${unit},
        image_url              = ${imageUrl ?? null},
        manufacturer_reference = ${manufacturerReference ?? null},
        manufacturer_name      = ${manufacturerName ?? null},
        updated_at             = NOW()
    WHERE id = ${id}
    RETURNING ${productFields}
  `;
  return rows[0] ?? null;
}

export async function deleteProduct(id) {
  const rows = await sql`
    DELETE FROM products
    WHERE id = ${id}
    RETURNING id
  `;
  return rows[0] ?? null;
}
