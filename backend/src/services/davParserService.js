import { PDFParse } from 'pdf-parse';

// ============================================================
// Parser do PDF DAV
//
// Estrutura típica de cada item no PDF (4 linhas, com 2 opcionais):
//
//   <seq3> <sku14>                                         (linha A)
//   MOTMD                                                  (linha B)
//   <DESC...> <UNIT> <QTY> <PRICE> <TOTAL> <MANUFACTURER> [<addr>] [<TB> <SALDO>]   (linha C)
//   [<REFERENCE> [<addr>] <TB> <SALDO>]                    (linha D — opcional)
//
// Quando o item tem referência do fabricante, ela aparece na linha D.
// Caso contrário, o TB + saldo já vêm no final da linha C.
// ============================================================

const UNIT_CODES = 'UN|SC|M|CT|PC|KT|PR|CX|RL|MR|GR|BD|RO|JG|CJ|FD|ML|KG|LT|PT|MT|GL|MP';
const UNIT_RE = new RegExp(`\\b(${UNIT_CODES})\\s+(\\d+)\\s+[\\d,.]+\\s+[\\d,.]+`, 'g');

// Detecta início de outro item (usado para saber se há "linha D" antes do próximo).
const ITEM_HEADER_RE = /^(\d{3})\s+(\d{14})$/;

// Extrai descrição, unidade, quantidade e "cauda" (texto após o total).
// A cauda contém fabricante (+ eventualmente endereço/TB/saldo).
function parseDescLine(line) {
  UNIT_RE.lastIndex = 0;
  let last = null;
  let m;
  while ((m = UNIT_RE.exec(line)) !== null) {
    last = m;
  }
  if (!last) return null;

  // Posição logo após o "<TOTAL>" do último match.
  const totalEnd = last.index + last[0].length;

  return {
    description: line.slice(0, last.index).trim(),
    unit:        last[1],
    quantity:    parseInt(last[2], 10),
    tail:        line.slice(totalEnd).trim(),
  };
}

// Remove " <TB> <SALDO>" do final de uma string, se existir.
// TB é sempre 1 e saldo é inteiro positivo.
function stripTbSaldo(text) {
  return text.replace(/\s+\d+\s+[\d.,]+\s*$/, '').trim();
}

// Remove um endereço alfanumérico curto do final, se existir.
// Aceita formatos como "43F", "44C", "11B", "GALPAO 2", "C 01 D".
function stripAddress(text) {
  // tenta padrões mais específicos primeiro
  return text
    .replace(/\s+GALPAO\s+\d+\s*$/i, '')
    .replace(/\s+C\s+\d{1,3}\s+[A-Z]\s*$/i, '')
    .replace(/\s+\d{2,3}[A-Z]\s*$/i, '')
    .trim();
}

// Heurística: linha C → fabricante.
// A cauda (após o total) é "<MANUFACTURER> [<addr>] [<TB> <SALDO>]" ou "<MANUFACTURER>"
// (quando há linha D separada). Removemos TB+saldo e endereço opcional do final.
function extractManufacturerFromTail(tail) {
  if (!tail) return null;
  let candidate = stripAddress(stripTbSaldo(tail));
  // Pode ainda ter endereço sem padrão claro — não é crítico.
  return candidate || null;
}

// Linha D → "<REFERENCE> [<addr>] <TB> <SALDO>".
// Pegamos o primeiro token alfanumérico como referência.
function extractReferenceFromLineD(line) {
  if (!line) return null;
  // Ignora se for clara linha de cabeçalho de outro item.
  if (ITEM_HEADER_RE.test(line.trim())) return null;
  if (line.trim() === 'MOTMD') return null;

  const tokens = line.trim().split(/\s+/);
  if (!tokens.length) return null;

  // Primeiro token = referência. Aceita números, letras, pontos e barras.
  const first = tokens[0];
  if (!/^[A-Za-z0-9][A-Za-z0-9./_-]*$/.test(first)) return null;
  // Se for só "1" ou "12" etc (TB sozinho), ignora.
  if (/^\d{1,3}$/.test(first) && tokens.length <= 2) return null;
  return first;
}

function extractItems(text) {
  const lines = text.split('\n');
  const items = [];

  for (let i = 0; i < lines.length - 2; i++) {
    const seqMatch = lines[i].match(ITEM_HEADER_RE);
    if (!seqMatch) continue;
    if (lines[i + 1].trim() !== 'MOTMD') continue;

    const parsed = parseDescLine(lines[i + 2]);
    if (!parsed) continue;

    const manufacturerName = extractManufacturerFromTail(parsed.tail);

    // Tenta linha D (i+3). Só aceita se NÃO for início de outro item.
    let manufacturerReference = null;
    const lineD = lines[i + 3];
    if (lineD && !ITEM_HEADER_RE.test(lineD.trim()) && lineD.trim() !== 'MOTMD') {
      manufacturerReference = extractReferenceFromLineD(lineD);
    }

    items.push({
      rawSku:                seqMatch[2],
      rawDescription:        parsed.description,
      unit:                  parsed.unit,
      quantity:              parsed.quantity,
      manufacturerName:      manufacturerName,
      manufacturerReference: manufacturerReference,
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
