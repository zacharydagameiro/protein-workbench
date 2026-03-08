import { fetchUniProtEntry } from './metadataService.js';
const annotationCache = new Map();
const parsePosition = (value) => {
    const raw = value?.value;
    if (typeof raw === 'number') {
        return raw;
    }
    if (typeof raw === 'string') {
        const parsed = Number.parseInt(raw, 10);
        return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
};
const buildSourceUrl = (uniprotId) => `https://www.uniprot.org/uniprotkb/${uniprotId}`;
const isPresent = (value) => value !== null;
const parseVariants = (entry, protein, uniprotId) => {
    const chainId = protein.chains[0]?.id ?? 'A';
    const parsed = (entry.features ?? [])
        .filter((feature) => feature.type === 'Natural variant')
        .map((feature, index) => {
        const residueNumber = parsePosition(feature.location?.start) ?? parsePosition(feature.location?.end);
        if (!residueNumber) {
            return null;
        }
        const description = feature.description?.trim() || 'Notable natural variant.';
        const diseaseMatch = description.match(/in ([A-Z][A-Za-z0-9 ,'-]+)$/);
        const effect = diseaseMatch ? description.replace(diseaseMatch[0], '').trim() : description;
        const to = feature.alternativeSequence?.trim() || undefined;
        const from = protein.chains[0]?.residues.find((residue) => residue.residueNumber === residueNumber)?.residueCode;
        return {
            id: `${protein.id}:variant:${residueNumber}:${index}`,
            label: `${from ?? 'X'}${residueNumber}${to ?? '?'}`,
            chainId,
            residueNumber,
            from,
            to,
            effect,
            disease: diseaseMatch?.[1],
            source: 'uniprot',
            sourceUrl: buildSourceUrl(uniprotId),
        };
    })
        .filter(isPresent);
    return parsed.filter((variant) => Boolean(variant.effect || variant.disease)).slice(0, 6);
};
const regionTypeMap = {
    Domain: 'domain',
    Region: 'domain',
    Motif: 'motif',
    Site: 'site',
};
const parseRegions = (entry, protein) => {
    const chainId = protein.chains[0]?.id ?? 'A';
    const parsed = (entry.features ?? [])
        .filter((feature) => feature.type && regionTypeMap[feature.type])
        .map((feature, index) => {
        const startResidue = parsePosition(feature.location?.start);
        const endResidue = parsePosition(feature.location?.end);
        if (!startResidue || !endResidue) {
            return null;
        }
        const kind = regionTypeMap[feature.type ?? ''];
        return {
            id: `${protein.id}:${kind}:${startResidue}-${endResidue}:${index}`,
            label: feature.description?.trim() || `${kind} ${startResidue}-${endResidue}`,
            chainId,
            startResidue,
            endResidue,
            kind,
            source: 'uniprot',
            description: feature.description?.trim(),
            structureLevel: kind === 'domain' ? 'tertiary' : 'secondary',
        };
    })
        .filter(isPresent);
    return parsed.slice(0, 8);
};
export const clearAnnotationCache = () => {
    annotationCache.clear();
};
export const fetchProteinAnnotations = async (protein) => {
    const uniprotId = protein.metadata.uniprotId;
    if (!uniprotId) {
        return {
            regions: protein.regions,
            variants: protein.variants,
        };
    }
    const cached = annotationCache.get(uniprotId);
    if (cached) {
        return cached;
    }
    try {
        const entry = (await fetchUniProtEntry(uniprotId));
        if (!entry) {
            return { regions: protein.regions, variants: protein.variants };
        }
        const annotations = {
            regions: parseRegions(entry, protein),
            variants: parseVariants(entry, protein, uniprotId),
        };
        annotationCache.set(uniprotId, annotations);
        return annotations;
    }
    catch (error) {
        console.error(`Annotation fetch failed for ${uniprotId}:`, error);
        return { regions: protein.regions, variants: protein.variants };
    }
};
