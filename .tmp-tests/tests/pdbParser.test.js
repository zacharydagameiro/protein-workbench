import test from 'node:test';
import assert from 'node:assert/strict';
import { pdbToProtein } from '../src/services/pdbParser.js';
const buildAtomLine = ({ serial, atomName, residueName, chainId, residueNumber, x, y, z, element, }) => [
    'ATOM  ',
    serial.toString().padStart(5, ' '),
    ' ',
    atomName.padStart(4, ' '),
    ' ',
    residueName.padStart(3, ' '),
    ' ',
    chainId,
    residueNumber.toString().padStart(4, ' '),
    '    ',
    x.toFixed(3).padStart(8, ' '),
    y.toFixed(3).padStart(8, ' '),
    z.toFixed(3).padStart(8, ' '),
    '  1.00 20.00          ',
    element.padStart(2, ' '),
].join('');
const buildHelixLine = (chainId, startResidue, endResidue) => `HELIX    1   1 ALA ${chainId}${startResidue.toString().padStart(4, ' ')}  LYS ${chainId}${endResidue
    .toString()
    .padStart(4, ' ')}  1                                  ${String(endResidue - startResidue + 1).padStart(2, ' ')}`;
const buildSheetLine = (chainId, startResidue, endResidue) => `SHEET    1   A 1 THR ${chainId}${startResidue.toString().padStart(4, ' ')}  TYR ${chainId}${endResidue
    .toString()
    .padStart(4, ' ')}  0`;
test('pdbToProtein builds residue-aware chains and sequence metadata', () => {
    const pdb = [
        'TITLE     MINI TEST PROTEIN',
        'SEQRES   1 A    4  ALA GLY SER LYS',
        buildHelixLine('A', 1, 2),
        buildSheetLine('A', 3, 4),
        buildAtomLine({ serial: 1, atomName: 'N', residueName: 'ALA', chainId: 'A', residueNumber: 1, x: 1, y: 1, z: 1, element: 'N' }),
        buildAtomLine({ serial: 2, atomName: 'CA', residueName: 'ALA', chainId: 'A', residueNumber: 1, x: 1.5, y: 1.2, z: 1.1, element: 'C' }),
        buildAtomLine({ serial: 3, atomName: 'C', residueName: 'ALA', chainId: 'A', residueNumber: 1, x: 2, y: 1.4, z: 1.2, element: 'C' }),
        buildAtomLine({ serial: 4, atomName: 'N', residueName: 'GLY', chainId: 'A', residueNumber: 2, x: 2.3, y: 1.6, z: 1.3, element: 'N' }),
        buildAtomLine({ serial: 5, atomName: 'CA', residueName: 'GLY', chainId: 'A', residueNumber: 2, x: 2.9, y: 1.8, z: 1.5, element: 'C' }),
        buildAtomLine({ serial: 6, atomName: 'C', residueName: 'GLY', chainId: 'A', residueNumber: 2, x: 3.4, y: 2.1, z: 1.7, element: 'C' }),
        buildAtomLine({ serial: 7, atomName: 'N', residueName: 'SER', chainId: 'A', residueNumber: 3, x: 3.7, y: 2.3, z: 1.9, element: 'N' }),
        buildAtomLine({ serial: 8, atomName: 'CA', residueName: 'SER', chainId: 'A', residueNumber: 3, x: 4.1, y: 2.5, z: 2.1, element: 'C' }),
        buildAtomLine({ serial: 9, atomName: 'C', residueName: 'SER', chainId: 'A', residueNumber: 3, x: 4.7, y: 2.7, z: 2.4, element: 'C' }),
        buildAtomLine({ serial: 10, atomName: 'N', residueName: 'LYS', chainId: 'A', residueNumber: 4, x: 5.0, y: 2.9, z: 2.6, element: 'N' }),
        buildAtomLine({ serial: 11, atomName: 'CA', residueName: 'LYS', chainId: 'A', residueNumber: 4, x: 5.6, y: 3.1, z: 2.8, element: 'C' }),
        buildAtomLine({ serial: 12, atomName: 'C', residueName: 'LYS', chainId: 'A', residueNumber: 4, x: 6.1, y: 3.3, z: 3.0, element: 'C' }),
    ].join('\n');
    const protein = pdbToProtein(pdb, '1abc');
    assert.equal(protein.metadata.title, 'MINI TEST PROTEIN');
    assert.equal(protein.chains.length, 1);
    assert.equal(protein.chains[0].sequence, 'AGSK');
    assert.equal(protein.chains[0].residues.length, 4);
    assert.equal(protein.chains[0].residues[0].secondaryStructure, 'helix');
    assert.equal(protein.chains[0].residues[2].secondaryStructure, 'sheet');
    assert.equal(protein.backboneAtoms.length, 4);
});
