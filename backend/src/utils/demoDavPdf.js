const DEMO_LINES = [
  'No DAV: 900001',
  'NOME DO CLIENTE: DEMONSTRACAO STOCKROUTE CPF-CNPJ: 00.000.000/0001-00',
  '001 00000000002671',
  'MOTMD',
  'PARAFUSO 35 X 16MM PHS 100 UND PROMOB UN 4 1,00 4,00 FIXPRO 1 10',
  '002 00000000000313',
  'MOTMD',
  'FURACAO BROCA 35MM (DOBRADICA) UN 1 1,00 1,00 SERVICOS 1 0',
  '003 99999999999999',
  'MOTMD',
  'PUXADOR DEMO COBRE 128MM UN 2 10,00 20,00 ATELIE DEMO',
  'DEMO-PUX-128 1 0',
];

function escapePdfText(value) {
  return value.replace(/([\\()])/g, '\\$1');
}

export function createDemoDavPdf() {
  const text = [
    'BT',
    '/F1 10 Tf',
    '48 744 Td',
    '14 TL',
    ...DEMO_LINES.flatMap((line) => [`(${escapePdfText(line)}) Tj`, 'T*']),
    'ET',
  ].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf);
}
