// Dados mockados apenas para montar o frontend.
// Na próxima etapa serão substituídos por chamadas reais à API.

export const MOCK_USER = {
  name: 'Carlos Mendes',
  email: 'carlos.mendes@stockroute.app',
  role: 'ESTOQUISTA',
};

// Datas relativas para mostrar entrega hoje / próxima / atrasado sem precisar
// ajustar o mock manualmente. Calculadas no momento da importação.
const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); };

export const MOCK_ORDERS = [
  {
    id: 'ord-001',
    dav: 'DAV-2026-00481',
    customer: 'Construtora Vértice Ltda.',
    deliveryDate: addDays(0),    // hoje
    createdAt: addDays(-1),
    status: 'AGUARDANDO',
    items: [
      { id: 'i1',  name: 'Cabo flexível 2,5mm² 750V preto',   sku: 'CB-25-PT',  manufacturer: 'Sil',        manufacturerRef: 'SIL-2.5-PT-100', quantity: 4,   unit: 'rolo',  description: 'Rolo com 100m, isolação PVC 70°C, antichama BWF-B.', notes: 'Verificar lote e validade do isolamento.' },
      { id: 'i2',  name: 'Disjuntor monopolar 20A curva C',    sku: 'DJ-MN-20C', manufacturer: 'Schneider',  manufacturerRef: 'EZ9F33120',     quantity: 12,  unit: 'un',    description: 'Easy9 monopolar 20A 3kA curva C, padrão DIN.' },
      { id: 'i3',  name: 'Eletroduto corrugado 25mm amarelo',  sku: 'EL-CO-25A', manufacturer: 'Tigre',      manufacturerRef: 'TG-COR-25-50',  quantity: 2,   unit: 'rolo',  description: 'Rolo com 50m, PEAD, alta resistência ao impacto.' },
      { id: 'i4',  name: 'Tomada 2P+T 10A branca',             sku: 'TM-2PT-10', manufacturer: 'Pial Legrand', manufacturerRef: 'PL-611026',   quantity: 18,  unit: 'un',    description: 'Linha Plus+, módulo 4x2, embutir.' },
      { id: 'i5',  name: 'Interruptor simples 10A branco',      sku: 'IN-SI-10',  manufacturer: 'Pial Legrand', manufacturerRef: 'PL-611001',   quantity: 14,  unit: 'un',    description: 'Linha Plus+, módulo 4x2, embutir.' },
      { id: 'i6',  name: 'Fita isolante 19mm x 20m preta',     sku: 'FI-19-20',  manufacturer: '3M',         manufacturerRef: 'SCOTCH-33+',    quantity: 8,   unit: 'un',    description: 'Scotch 33+, alta performance, autoextinguível.' },
      { id: 'i7',  name: 'Caixa de luz 4x2 PVC',                sku: 'CX-LU-42',  manufacturer: 'Tigre',      manufacturerRef: 'TG-CX-4X2',     quantity: 24,  unit: 'un',    description: 'Caixa de embutir para parede de alvenaria.' },
      { id: 'i8',  name: 'Quadro de distribuição 12 din embutir', sku: 'QD-12-EM', manufacturer: 'Cemar',    manufacturerRef: 'CM-QD-12E',     quantity: 1,   unit: 'un',    description: 'Quadro embutir 12 disjuntores DIN com barramento.' },
      { id: 'i9',  name: 'Lâmpada LED bulbo 9W 6500K E27',     sku: 'LP-LED-9',  manufacturer: 'Osram',      manufacturerRef: 'OS-VL-9W',      quantity: 36,  unit: 'un',    description: 'Value Classic A60, fluxo 806lm, bivolt.' },
      { id: 'i10', name: 'Fio rígido 4mm² 750V azul',          sku: 'FI-4-AZ',   manufacturer: 'Cobrecom',   manufacturerRef: 'COB-4-AZ-100',  quantity: 3,   unit: 'rolo',  description: 'Rolo com 100m, cobre eletrolítico, 750V.' },
      { id: 'i11', name: 'Abraçadeira nylon 200mm preta',      sku: 'AB-200-PT', manufacturer: 'Hellermann', manufacturerRef: 'HT-T50R',       quantity: 4,   unit: 'pct',   description: 'Pacote com 100 unidades, resistente a UV.' },
      { id: 'i12', name: 'Tomada RJ45 cat6 branca',             sku: 'TM-RJ45-6', manufacturer: 'Furukawa',   manufacturerRef: 'FK-GS-CAT6',    quantity: 6,   unit: 'un',    description: 'Conector keystone cat6, montagem em rack ou parede.' },
      { id: 'i13', name: 'Conector wago 3 vias',                sku: 'CN-WG-3',   manufacturer: 'Wago',       manufacturerRef: 'WG-221-413',    quantity: 30,  unit: 'un',    description: '221 series, faixa 0,2 a 4mm², com alavanca.' },
      { id: 'i14', name: 'Mangueira corrugada 1" cinza',        sku: 'MG-CO-1C',  manufacturer: 'Kanaflex',   manufacturerRef: 'KN-1-CZ-50',    quantity: 1,   unit: 'rolo',  description: 'Rolo com 50m, parede dupla, alta flexibilidade.' },
      { id: 'i15', name: 'Espelho 4x2 branco 2 postos',         sku: 'ES-4X2-2',  manufacturer: 'Pial Legrand', manufacturerRef: 'PL-611201',  quantity: 18,  unit: 'un',    description: 'Linha Plus+, encaixe simples.' },
      { id: 'i16', name: 'Sensor de presença teto 360°',        sku: 'SN-PR-T',   manufacturer: 'Exatron',    manufacturerRef: 'EX-SP-360',     quantity: 2,   unit: 'un',    description: 'Detecção 360°, alcance 6m, bivolt automático.' },
    ],
  },
  {
    id: 'ord-002',
    dav: 'DAV-2026-00475',
    customer: 'Mercado Bom Preço — Filial Centro',
    deliveryDate: addDays(1),
    createdAt: addDays(-2),
    status: 'AGUARDANDO',
    items: Array.from({ length: 8 }, (_, i) => ({
      id: `o2-${i}`, name: `Produto exemplo ${i + 1}`, sku: `EX-${100 + i}`,
      manufacturer: 'Fabricante S/A', manufacturerRef: `FAB-${100 + i}`,
      quantity: (i % 3) + 1, unit: 'un', description: 'Descrição completa do produto.',
    })),
  },
  {
    id: 'ord-003',
    dav: 'DAV-2026-00468',
    customer: 'Oficina Mecânica do Zé',
    deliveryDate: addDays(-1),   // atrasado
    createdAt: addDays(-3),
    status: 'AGUARDANDO',
    items: Array.from({ length: 5 }, (_, i) => ({
      id: `o3-${i}`, name: `Peça automotiva ${i + 1}`, sku: `PA-${200 + i}`,
      manufacturer: 'AutoParts', manufacturerRef: `AP-${200 + i}`,
      quantity: 2, unit: 'un', description: 'Peça de reposição.',
    })),
  },
  {
    id: 'ord-004',
    dav: 'DAV-2026-00490',
    customer: 'Marcenaria Aurora',
    deliveryDate: addDays(3),
    createdAt: addDays(0),
    status: 'AGUARDANDO',
    items: Array.from({ length: 11 }, (_, i) => ({
      id: `o4-${i}`, name: `Insumo marcenaria ${i + 1}`, sku: `MA-${300 + i}`,
      manufacturer: 'WoodCo', manufacturerRef: `WC-${300 + i}`,
      quantity: (i % 4) + 1, unit: 'un', description: 'Insumo de marcenaria.',
    })),
  },
];

