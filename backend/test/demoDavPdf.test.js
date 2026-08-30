import assert from 'node:assert/strict';
import test from 'node:test';
import { parseDav } from '../src/services/davParserService.js';
import { createDemoDavPdf } from '../src/utils/demoDavPdf.js';

test('DAV de demonstração percorre os três destinos do import', async () => {
  const parsed = await parseDav(createDemoDavPdf());

  assert.equal(parsed.orderNumber, '900001');
  assert.equal(parsed.customerName, 'DEMONSTRACAO STOCKROUTE');
  assert.deepEqual(parsed.items.map((item) => item.rawSku), [
    '00000000002671',
    '00000000000313',
    '99999999999999',
  ]);
  assert.equal(parsed.items[1].rawDescription, 'FURACAO BROCA 35MM (DOBRADICA)');
  assert.equal(parsed.items[2].manufacturerReference, 'DEMO-PUX-128');
});
