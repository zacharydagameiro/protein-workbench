import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleProteins } from '../src/data/sampleProteins.js';
import { buildVisibleSequenceLanes, getSequenceHighlightRange } from '../src/utils/sequenceTrack.js';
test('buildVisibleSequenceLanes builds condensed overview blocks and preserves selection state', () => {
    const protein = sampleProteins[0];
    const residue = protein.chains[0].residues[0];
    const lanes = buildVisibleSequenceLanes({
        protein,
        chainFilter: 'all',
        sequenceState: {
            activeChainId: 'A',
            density: 'overview',
            focusedResidueId: residue.id,
            highlightedRange: null,
        },
        structureLevel: 'secondary',
        selectedResidue: {
            residueId: residue.id,
            chainId: residue.chainId,
            residueNumber: residue.residueNumber,
            residueName: residue.residueName,
        },
    });
    assert.equal(lanes.length, 1);
    assert.equal(lanes[0].isActive, true);
    assert.equal(lanes[0].items[0].kind, 'block');
    assert.equal(lanes[0].items[0].isSelected, true);
});
test('getSequenceHighlightRange derives sequence spans for region and variant targets', () => {
    const protein = sampleProteins[0];
    const region = protein.regions.find((entry) => entry.kind !== 'chain');
    const variant = protein.variants[0];
    assert.deepEqual(getSequenceHighlightRange(region ? { kind: 'region', region } : null), region
        ? {
            chainId: region.chainId,
            startResidue: region.startResidue,
            endResidue: region.endResidue,
            source: 'region',
        }
        : null);
    assert.deepEqual(getSequenceHighlightRange({ kind: 'variant', variant }), {
        chainId: variant.chainId,
        startResidue: variant.residueNumber,
        endResidue: variant.residueNumber,
        source: 'variant',
    });
});