export const NOT_FOUND_REASONS = [
  { value: 'FALTA_ESTOQUE',    label: 'Falta no estoque' },
  { value: 'PRODUTO_DANIFICADO', label: 'Produto danificado' },
  { value: 'DIVERGENCIA_CODIGO', label: 'Divergência de código' },
  { value: 'LOCAL_INCORRETO',  label: 'Produto em local incorreto' },
  { value: 'OUTRO',            label: 'Outro' },
];

// Classificação de entrega para o card da lista
export function classifyDelivery(deliveryDate) {
  const t = new Date(); t.setHours(0,0,0,0);
  const d = new Date(deliveryDate + 'T00:00:00');
  const diff = Math.round((d - t) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return { kind: 'atrasado', label: `Atrasado ${Math.abs(diff)}d`, days: diff };
  if (diff === 0) return { kind: 'hoje',     label: 'Entrega hoje',                days: diff };
  if (diff <= 2) return { kind: 'proxima',  label: `Em ${diff} dia${diff > 1 ? 's' : ''}`, days: diff };
  return            { kind: 'proxima',  label: `Em ${diff} dias`,             days: diff };
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(ms) {
  if (!ms || ms < 0) return '—';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (m >= 60) {
    const h = Math.floor(m / 60); const rm = m % 60;
    return `${h}h ${rm}min`;
  }
  return `${m}min ${s.toString().padStart(2,'0')}s`;
}
