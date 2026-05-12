import { PDFParse } from 'pdf-parse';

// DAV unit codes that appear before quantity in item lines
const UNIT_CODES = 'UN|SC|M|CT|PC|KT|PR|CX|RL|MR|GR|BD|RO|JG|CJ|FD|ML|KG|LT|PT|MT|GL|MP';
const UNIT_RE = new RegExp(`\\b(${UNIT_CODES})\\s+(\\d+)\\s+[\\d,.]+\\s+[\\d,.]+`, 'g');

// Extracts the description, unit, and quantity from a DAV item line.
// Finds the last match of "UNIT QTY PRICE TOTAL" to handle descriptions
// that contain unit-like words (e.g. "C/10 UND" or "22MM").
function parseDescLine(line) {
  UNIT_RE.lastIndex = 0;
  let last = null;
  let m;
  while ((m = UNIT_RE.exec(line)) !== null) {
    last = m;
  }
  if (!last) return null;

  return {
    description: line.slice(0, last.index).trim(),
    unit:        last[1],
    quantity:    parseInt(last[2], 10),
  };
}

function extractItems(text) {
  const lines = text.split('\n');
  const items = [];

  for (let i = 0; i < lines.length - 2; i++) {
    const seqMatch = lines[i].match(/^(\d{3})\s+(\d{14})$/);
    if (!seqMatch) continue;
    if (lines[i + 1].trim() !== 'MOTMD') continue;

    const parsed = parseDescLine(lines[i + 2]);
    if (!parsed) continue;

    items.push({
      rawSku:         seqMatch[2],
      rawDescription: parsed.description,
      unit:           parsed.unit,
      quantity:       parsed.quantity,
    });
  }

  return items;
}

export async function parseDav(fileBuffer) {
  const parser = new PDFParse({ data: fileBuffer });
  await parser.load();
  const { text } = await parser.getText();
  await parser.destroy();

  const davMatch = text.match(/Nº DAV:\s*(\d+)/);
  if (!davMatch) {
    throw { status: 422, message: 'Número do DAV não encontrado no PDF' };
  }
  const orderNumber = davMatch[1].replace(/^0+/, '') || '0';

  const custMatch = text.match(/NOME DO CLIENTE:\s*(.+?)\s+CPF-CNPJ:/);
  const customerName = custMatch ? custMatch[1].trim() : 'CLIENTE NÃO IDENTIFICADO';

  const items = extractItems(text);
  if (items.length === 0) {
    throw { status: 422, message: 'Nenhum item encontrado no PDF DAV' };
  }

  return { orderNumber, customerName, items };
}
