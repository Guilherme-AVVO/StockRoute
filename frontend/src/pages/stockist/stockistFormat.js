// ============================================================
// Helpers de formatação compartilhados pelas telas do estoquista.
// Mantém labels e formatações fora dos componentes de tela.
// ============================================================

export const NOT_FOUND_REASONS = [
  { value: 'Falta no estoque',          label: 'Falta no estoque' },
  { value: 'Produto danificado',        label: 'Produto danificado' },
  { value: 'Divergência de código',     label: 'Divergência de código' },
  { value: 'Produto em local incorreto', label: 'Produto em local incorreto' },
  { value: 'Outro',                     label: 'Outro' },
];

// Classifica a entrega para o card da lista de pedidos.
export function classifyDelivery(deliveryDate) {
  if (!deliveryDate) return { kind: 'proxima', label: 'Sem data', days: null };
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const d = new Date(deliveryDate);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d - t) / (1000 * 60 * 60 * 24));
  if (diff < 0)   return { kind: 'atrasado', label: `Atrasado ${Math.abs(diff)}d`, days: diff };
  if (diff === 0) return { kind: 'hoje',     label: 'Entrega hoje',                days: diff };
  if (diff <= 2)  return { kind: 'proxima',  label: `Em ${diff} dia${diff > 1 ? 's' : ''}`, days: diff };
  return            { kind: 'proxima',  label: `Em ${diff} dias`,                  days: diff };
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(ms) {
  if (ms == null || ms < 0) return '—';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (m >= 60) {
    const h = Math.floor(m / 60); const rm = m % 60;
    return `${h}h ${rm}min`;
  }
  return `${m}min ${s.toString().padStart(2, '0')}s`;
}
