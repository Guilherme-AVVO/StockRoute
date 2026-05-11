import sql from '../pool.js';

// Campos retornados em todas as queries de produto
const productFields = sql`
  id,
  sku,
  name,
  unit,
  image_url,
  created_at,
  updated_at
`;

// Lista produtos com busca opcional por SKU ou nome.
// Ordena por name ASC — mais intuitivo para navegar um catálogo alfabeticamente.
export async function listProducts({ search } = {}) {
  if (search) {
    const pattern = `%${search}%`;
    return sql`
      SELECT ${productFields}
      FROM products
      WHERE sku  ILIKE ${pattern}
         OR name ILIKE ${pattern}
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

export async function createProduct({ sku, name, unit, imageUrl }) {
  const rows = await sql`
    INSERT INTO products (sku, name, unit, image_url)
    VALUES (${sku}, ${name}, ${unit}, ${imageUrl ?? null})
    RETURNING ${productFields}
  `;
  return rows[0];
}

export async function updateProduct(id, { sku, name, unit, imageUrl }) {
  const rows = await sql`
    UPDATE products
    SET sku        = ${sku},
        name       = ${name},
        unit       = ${unit},
        image_url  = ${imageUrl ?? null},
        updated_at = NOW()
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
