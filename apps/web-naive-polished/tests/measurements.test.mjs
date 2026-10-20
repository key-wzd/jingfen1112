import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toMeasurement,
  displayValue,
  readSelection,
  deviceKey,
  csvCell,
} from '../src/utils/measurements.ts';

test('zero is preserved and distinct from missing measurements', () => {
  assert.equal(toMeasurement(0), 0);
  assert.equal(toMeasurement('0'), 0);
  for (const input of [
    null,
    undefined,
    '',
    ' ',
    '—',
    '-',
    'N/A',
    false,
    NaN,
    Infinity,
    '50mW',
    '1.2x',
    '0x10',
    '1.2.3',
  ]) {
    assert.equal(toMeasurement(input), null, String(input));
  }
  assert.equal(displayValue(0), '0');
  assert.equal(displayValue(null), '—');
});
test('numeric readings accept only complete numeric strings', () => {
  assert.equal(toMeasurement(' 1,250.5 '), 1250.5);
  assert.equal(toMeasurement('1.5e-3'), 0.0015);
  assert.equal(toMeasurement('-0.25'), -0.25);
  assert.equal(toMeasurement('1,2'), null);
});
test('selection round-trips punctuation and distinguishes brands with identical models', () => {
  const values = [
    { brand: 'Alpha,Co', model: '50%:: test' },
    { brand: 'Beta', model: '50%:: test' },
  ];
  assert.deepEqual(readSelection(JSON.stringify(values)), values);
  assert.notEqual(deviceKey(values[0]), deviceKey(values[1]));
  assert.deepEqual(
    readSelection(JSON.stringify([...values, values[0]])),
    values,
  );
  assert.deepEqual(readSelection('not-json'), []);
  assert.deepEqual(readSelection('Alpha::50% test', true), [
    { brand: 'Alpha', model: '50% test' },
  ]);
});
test('CSV retains zero/missing and escapes quotes and spreadsheet formulas', () => {
  assert.equal(csvCell(0), '"0"');
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell('a"b'), '"a""b"');
  assert.equal(csvCell('=1+1'), '"\'=1+1"');
});
