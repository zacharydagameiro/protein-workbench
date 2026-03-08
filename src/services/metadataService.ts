import { normalizeDisplayTitle } from '../utils/explorerContent.js';
import type { Protein, StructureMetadata } from '../types/structure.js';

interface RcsbEntryResponse {
  struct?: {
    title?: string;
  };
  exptl?: Array<{
    method?: string;
  }>;
  rcsb_entry_info?: {
    resolution_combined?: number[];
  };
  struct_keywords?: {
    pdbx_keywords?: string;
    text?: string;
  };
}

interface RcsbPolymerEntityResponse {
  rcsb_polymer_entity_container_identifiers?: {
    asym_ids?: string[];
    auth_asym_ids?: string[];
    uniprot_ids?: string[];
  };
  rcsb_polymer_entity?: {
    pdbx_description?: string;
  };
  rcsb_entity_source_organism?: Array<{
    ncbi_scientific_name?: string;
  }>;
}

interface UniProtResponse {
  genes?: Array<{
    geneName?: {
      value?: string;
    };
  }>;
  proteinDescription?: {
    recommendedName?: {
      fullName?: {
        value?: string;
      };
    };
  };
  comments?: Array<{
    commentType?: string;
    texts?: Array<{
      value?: string;
    }>;
  }>;
  features?: unknown[];
}

const metadataCache = new Map<string, StructureMetadata>();
const uniprotCache = new Map<string, UniProtResponse | null>();

const extractFunctionSummary = (payload: UniProtResponse): string | undefined =>
  payload.comments?.find((comment) => comment.commentType === 'FUNCTION')?.texts?.[0]?.value;

const extractGeneName = (payload: UniProtResponse): string | undefined => payload.genes?.[0]?.geneName?.value;

export const clearMetadataCache = (): void => {
  metadataCache.clear();
  uniprotCache.clear();
};

export const fetchUniProtEntry = async (uniprotId: string): Promise<UniProtResponse | null> => {
  const normalizedId = uniprotId.trim().toUpperCase();
  if (uniprotCache.has(normalizedId)) {
    return uniprotCache.get(normalizedId) ?? null;
  }

  try {
    const response = await fetch(`https://rest.uniprot.org/uniprotkb/${normalizedId}.json`);
    if (!response.ok) {
      uniprotCache.set(normalizedId, null);
      return null;
    }

    const payload = (await response.json()) as UniProtResponse;
    uniprotCache.set(normalizedId, payload);
    return payload;
  } catch (error) {
    console.error(`Failed to fetch UniProt metadata for ${normalizedId}:`, error);
    uniprotCache.set(normalizedId, null);
    return null;
  }
};

export const fetchStructureMetadata = async (pdbId: string): Promise<StructureMetadata> => {
  const normalizedId = pdbId.toUpperCase();
  const cached = metadataCache.get(normalizedId);
  if (cached) {
    return cached;
  }

  const entryUrl = `https://data.rcsb.org/rest/v1/core/entry/${normalizedId}`;
  const polymerUrl = `https://data.rcsb.org/rest/v1/core/entry/${normalizedId}/polymer_entities`;

  const [entryResult, polymerResult] = await Promise.allSettled([
    fetch(entryUrl).then(async (response) => {
      if (!response.ok) {
        throw new Error(`RCSB entry metadata request failed for ${normalizedId}`);
      }
      return (await response.json()) as RcsbEntryResponse;
    }),
    fetch(polymerUrl).then(async (response) => {
      if (!response.ok) {
        throw new Error(`RCSB polymer metadata request failed for ${normalizedId}`);
      }
      return (await response.json()) as RcsbPolymerEntityResponse[];
    }),
  ]);

  const entry = entryResult.status === 'fulfilled' ? entryResult.value : undefined;
  const polymerEntities = polymerResult.status === 'fulfilled' ? polymerResult.value : [];
  const firstEntity = polymerEntities[0];
  const uniprotId = firstEntity?.rcsb_polymer_entity_container_identifiers?.uniprot_ids?.[0];
  const organism =
    firstEntity?.rcsb_entity_source_organism?.[0]?.ncbi_scientific_name ??
    polymerEntities.find((entity) => entity.rcsb_entity_source_organism?.[0]?.ncbi_scientific_name)
      ?.rcsb_entity_source_organism?.[0]?.ncbi_scientific_name;

  let geneName: string | undefined;
  let functionSummary: string | undefined;
  let recommendedTitle: string | undefined;
  const polymerDescription =
    firstEntity?.rcsb_polymer_entity?.pdbx_description ??
    polymerEntities.find((entity) => entity.rcsb_polymer_entity?.pdbx_description)?.rcsb_polymer_entity?.pdbx_description;

  if (uniprotId) {
    const uniprot = await fetchUniProtEntry(uniprotId);
    if (uniprot) {
      functionSummary = extractFunctionSummary(uniprot);
      geneName = extractGeneName(uniprot);
      recommendedTitle = uniprot.proteinDescription?.recommendedName?.fullName?.value;
    }
  }

  const rawTitle = entry?.struct?.title ?? normalizedId;
  const moleculeName = recommendedTitle ?? polymerDescription;
  const displayTitle = normalizeDisplayTitle(moleculeName ?? rawTitle, normalizedId);

  const metadata: StructureMetadata = {
    source: 'rcsb',
    title: displayTitle,
    rawTitle,
    displayTitle,
    moleculeName,
    description: rawTitle || recommendedTitle || `Structure ${normalizedId}`,
    pdbId: normalizedId,
    uniprotId,
    organism,
    experimentalMethod: entry?.exptl?.map((item) => item.method).filter(Boolean).join(', ') || undefined,
    resolution: entry?.rcsb_entry_info?.resolution_combined?.[0] ?? null,
    keywords: [entry?.struct_keywords?.pdbx_keywords, entry?.struct_keywords?.text].filter(Boolean) as string[],
    functionSummary,
    geneName,
  };

  metadataCache.set(normalizedId, metadata);
  return metadata;
};

export const mergeStructureMetadata = (protein: Protein, metadata: Partial<StructureMetadata>): Protein => ({
  ...protein,
  name: metadata.displayTitle ?? metadata.title ?? protein.name,
  metadata: {
    ...protein.metadata,
    ...metadata,
  },
});
