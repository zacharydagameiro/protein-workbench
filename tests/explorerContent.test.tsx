import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleProteins } from '../src/data/sampleProteins.js';
import {
  buildRecentItems,
  getTeachingCodonEntry,
  normalizeDisplayTitle,
} from '../src/utils/explorerContent.js';
import { buildProteinBankRows } from '../src/utils/proteinBank.js';

test('normalizeDisplayTitle converts shouty source titles to readable text', () => {
  const normalized = normalizeDisplayTitle(
    'WATER STRUCTURE OF A HYDROPHOBIC PROTEIN AT ATOMIC RESOLUTION',
  );

  assert.equal(normalized, 'Water Structure of a Hydrophobic Protein at Atomic Resolution');
});

test('buildRecentItems produces compact recent presentation rows', () => {
  const recentItems = buildRecentItems(sampleProteins);

  assert.equal(recentItems.length, 2);
  assert.equal(recentItems[0].label, sampleProteins[0].metadata.displayTitle);
  assert.match(recentItems[0].subtitle, /Teaching sample|chain/);
});

test('teaching codon entries expose DNA and RNA triplets', () => {
  const lysine = getTeachingCodonEntry('K');

  assert.deepEqual(lysine.dnaTriplets, ['AAA', 'AAG']);
  assert.deepEqual(lysine.rnaTriplets, ['AAA', 'AAG']);
});

test('Protein Bank rows merge starter, pinned, and history proteins', () => {
  const rows = buildProteinBankRows({
    starterProteins: sampleProteins,
    searchResults: [],
    pinnedProteins: [sampleProteins[0]],
    historyProteins: [sampleProteins[1]],
  });

  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0].collections.length > 0, true);
});
