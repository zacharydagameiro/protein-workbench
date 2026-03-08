import type {
  Protein,
  ProteinBankFilterState,
  ProteinBankRow,
  ProteinBankSortKey,
} from '../types/structure.js';

interface BuildProteinBankRowsInput {
  starterProteins: Protein[];
  pinnedProteins: Protein[];
  historyProteins: Protein[];
  searchResults: Protein[];
}

const defaultRowText = (value: string | undefined, fallback = 'Unavailable') => value?.trim() || fallback;

export const buildProteinBankRows = ({
  starterProteins,
  pinnedProteins,
  historyProteins,
  searchResults,
}: BuildProteinBankRowsInput): ProteinBankRow[] => {
  const rows = new Map<string, ProteinBankRow>();

  const register = (protein: Protein, collection: ProteinBankRow['collections'][number]) => {
    const existing = rows.get(protein.id);
    if (existing) {
      if (!existing.collections.includes(collection)) {
        existing.collections.push(collection);
      }
      return;
    }

    rows.set(protein.id, {
      protein,
      collections: [collection],
      title: protein.name ?? protein.metadata?.displayTitle ?? protein.metadata?.title ?? protein.id,
      pdbLabel: protein.metadata?.pdbId ?? protein.id.toUpperCase(),
      organism: defaultRowText(protein.metadata?.organism),
      experimentalMethod: defaultRowText(protein.metadata?.experimentalMethod),
      resolution: protein.metadata?.resolution ?? null,
      chainCount: Array.isArray(protein.chains) ? protein.chains.length : 0,
      variantCount: Array.isArray(protein.variants) ? protein.variants.length : 0,
    });
  };

  starterProteins.forEach((protein) => register(protein, 'starter'));
  pinnedProteins.forEach((protein) => register(protein, 'pinned'));
  historyProteins.forEach((protein) => register(protein, 'history'));
  searchResults.forEach((protein) => register(protein, 'search'));

  return [...rows.values()];
};

export const defaultProteinBankFilters = (): ProteinBankFilterState => ({
  collection: 'all',
  source: 'all',
  organism: 'all',
  experimentalMethod: 'all',
  variantPresence: 'all',
});

export const getProteinBankOptions = (rows: ProteinBankRow[]) => ({
  organisms: [...new Set(rows.map((row) => row.organism).filter((value) => value !== 'Unavailable'))].sort((left, right) =>
    left.localeCompare(right),
  ),
  methods: [...new Set(rows.map((row) => row.experimentalMethod).filter((value) => value !== 'Unavailable'))].sort((left, right) =>
    left.localeCompare(right),
  ),
});

export const filterProteinBankRows = (rows: ProteinBankRow[], filters: ProteinBankFilterState): ProteinBankRow[] =>
  rows.filter((row) => {
    if (filters.collection !== 'all' && !row.collections.includes(filters.collection)) {
      return false;
    }
    if (filters.source !== 'all' && row.protein.metadata.source !== filters.source) {
      return false;
    }
    if (filters.organism !== 'all' && row.organism !== filters.organism) {
      return false;
    }
    if (filters.experimentalMethod !== 'all' && row.experimentalMethod !== filters.experimentalMethod) {
      return false;
    }
    if (filters.variantPresence === 'with-variants' && row.variantCount === 0) {
      return false;
    }
    if (filters.variantPresence === 'without-variants' && row.variantCount > 0) {
      return false;
    }
    return true;
  });

export const sortProteinBankRows = (rows: ProteinBankRow[], sortKey: ProteinBankSortKey): ProteinBankRow[] => {
  const sorted = [...rows];

  sorted.sort((left, right) => {
    switch (sortKey) {
      case 'pdbId':
        return left.pdbLabel.localeCompare(right.pdbLabel) || left.title.localeCompare(right.title);
      case 'resolution': {
        const leftResolution = left.resolution ?? Number.POSITIVE_INFINITY;
        const rightResolution = right.resolution ?? Number.POSITIVE_INFINITY;
        return leftResolution - rightResolution || left.title.localeCompare(right.title);
      }
      case 'chainCount':
        return right.chainCount - left.chainCount || left.title.localeCompare(right.title);
      case 'title':
      default:
        return left.title.localeCompare(right.title) || left.pdbLabel.localeCompare(right.pdbLabel);
    }
  });

  return sorted;
};
