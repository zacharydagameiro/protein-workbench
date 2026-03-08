import test from 'node:test';
import assert from 'node:assert/strict';
import { proteinBankSortKeyFromSortingState, proteinBankSortLabel, proteinBankSortingStateFromSortKey } from '../src/utils/proteinBankTable.js';
test('proteinBankSortingStateFromSortKey maps title and numeric sorts correctly', () => {
    assert.deepEqual(proteinBankSortingStateFromSortKey('title'), [{ id: 'title', desc: false }]);
    assert.deepEqual(proteinBankSortingStateFromSortKey('resolution'), [{ id: 'resolution', desc: false }]);
    assert.deepEqual(proteinBankSortingStateFromSortKey('chainCount'), [{ id: 'chainCount', desc: true }]);
});
test('proteinBankSortKeyFromSortingState restores the expected app sort keys', () => {
    assert.equal(proteinBankSortKeyFromSortingState([{ id: 'pdbId', desc: false }]), 'pdbId');
    assert.equal(proteinBankSortKeyFromSortingState([{ id: 'resolution', desc: false }]), 'resolution');
    assert.equal(proteinBankSortKeyFromSortingState([{ id: 'chainCount', desc: true }]), 'chainCount');
    assert.equal(proteinBankSortKeyFromSortingState([]), 'title');
});
test('proteinBankSortLabel returns user-facing labels for sort controls', () => {
    assert.equal(proteinBankSortLabel('title'), 'Title');
    assert.equal(proteinBankSortLabel('pdbId'), 'PDB ID');
    assert.equal(proteinBankSortLabel('resolution'), 'Resolution');
    assert.equal(proteinBankSortLabel('chainCount'), 'Chain count');
});
