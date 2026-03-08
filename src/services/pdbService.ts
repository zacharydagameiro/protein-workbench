import { fetchProteinAnnotations } from './annotationService.js';
import { mergeStructureMetadata, fetchStructureMetadata } from './metadataService.js';
import { pdbToProtein } from './pdbParser.js';
import { enrichProteinForExplorer } from '../utils/explorerContent.js';
import type { Protein } from '../types/structure.js';

const structureCache = new Map<string, Protein>();

const normalizeId = (pdbId: string): string => pdbId.trim().toUpperCase();

export const clearStructureCache = (): void => {
  structureCache.clear();
};

export const fetchPDBStructure = async (pdbId: string): Promise<string> => {
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

export const loadProteinById = async (pdbId: string): Promise<Protein> => {
  const normalizedId = normalizeId(pdbId);
  const cached = structureCache.get(normalizedId);
  if (cached) {
    return cached;
  }

  const pdbContent = await fetchPDBStructure(normalizedId);
  let protein = pdbToProtein(pdbContent, normalizedId);

  try {
    protein = mergeStructureMetadata(protein, await fetchStructureMetadata(normalizedId));
  } catch (error) {
    console.error(`Metadata enrichment failed for ${normalizedId}:`, error);
  }

  try {
    const annotations = await fetchProteinAnnotations(protein);
    protein = {
      ...protein,
      regions: [...protein.regions, ...annotations.regions],
      variants: annotations.variants,
    };
  } catch (error) {
    console.error(`Annotation enrichment failed for ${normalizedId}:`, error);
  }

  protein = enrichProteinForExplorer(protein);

  structureCache.set(normalizedId, protein);
  return protein;
};

export const searchPDB = async (query: string): Promise<string[]> => {
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

  const payload = (await response.json()) as {
    result_set?: Array<{
      identifier?: string;
    }>;
  };

  return payload.result_set?.map((result) => result.identifier).filter(Boolean) as string[] | undefined ?? [];
};

export const searchAndLoadProteins = async (query: string): Promise<Protein[]> => {
  const ids = await searchPDB(query);
  const results = await Promise.allSettled(ids.map((id) => loadProteinById(id)));

  return results
    .filter((result): result is PromiseFulfilledResult<Protein> => result.status === 'fulfilled')
    .map((result) => result.value);
};
