const proteinBankSortConfig = {
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
export const proteinBankSortingStateFromSortKey = (sortKey) => [
    {
        id: proteinBankSortConfig[sortKey].columnId,
        desc: proteinBankSortConfig[sortKey].desc,
    },
];
export const proteinBankSortKeyFromSortingState = (sorting) => {
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
export const proteinBankSortLabel = (sortKey) => {
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
