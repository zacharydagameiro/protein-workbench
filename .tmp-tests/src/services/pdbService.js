import { fetchProteinAnnotations } from './annotationService.js';
import { mergeStructureMetadata, fetchStructureMetadata } from './metadataService.js';
import { pdbToProtein } from './pdbParser.js';
import { enrichProteinForExplorer } from '../utils/explorerContent.js';
const structureCache = new Map();
const normalizeId = (pdbId) => pdbId.trim().toUpperCase();
export const clearStructureCache = () => {
    structureCache.clear();
};
export const fetchPDBStructure = async (pdbId) => {
    const normalizedId = normalizeId(pdbId);
    const response = await fetch(`https://files.rcsb.org/download/${normalizedId}.pdb`);
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error(`PDB ID "${normalizedId}" was not found.`);
        }
        throw new Error(`Failed to fetch structure ${normalizedId}.`);
    }
    return response.text();
};
export const loadProteinById = async (pdbId) => {
    const normalizedId = normalizeId(pdbId);
    const cached = structureCache.get(normalizedId);
    if (cached) {
        return cached;
    }
    const pdbContent = await fetchPDBStructure(normalizedId);
    let protein = pdbToProtein(pdbContent, normalizedId);
    try {
        protein = mergeStructureMetadata(protein, await fetchStructureMetadata(normalizedId));
    }
    catch (error) {
        console.error(`Metadata enrichment failed for ${normalizedId}:`, error);
    }
    try {
        const annotations = await fetchProteinAnnotations(protein);
        protein = {
            ...protein,
            regions: [...protein.regions, ...annotations.regions],
            variants: annotations.variants,
        };
    }
    catch (error) {
        console.error(`Annotation enrichment failed for ${normalizedId}:`, error);
    }
    protein = enrichProteinForExplorer(protein);
    structureCache.set(normalizedId, protein);
    return protein;
};
export const searchPDB = async (query) => {
    const response = await fetch('https://search.rcsb.org/rcsbsearch/v2/query', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: {
                type: 'terminal',
                service: 'text',
                parameters: {
                    value: query,
                },
            },
            return_type: 'entry',
            request_options: {
                pager: {
                    start: 0,
                    rows: 8,
                },
            },
        }),
    });
    if (!response.ok) {
        throw new Error('Failed to search the PDB database.');
    }
    const payload = (await response.json());
    return payload.result_set?.map((result) => result.identifier).filter(Boolean) ?? [];
};
export const searchAndLoadProteins = async (query) => {
    const ids = await searchPDB(query);
    const results = await Promise.allSettled(ids.map((id) => loadProteinById(id)));
    return results
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value);
};
