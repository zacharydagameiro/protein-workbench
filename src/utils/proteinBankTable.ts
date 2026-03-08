import type { SortingState } from '@tanstack/react-table';
import type { ProteinBankSortKey, ProteinBankTableColumnId } from '../types/structure.js';

const proteinBankSortConfig: Record<ProteinBankSortKey, { columnId: ProteinBankTableColumnId; desc: boolean }> = {
  title: {
    columnId: 'title',
    desc: false,
  },
  pdbId: {
    columnId: 'pdbId',
    desc: false,
  },
  resolution: {
    columnId: 'resolution',
    desc: false,
  },
  chainCount: {
    columnId: 'chainCount',
    desc: true,
  },
};

export const proteinBankSortingStateFromSortKey = (sortKey: ProteinBankSortKey): SortingState => [
  {
    id: proteinBankSortConfig[sortKey].columnId,
    desc: proteinBankSortConfig[sortKey].desc,
  },
];

export const proteinBankSortKeyFromSortingState = (sorting: SortingState): ProteinBankSortKey => {
  const [entry] = sorting;
  if (!entry) {
    return 'title';
  }

  if (entry.id === 'resolution') {
    return 'resolution';
  }
  if (entry.id === 'chainCount') {
    return 'chainCount';
  }
  if (entry.id === 'pdbId') {
    return 'pdbId';
  }

  return 'title';
};

export const proteinBankSortLabel = (sortKey: ProteinBankSortKey): string => {
  switch (sortKey) {
    case 'pdbId':
      return 'PDB ID';
    case 'resolution':
      return 'Resolution';
    case 'chainCount':
      return 'Chain count';
    case 'title':
    default:
      return 'Title';
  }
};
