// Normaliza espaços repetidos para comparar textos do DAV de forma consistente.
function collapseSpaces(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

// Normaliza o SKU/código extraído do DAV sem alterar o valor bruto armazenado.
export function normalizeSku(value) {
  const normalized = collapseSpaces(value).toUpperCase();
  return normalized || null;
}

// Normaliza descrições para fallback quando o DAV não tiver SKU confiável.
export function normalizeDescription(value) {
  const normalized = collapseSpaces(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return normalized || null;
}
