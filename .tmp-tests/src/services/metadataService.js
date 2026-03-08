import { normalizeDisplayTitle } from '../utils/explorerContent.js';
const metadataCache = new Map();
const uniprotCache = new Map();
const extractFunctionSummary = (payload) => payload.comments?.find((comment) => comment.commentType === 'FUNCTION')?.texts?.[0]?.value;
const extractGeneName = (payload) => payload.genes?.[0]?.geneName?.value;
export const clearMetadataCache = () => {
    metadataCache.clear();
    uniprotCache.clear();
};
export const fetchUniProtEntry = async (uniprotId) => {
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
        const payload = (await response.json());
        uniprotCache.set(normalizedId, payload);
        return payload;
    }
    catch (error) {
        console.error(`Failed to fetch UniProt metadata for ${normalizedId}:`, error);
        uniprotCache.set(normalizedId, null);
        return null;
    }
};
export const fetchStructureMetadata = async (pdbId) => {
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
            return (await response.json());
        }),
        fetch(polymerUrl).then(async (response) => {
            if (!response.ok) {
                throw new Error(`RCSB polymer metadata request failed for ${normalizedId}`);
            }
            return (await response.json());
        }),
    ]);
    const entry = entryResult.status === 'fulfilled' ? entryResult.value : undefined;
    const polymerEntities = polymerResult.status === 'fulfilled' ? polymerResult.value : [];
    const firstEntity = polymerEntities[0];
    const uniprotId = firstEntity?.rcsb_polymer_entity_container_identifiers?.uniprot_ids?.[0];
    const organism = firstEntity?.rcsb_entity_source_organism?.[0]?.ncbi_scientific_name ??
        polymerEntities.find((entity) => entity.rcsb_entity_source_organism?.[0]?.ncbi_scientific_name)
            ?.rcsb_entity_source_organism?.[0]?.ncbi_scientific_name;
    let geneName;
    let functionSummary;
    let recommendedTitle;
    const polymerDescription = firstEntity?.rcsb_polymer_entity?.pdbx_description ??
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
    const metadata = {
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
        keywords: [entry?.struct_keywords?.pdbx_keywords, entry?.struct_keywords?.text].filter(Boolean),
        functionSummary,
        geneName,
    };
    metadataCache.set(normalizedId, metadata);
    return metadata;
};
export const mergeStructureMetadata = (protein, metadata) => ({
    ...protein,
    name: metadata.displayTitle ?? metadata.title ?? protein.name,
    metadata: {
        ...protein.metadata,
        ...metadata,
    },
});
