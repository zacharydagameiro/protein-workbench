const HISTORY_KEY = 'protein-workbench-history-v1';
const PINNED_KEY = 'protein-workbench-pinned-v1';
const MAX_HISTORY_ITEMS = 12;
const normalizeStoredProtein = (value) => {
    if (!value || typeof value !== 'object') {
        return null;
    }
    const candidate = value;
    if (typeof candidate.id !== 'string' || !candidate.id.trim()) {
        return null;
    }
    const metadata = candidate.metadata ?? {};
    const displayTitle = metadata.displayTitle ??
        metadata.title ??
        candidate.name ??
        candidate.id;
    return {
        id: candidate.id,
        name: candidate.name ?? displayTitle,
        atoms: Array.isArray(candidate.atoms) ? candidate.atoms : [],
        backboneAtoms: Array.isArray(candidate.backboneAtoms) ? candidate.backboneAtoms : [],
        chains: Array.isArray(candidate.chains) ? candidate.chains : [],
        helices: Array.isArray(candidate.helices) ? candidate.helices : [],
        sheets: Array.isArray(candidate.sheets) ? candidate.sheets : [],
        regions: Array.isArray(candidate.regions) ? candidate.regions : [],
        variants: Array.isArray(candidate.variants) ? candidate.variants : [],
        storyCards: Array.isArray(candidate.storyCards) ? candidate.storyCards : [],
        metadata: {
            source: metadata.source === 'rcsb' ? 'rcsb' : 'sample',
            title: metadata.title ?? displayTitle,
            rawTitle: metadata.rawTitle ?? metadata.title ?? displayTitle,
            displayTitle,
            moleculeName: metadata.moleculeName ?? displayTitle,
            description: metadata.description ?? metadata.functionSummary ?? displayTitle,
            pdbId: metadata.pdbId,
            uniprotId: metadata.uniprotId,
            organism: metadata.organism,
            experimentalMethod: metadata.experimentalMethod,
            resolution: metadata.resolution ?? null,
            keywords: Array.isArray(metadata.keywords) ? metadata.keywords : [],
            functionSummary: metadata.functionSummary,
            geneName: metadata.geneName,
        },
    };
};
const loadProteins = (key) => {
    try {
        const stored = localStorage.getItem(key);
        if (!stored) {
            return [];
        }
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed.map(normalizeStoredProtein).filter((protein) => protein !== null) : [];
    }
    catch (error) {
        console.error(`Failed to load ${key}:`, error);
        return [];
    }
};
const saveProteins = (key, proteins) => {
    try {
        localStorage.setItem(key, JSON.stringify(proteins));
    }
    catch (error) {
        console.error(`Failed to save ${key}:`, error);
    }
};
const upsertProtein = (proteins, protein, limit) => {
    const next = [protein, ...proteins.filter((item) => item.id !== protein.id)];
    return typeof limit === 'number' ? next.slice(0, limit) : next;
};
export const getLibraryState = () => ({
    history: loadProteins(HISTORY_KEY),
    pinned: loadProteins(PINNED_KEY),
});
export const saveHistoryItem = (protein) => {
    const history = upsertProtein(loadProteins(HISTORY_KEY), protein, MAX_HISTORY_ITEMS);
    saveProteins(HISTORY_KEY, history);
    return history;
};
export const removeHistoryItem = (id) => {
    const history = loadProteins(HISTORY_KEY).filter((protein) => protein.id !== id);
    saveProteins(HISTORY_KEY, history);
    return history;
};
export const togglePinnedProtein = (protein) => {
    const pinned = loadProteins(PINNED_KEY);
    const next = pinned.some((item) => item.id === protein.id)
        ? pinned.filter((item) => item.id !== protein.id)
        : upsertProtein(pinned, protein);
    saveProteins(PINNED_KEY, next);
    return next;
};
export const clearLibrarySection = (section) => {
    switch (section) {
        case 'history':
            localStorage.removeItem(HISTORY_KEY);
            break;
        case 'pinned':
            localStorage.removeItem(PINNED_KEY);
            break;
    }
    return getLibraryState();
};
