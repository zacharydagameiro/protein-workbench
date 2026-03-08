import type { Protein, StructureMetadata } from '../types/structure.js';

const HISTORY_KEY = 'protein-workbench-history-v1';
const MAX_HISTORY_ITEMS = 12;

export interface LibraryState {
  history: Protein[];
  pinned: Protein[];
  inventory: Protein[];
}

const normalizeStoredProtein = (value: unknown): Protein | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<Protein> & {
    metadata?: Partial<Protein['metadata']>;
  };

  if (typeof candidate.id !== 'string' || !candidate.id.trim()) {
    return null;
  }

  const metadata: Partial<StructureMetadata> = candidate.metadata ?? {};
  const displayTitle =
    metadata.displayTitle ??
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

const loadProteins = (key: string): Protein[] => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.map(normalizeStoredProtein).filter((protein): protein is Protein => protein !== null) : [];
  } catch (error) {
    console.error(`Failed to load ${key}:`, error);
    return [];
  }
};

const saveProteins = (key: string, proteins: Protein[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(proteins));
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
  }
};

const upsertProtein = (proteins: Protein[], protein: Protein, limit?: number): Protein[] => {
  const next = [protein, ...proteins.filter((item) => item.id !== protein.id)];
  return typeof limit === 'number' ? next.slice(0, limit) : next;
};

export const getLibraryState = (): LibraryState => ({
  history: loadProteins(HISTORY_KEY),
  pinned: [],
  inventory: [],
});

export const saveHistoryItem = (protein: Protein): Protein[] => {
  const history = upsertProtein(loadProteins(HISTORY_KEY), protein, MAX_HISTORY_ITEMS);
  saveProteins(HISTORY_KEY, history);
  return history;
};

export const removeHistoryItem = (id: string): Protein[] => {
  const history = loadProteins(HISTORY_KEY).filter((protein) => protein.id !== id);
  saveProteins(HISTORY_KEY, history);
  return history;
};

export const renameHistoryItem = (id: string, nextName: string): Protein[] => {
  const trimmedName = nextName.trim();
  if (!trimmedName) {
    return loadProteins(HISTORY_KEY);
  }

  const history = loadProteins(HISTORY_KEY).map((protein) =>
    protein.id === id
      ? {
          ...protein,
          name: trimmedName,
          metadata: {
            ...protein.metadata,
            title: trimmedName,
            displayTitle: trimmedName,
            moleculeName: trimmedName,
          },
        }
      : protein,
  );

  saveProteins(HISTORY_KEY, history);
  return history;
};

export const clearLibrarySection = (section: keyof LibraryState): LibraryState => {
  switch (section) {
    case 'history':
      localStorage.removeItem(HISTORY_KEY);
      break;
    case 'inventory':
    case 'pinned':
      break;
  }

  return getLibraryState();
};
