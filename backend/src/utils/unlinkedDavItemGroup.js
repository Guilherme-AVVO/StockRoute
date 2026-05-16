// Agrupamento de unlinked_dav_items para a aba "Não vinculados".
//
// Itens iguais provenientes de pedidos diferentes têm de aparecer como
// uma única entrada visual. A função `buildUnlinkedItemGroupKey` produz
// uma chave estável seguindo a regra de prioridade:
//
//   1. manufacturerReference + manufacturerName
//   2. manufacturerReference sozinho (manufacturerName vazio)
//   3. sku/código interno + manufacturerName
//   4. rawDescription normalizada + manufacturerName
//
// Quantidade e pedido NÃO entram na chave: itens com mesma identidade
// e quantidades distintas pertencem ao mesmo grupo.

function normalize(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim().replace(/\s+/g, ' ').toUpperCase();
}

// Remove diacríticos (range Unicode ̀-ͯ) e normaliza espaços
// antes de comparar descrições textuais.
function normalizeDescription(value) {
  if (value === undefined || value === null) return '';
  return String(value)
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();
}

export function buildUnlinkedItemGroupKey(item = {}) {
  const ref  = normalize(item.manufacturerReference ?? item.manufacturer_reference);
  const name = normalize(item.manufacturerName      ?? item.manufacturer_name);
  const sku  = normalize(item.rawSku                ?? item.raw_sku);
  const desc = normalizeDescription(item.rawDescription ?? item.raw_description);

  if (ref && name) return `REF:${ref}|FAB:${name}`;
  if (ref)         return `REF:${ref}`;
  if (sku && name) return `SKU:${sku}|FAB:${name}`;
  if (sku)         return `SKU:${sku}`;
  if (desc && name) return `DESC:${desc}|FAB:${name}`;
  if (desc)         return `DESC:${desc}`;

  // Caso muito improvável (item totalmente vazio) — chave única para
  // evitar colisão de grupos sem identificação.
  return `RAW:${item.id ?? ''}`;
}
