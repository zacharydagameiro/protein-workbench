import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleProteins } from '../src/data/sampleProteins.js';
import { buildProteinBankRows, defaultProteinBankFilters, filterProteinBankRows, sortProteinBankRows } from '../src/utils/proteinBank.js';
test('buildProteinBankRows dedupes proteins and preserves collection membership', () => {
    const rows = buildProteinBankRows({
        starterProteins: [sampleProteins[0]],
        pinnedProteins: [sampleProteins[0]],
        historyProteins: [sampleProteins[1]],
        searchResults: [sampleProteins[0], sampleProteins[1]],
    });
    assert.equal(rows.length, 2);
    const firstRow = rows.find((row) => row.protein.id === sampleProteins[0].id);
    assert.ok(firstRow);
    assert.deepEqual(firstRow.collections.sort(), ['pinned', 'search', 'starter']);
});
test('filterProteinBankRows narrows by source and variant presence, then sorts by chain count', () => {
    const rcsbProtein = {
        ...sampleProteins[1],
        metadata: {
            ...sampleProteins[1].metadata,
            source: 'rcsb',
            pdbId: '9XYZ',
            displayTitle: 'Resolved Variant Protein',
            experimentalMethod: 'X-RAY DIFFRACTION',
            organism: 'Homo sapiens',
            resolution: 1.2,
        },
    };
    const rows = buildProteinBankRows({
        starterProteins: [sampleProteins[0]],
        pinnedProteins: [],
        historyProteins: [],
        searchResults: [rcsbProtein],
    });
    const filtered = filterProteinBankRows(rows, {
        ...defaultProteinBankFilters(),
        source: 'rcsb',
        variantPresence: 'with-variants',
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].protein.id, rcsbProtein.id);
    const sorted = sortProteinBankRows(rows, 'chainCount');
    assert.ok(sorted[0].chainCount >= sorted[1].chainCount);
});
test('buildProteinBankRows tolerates legacy protein records with missing arrays', () => {
    const legacyProtein = {
        id: 'legacy-protein',
        name: 'Legacy Protein',
        metadata: {
            displayTitle: 'Legacy Protein',
            source: 'sample',
        },
    };
    const rows = buildProteinBankRows({
        starterProteins: [],
        pinnedProteins: [legacyProtein],
        historyProteins: [],
        searchResults: [],
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].chainCount, 0);
    assert.equal(rows[0].variantCount, 0);
});
