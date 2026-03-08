const residueCodeMap = {
    ALA: 'A',
    ARG: 'R',
    ASN: 'N',
    ASP: 'D',
    CYS: 'C',
    GLN: 'Q',
    GLU: 'E',
    GLY: 'G',
    HIS: 'H',
    ILE: 'I',
    LEU: 'L',
    LYS: 'K',
    MET: 'M',
    PHE: 'F',
    PRO: 'P',
    SER: 'S',
    THR: 'T',
    TRP: 'W',
    TYR: 'Y',
    VAL: 'V',
};
const parseElement = (atomName, elementColumn) => {
    const element = elementColumn.trim().toUpperCase();
    if (element === 'C' || element === 'N' || element === 'O' || element === 'S' || element === 'H' || element === 'P') {
        return element;
    }
    const fallback = atomName.trim().charAt(0).toUpperCase();
    if (fallback === 'C' || fallback === 'N' || fallback === 'O' || fallback === 'S' || fallback === 'H' || fallback === 'P') {
        return fallback;
    }
    return 'OTHER';
};
const toResidueCode = (residueName) => residueCodeMap[residueName.toUpperCase()] ?? 'X';
const residueKey = (chainId, residueNumber, insertionCode) => `${chainId}:${residueNumber}:${insertionCode}`;
const compareInsertionCode = (left, right) => (left ?? '').localeCompare(right ?? '');
const byResiduePosition = (left, right) => {
    if (left.residueNumber !== right.residueNumber) {
        return left.residueNumber - right.residueNumber;
    }
    return compareInsertionCode(left.insertionCode, right.insertionCode);
};
export const parsePDBAtoms = (pdbContent) => {
    const atoms = [];
    for (const line of pdbContent.split('\n')) {
        if (!line.startsWith('ATOM  ') && !line.startsWith('HETATM')) {
            continue;
        }
        const atomNumber = Number.parseInt(line.slice(6, 11).trim(), 10);
        const atomName = line.slice(12, 16).trim();
        const residueName = line.slice(17, 20).trim();
        const chainId = line.slice(21, 22).trim() || 'A';
        const residueNumber = Number.parseInt(line.slice(22, 26).trim(), 10);
        const insertionCode = line.slice(26, 27).trim();
        const x = Number.parseFloat(line.slice(30, 38).trim());
        const y = Number.parseFloat(line.slice(38, 46).trim());
        const z = Number.parseFloat(line.slice(46, 54).trim());
        if (Number.isNaN(atomNumber) ||
            Number.isNaN(residueNumber) ||
            Number.isNaN(x) ||
            Number.isNaN(y) ||
            Number.isNaN(z)) {
            continue;
        }
        const residueCode = toResidueCode(residueName);
        atoms.push({
            id: `${chainId}:${residueNumber}:${insertionCode}:${atomNumber}`,
            x,
            y,
            z,
            element: parseElement(atomName, line.slice(76, 78)),
            atomName,
            residueName,
            residueCode,
            chainId,
            residueNumber,
            insertionCode: insertionCode || undefined,
        });
    }
    return atoms;
};
export const parseSecondaryStructure = (pdbContent) => {
    const helices = [];
    const sheetMap = new Map();
    for (const line of pdbContent.split('\n')) {
        if (line.startsWith('HELIX')) {
            const helixId = Number.parseInt(line.slice(7, 10).trim(), 10) || helices.length + 1;
            helices.push({
                id: helixId,
                chainId: line.slice(19, 20).trim() || 'A',
                startResidue: Number.parseInt(line.slice(21, 25).trim(), 10) || 0,
                endResidue: Number.parseInt(line.slice(33, 37).trim(), 10) || 0,
                type: line.slice(38, 40).trim() || '1',
                comment: line.slice(40, 70).trim() || undefined,
            });
            continue;
        }
        if (line.startsWith('SHEET')) {
            const sheetId = Number.parseInt(line.slice(7, 10).trim(), 10) || 1;
            const strand = {
                chainId: line.slice(21, 22).trim() || 'A',
                startResidue: Number.parseInt(line.slice(22, 26).trim(), 10) || 0,
                endResidue: Number.parseInt(line.slice(33, 37).trim(), 10) || 0,
                sense: Number.parseInt(line.slice(38, 40).trim(), 10) || undefined,
            };
            const sheet = sheetMap.get(sheetId) ?? {
                id: sheetId,
                numStrands: Number.parseInt(line.slice(14, 16).trim(), 10) || 1,
                strands: [],
            };
            sheet.strands.push(strand);
            sheetMap.set(sheetId, sheet);
        }
    }
    return {
        helices,
        sheets: [...sheetMap.values()],
    };
};
export const parseSEQRES = (pdbContent) => {
    const residuesByChain = new Map();
    for (const line of pdbContent.split('\n')) {
        if (!line.startsWith('SEQRES')) {
            continue;
        }
        const chainId = line.slice(11, 12).trim() || 'A';
        const residues = line
            .slice(19, 70)
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map(toResidueCode);
        const next = residuesByChain.get(chainId) ?? [];
        next.push(...residues);
        residuesByChain.set(chainId, next);
    }
    return new Map([...residuesByChain.entries()].map(([chainId, residues]) => [chainId, residues.join('')]));
};
const residueSecondaryStructure = (chainId, residueNumber, helices, sheets) => {
    if (helices.some((helix) => helix.chainId === chainId && residueNumber >= helix.startResidue && residueNumber <= helix.endResidue)) {
        return 'helix';
    }
    if (sheets.some((sheet) => sheet.strands.some((strand) => strand.chainId === chainId && residueNumber >= strand.startResidue && residueNumber <= strand.endResidue))) {
        return 'sheet';
    }
    return 'loop';
};
const buildChains = (atoms, helices, sheets, seqresByChain) => {
    const residuesByChain = new Map();
    for (const atom of atoms) {
        const chainResidues = residuesByChain.get(atom.chainId) ?? new Map();
        const key = residueKey(atom.chainId, atom.residueNumber, atom.insertionCode ?? '');
        const existing = chainResidues.get(key);
        if (existing) {
            existing.atomIds.push(atom.id);
        }
        else {
            chainResidues.set(key, {
                id: `${atom.chainId}:${atom.residueNumber}:${atom.insertionCode ?? ''}`,
                chainId: atom.chainId,
                residueNumber: atom.residueNumber,
                insertionCode: atom.insertionCode,
                residueName: atom.residueName,
                residueCode: atom.residueCode,
                sequenceIndex: 0,
                atomIds: [atom.id],
                secondaryStructure: residueSecondaryStructure(atom.chainId, atom.residueNumber, helices, sheets),
            });
        }
        residuesByChain.set(atom.chainId, chainResidues);
    }
    return [...residuesByChain.entries()]
        .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
        .map(([chainId, residueMap]) => {
        const residues = [...residueMap.values()].sort(byResiduePosition).map((residue, index) => ({
            ...residue,
            sequenceIndex: index,
        }));
        return {
            id: chainId,
            polymerType: 'protein',
            residues,
            residueCount: residues.length,
            sequence: seqresByChain.get(chainId) ?? residues.map((residue) => residue.residueCode).join(''),
            sequenceSource: seqresByChain.has(chainId) ? 'seqres' : 'atoms',
        };
    });
};
const extractBackboneAtoms = (atoms) => atoms.filter((atom) => atom.atomName === 'CA');
const parseTitle = (pdbContent, pdbId) => {
    const lines = pdbContent
        .split('\n')
        .filter((line) => line.startsWith('TITLE'))
        .map((line) => line.slice(10).trim())
        .filter(Boolean);
    return lines.join(' ') || `PDB structure ${pdbId.toUpperCase()}`;
};
export const pdbToProtein = (pdbContent, pdbId, name) => {
    const atoms = parsePDBAtoms(pdbContent);
    const { helices, sheets } = parseSecondaryStructure(pdbContent);
    const chains = buildChains(atoms, helices, sheets, parseSEQRES(pdbContent));
    const title = parseTitle(pdbContent, pdbId);
    return {
        id: pdbId.toLowerCase(),
        name: name ?? pdbId.toUpperCase(),
        atoms,
        backboneAtoms: extractBackboneAtoms(atoms),
        chains,
        helices,
        sheets,
        metadata: {
            source: 'rcsb',
            title,
            rawTitle: title,
            displayTitle: title,
            moleculeName: undefined,
            description: title,
            pdbId: pdbId.toUpperCase(),
        },
        regions: [],
        variants: [],
        storyCards: [],
    };
};
