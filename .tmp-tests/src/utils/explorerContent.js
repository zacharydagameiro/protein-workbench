const titleAcronyms = new Set(['DNA', 'RNA', 'ATP', 'ADP', 'GTP', 'PDB', 'NMR', 'X-RAY', 'MRNA', 'TRNA', 'API']);
const aminoAcidNames = {
    A: 'Alanine',
    R: 'Arginine',
    N: 'Asparagine',
    D: 'Aspartic acid',
    C: 'Cysteine',
    Q: 'Glutamine',
    E: 'Glutamic acid',
    G: 'Glycine',
    H: 'Histidine',
    I: 'Isoleucine',
    L: 'Leucine',
    K: 'Lysine',
    M: 'Methionine',
    F: 'Phenylalanine',
    P: 'Proline',
    S: 'Serine',
    T: 'Threonine',
    W: 'Tryptophan',
    Y: 'Tyrosine',
    V: 'Valine',
    X: 'Unknown residue',
};
const codonTable = {
    A: ['GCT', 'GCC', 'GCA', 'GCG'],
    R: ['CGT', 'CGC', 'CGA', 'CGG', 'AGA', 'AGG'],
    N: ['AAT', 'AAC'],
    D: ['GAT', 'GAC'],
    C: ['TGT', 'TGC'],
    Q: ['CAA', 'CAG'],
    E: ['GAA', 'GAG'],
    G: ['GGT', 'GGC', 'GGA', 'GGG'],
    H: ['CAT', 'CAC'],
    I: ['ATT', 'ATC', 'ATA'],
    L: ['TTA', 'TTG', 'CTT', 'CTC', 'CTA', 'CTG'],
    K: ['AAA', 'AAG'],
    M: ['ATG'],
    F: ['TTT', 'TTC'],
    P: ['CCT', 'CCC', 'CCA', 'CCG'],
    S: ['TCT', 'TCC', 'TCA', 'TCG', 'AGT', 'AGC'],
    T: ['ACT', 'ACC', 'ACA', 'ACG'],
    W: ['TGG'],
    Y: ['TAT', 'TAC'],
    V: ['GTT', 'GTC', 'GTA', 'GTG'],
    X: [],
};
const isMostlyUppercase = (value) => {
    const letters = value.replace(/[^A-Za-z]/g, '');
    if (letters.length === 0) {
        return false;
    }
    const uppercaseCount = letters.replace(/[^A-Z]/g, '').length;
    return uppercaseCount / letters.length > 0.7;
};
const formatWord = (word, isFirstWord) => {
    const clean = word.trim();
    if (!clean) {
        return clean;
    }
    const lower = clean.toLowerCase();
    if (!isFirstWord && ['of', 'and', 'in', 'for', 'with', 'to', 'at', 'on', 'a'].includes(lower)) {
        return lower;
    }
    if (titleAcronyms.has(clean.toUpperCase()) || /^[A-Z0-9-]{2,}$/.test(clean) && clean.length <= 4) {
        return clean.toUpperCase();
    }
    return lower.charAt(0).toUpperCase() + lower.slice(1);
};
export const normalizeDisplayTitle = (rawTitle, fallback = 'Unknown structure') => {
    const source = rawTitle.trim() || fallback;
    if (!isMostlyUppercase(source)) {
        return source;
    }
    return source
        .split(/\s+/)
        .map((word, index) => formatWord(word, index === 0))
        .join(' ');
};
export const getTeachingCodonEntry = (aminoAcid) => {
    const residueCode = aminoAcid.toUpperCase() || 'X';
    const dnaTriplets = codonTable[residueCode] ?? [];
    const rnaTriplets = dnaTriplets.map((triplet) => triplet.replaceAll('T', 'U'));
    return {
        aminoAcid: residueCode,
        fullName: aminoAcidNames[residueCode] ?? aminoAcidNames.X,
        codons: dnaTriplets,
        dnaTriplets,
        rnaTriplets,
    };
};
const residueIdFromParts = (chainId, residueNumber, insertionCode) => `${chainId}:${residueNumber}:${insertionCode ?? ''}`;
const buildLoopRegions = (chain, occupied) => {
    const sortedIntervals = [...occupied].sort((left, right) => left[0] - right[0]);
    const loops = [];
    let cursor = chain.residues[0]?.residueNumber ?? 1;
    for (const [start, end] of sortedIntervals) {
        if (cursor < start) {
            loops.push({
                id: `${chain.id}:loop:${cursor}-${start - 1}`,
                label: `Loop ${cursor}-${start - 1}`,
                chainId: chain.id,
                startResidue: cursor,
                endResidue: start - 1,
                kind: 'loop',
                source: 'derived',
                structureLevel: 'secondary',
            });
        }
        cursor = Math.max(cursor, end + 1);
    }
    const tailResidue = chain.residues[chain.residues.length - 1]?.residueNumber;
    if (tailResidue !== undefined && cursor <= tailResidue) {
        loops.push({
            id: `${chain.id}:loop:${cursor}-${tailResidue}`,
            label: `Loop ${cursor}-${tailResidue}`,
            chainId: chain.id,
            startResidue: cursor,
            endResidue: tailResidue,
            kind: 'loop',
            source: 'derived',
            structureLevel: 'secondary',
        });
    }
    return loops.filter((region) => region.startResidue <= region.endResidue);
};
export const buildDerivedRegions = (protein) => {
    const chainRegions = protein.chains.map((chain) => ({
        id: `${protein.id}:${chain.id}:chain`,
        label: `Chain ${chain.id}`,
        chainId: chain.id,
        startResidue: chain.residues[0]?.residueNumber ?? 1,
        endResidue: chain.residues[chain.residues.length - 1]?.residueNumber ?? chain.residueCount,
        kind: 'chain',
        source: 'derived',
        description: `${chain.residueCount} resolved residues`,
        structureLevel: protein.chains.length > 1 ? 'quaternary' : 'tertiary',
    }));
    const helixRegions = protein.helices.map((helix) => ({
        id: `${protein.id}:${helix.chainId}:helix:${helix.startResidue}-${helix.endResidue}`,
        label: `Helix ${helix.startResidue}-${helix.endResidue}`,
        chainId: helix.chainId,
        startResidue: helix.startResidue,
        endResidue: helix.endResidue,
        kind: 'helix',
        source: 'derived',
        description: helix.comment,
        structureLevel: 'secondary',
    }));
    const sheetRegions = protein.sheets.flatMap((sheet) => sheet.strands.map((strand, index) => ({
        id: `${protein.id}:${strand.chainId}:sheet:${sheet.id}:${index}`,
        label: `Sheet ${strand.startResidue}-${strand.endResidue}`,
        chainId: strand.chainId,
        startResidue: strand.startResidue,
        endResidue: strand.endResidue,
        kind: 'sheet',
        source: 'derived',
        structureLevel: 'secondary',
    })));
    const loops = protein.chains.flatMap((chain) => {
        const occupied = [
            ...helixRegions.filter((region) => region.chainId === chain.id).map((region) => [region.startResidue, region.endResidue]),
            ...sheetRegions.filter((region) => region.chainId === chain.id).map((region) => [region.startResidue, region.endResidue]),
        ];
        return buildLoopRegions(chain, occupied);
    });
    return [...chainRegions, ...helixRegions, ...sheetRegions, ...loops];
};
const pickFocusResidue = (protein) => {
    const residue = protein.chains[0]?.residues[0];
    if (!residue) {
        return null;
    }
    return {
        residueId: residue.id,
        chainId: residue.chainId,
        residueNumber: residue.residueNumber,
        residueName: residue.residueName,
    };
};
const summarizeStructureLevel = (protein) => {
    if (protein.chains.length > 1) {
        return {
            level: 'quaternary',
            label: 'Quaternary arrangement',
            body: `This structure includes ${protein.chains.length} chains, so it is best explored as an assembly rather than a single folded chain.`,
        };
    }
    if (protein.helices.length > 0 || protein.sheets.length > 0) {
        return {
            level: 'secondary',
            label: 'Secondary structure',
            body: `The clearest teaching angle here is how helices, sheets, and loops organize the backbone into recognizable patterns.`,
        };
    }
    return {
        level: 'tertiary',
        label: 'Folded chain',
        body: `This structure is best understood as one folded chain, with the overall shape carrying more meaning than individual substructures.`,
    };
};
export const buildStoryCards = (protein) => {
    const focusResidue = pickFocusResidue(protein);
    const focusRegion = protein.regions.find((region) => region.kind === 'helix' || region.kind === 'sheet' || region.kind === 'domain') ??
        protein.regions.find((region) => region.kind === 'chain');
    const structureSummary = summarizeStructureLevel(protein);
    const cards = [
        {
            id: `${protein.id}:identity`,
            title: `What ${protein.metadata.displayTitle} is`,
            body: protein.metadata.functionSummary ?? protein.metadata.description,
            kind: 'identity',
            target: protein.chains[0] ? { kind: 'chain', chainId: protein.chains[0].id } : undefined,
        },
        {
            id: `${protein.id}:structure-level`,
            title: `Start with ${structureSummary.label.toLowerCase()}`,
            body: structureSummary.body,
            kind: 'structure',
            target: { kind: 'structure-level', level: structureSummary.level },
        },
    ];
    if (focusRegion) {
        cards.push({
            id: `${protein.id}:region`,
            title: `Focus on ${focusRegion.label.toLowerCase()}`,
            body: focusRegion.description ??
                `This region spans residues ${focusRegion.startResidue}-${focusRegion.endResidue} in chain ${focusRegion.chainId}.`,
            kind: 'region',
            target: { kind: 'region', region: focusRegion },
        });
    }
    if (focusResidue) {
        cards.push({
            id: `${protein.id}:translation`,
            title: 'Connect sequence to translation',
            body: 'Use the sequence view to see how one amino acid maps to a small codon family in teaching mode.',
            kind: 'translation',
            target: { kind: 'residue', residue: focusResidue },
        });
    }
    cards.push(protein.variants.length > 0
        ? {
            id: `${protein.id}:variant`,
            title: `Inspect a notable variant`,
            body: `${protein.variants[0].label} is included as a teaching example for how sequence changes can alter protein behavior.`,
            kind: 'variant',
            target: { kind: 'variant', variant: protein.variants[0] },
        }
        : {
            id: `${protein.id}:variant-empty`,
            title: 'Variant coverage is limited',
            body: 'Some structures include notable variants, but many entries do not have curated disease-linked examples.',
            kind: 'variant',
        });
    return cards.slice(0, 5);
};
export const buildRecentItems = (proteins) => proteins.slice(0, 8).map((protein) => ({
    id: protein.id,
    label: protein.metadata.displayTitle,
    subtitle: protein.metadata.organism ?? `${protein.chains.length} chain${protein.chains.length === 1 ? '' : 's'}`,
    pdbLabel: protein.metadata.pdbId ?? protein.id.toUpperCase(),
}));
export const getStructureLevelDescription = (protein, level) => {
    switch (level) {
        case 'primary':
            return {
                title: 'Primary structure',
                body: `Focus on the ordered amino-acid sequence. ${protein.chains.length} chain${protein.chains.length === 1 ? '' : 's'} contribute to the overall sequence story.`,
            };
        case 'secondary':
            return {
                title: 'Secondary structure',
                body: `${protein.helices.length} helices and ${protein.sheets.reduce((sum, sheet) => sum + sheet.strands.length, 0)} sheet strands define the repeating local structure.`,
            };
        case 'tertiary':
            return {
                title: 'Tertiary structure',
                body: 'Look at how each chain folds into a stable 3D form and how compact or extended the fold appears.',
            };
        case 'quaternary':
            return {
                title: 'Quaternary structure',
                body: protein.chains.length > 1
                    ? `This entry contains ${protein.chains.length} chains, so assembly-level organization matters.`
                    : 'This entry behaves like a single-chain structure, so quaternary organization is limited.',
            };
    }
};
export const getTargetedResidue = (target) => {
    if (!target) {
        return null;
    }
    if (target.kind === 'residue') {
        return target.residue;
    }
    if (target.kind === 'variant') {
        return {
            residueId: residueIdFromParts(target.variant.chainId, target.variant.residueNumber),
            chainId: target.variant.chainId,
            residueNumber: target.variant.residueNumber,
            residueName: target.variant.to ?? target.variant.from ?? 'UNK',
        };
    }
    if (target.kind === 'region') {
        return {
            residueId: residueIdFromParts(target.region.chainId, target.region.startResidue),
            chainId: target.region.chainId,
            residueNumber: target.region.startResidue,
            residueName: target.region.label,
        };
    }
    return null;
};
export const buildComparisonSummary = (proteins) => {
    const chainCounts = new Set(proteins.map((protein) => protein.chains.length));
    const residueCounts = proteins.map((protein) => protein.chains.reduce((sum, chain) => sum + chain.residueCount, 0));
    const range = Math.max(...residueCounts) - Math.min(...residueCounts);
    if (chainCounts.size > 1) {
        return 'The biggest difference in this comparison is assembly complexity: some structures are single-chain while others are multi-chain.';
    }
    if (range > 40) {
        return 'The clearest difference here is size: these proteins vary noticeably in resolved residue coverage.';
    }
    return 'These structures are similar in overall scale, so the most useful comparison is in secondary structure mix and annotations.';
};
export const enrichProteinForExplorer = (protein) => {
    const displayTitle = normalizeDisplayTitle(protein.metadata.displayTitle || protein.metadata.title || protein.name, protein.name);
    const metadata = {
        ...protein.metadata,
        rawTitle: protein.metadata.rawTitle || protein.metadata.title || protein.name,
        title: displayTitle,
        displayTitle,
        moleculeName: protein.metadata.moleculeName || displayTitle,
        description: protein.metadata.description || protein.metadata.functionSummary || displayTitle,
    };
    const withMetadata = {
        ...protein,
        name: displayTitle,
        metadata,
    };
    const regions = [...withMetadata.regions, ...buildDerivedRegions(withMetadata)].filter((region, index, allRegions) => allRegions.findIndex((candidate) => candidate.id === region.id) === index);
    const withRegions = {
        ...withMetadata,
        regions,
    };
    return {
        ...withRegions,
        storyCards: buildStoryCards(withRegions),
    };
};
