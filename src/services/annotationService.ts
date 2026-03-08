import { fetchUniProtEntry } from './metadataService.js';
import type { Protein, RegionAnnotation, VariantAnnotation } from '../types/structure.js';

interface UniProtFeatureLocationEdge {
  value?: number | string;
}

interface UniProtFeature {
  type?: string;
  description?: string;
  alternativeSequence?: string;
  location?: {
    start?: UniProtFeatureLocationEdge;
    end?: UniProtFeatureLocationEdge;
  };
}

interface UniProtEntryWithFeatures {
  features?: UniProtFeature[];
}

const annotationCache = new Map<string, { regions: RegionAnnotation[]; variants: VariantAnnotation[] }>();

const parsePosition = (value: UniProtFeatureLocationEdge | undefined): number | null => {
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

const buildSourceUrl = (uniprotId: string): string => `https://www.uniprot.org/uniprotkb/${uniprotId}`;

const isPresent = <T,>(value: T | null): value is T => value !== null;

const parseVariants = (entry: UniProtEntryWithFeatures, protein: Protein, uniprotId: string): VariantAnnotation[] => {
  const chainId = protein.chains[0]?.id ?? 'A';

  const parsed = (entry.features ?? [])
    .filter((feature) => feature.type === 'Natural variant')
    .map((feature, index): VariantAnnotation | null => {
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

const regionTypeMap: Record<string, RegionAnnotation['kind']> = {
  Domain: 'domain',
  Region: 'domain',
  Motif: 'motif',
  Site: 'site',
};

const parseRegions = (entry: UniProtEntryWithFeatures, protein: Protein): RegionAnnotation[] => {
  const chainId = protein.chains[0]?.id ?? 'A';

  const parsed = (entry.features ?? [])
    .filter((feature) => feature.type && regionTypeMap[feature.type])
    .map((feature, index): RegionAnnotation | null => {
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

export const clearAnnotationCache = (): void => {
  annotationCache.clear();
};

export const fetchProteinAnnotations = async (
  protein: Protein,
): Promise<Pick<Protein, 'regions' | 'variants'>> => {
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
    const entry = (await fetchUniProtEntry(uniprotId)) as UniProtEntryWithFeatures | null;
    if (!entry) {
      return { regions: protein.regions, variants: protein.variants };
    }

    const annotations = {
      regions: parseRegions(entry, protein),
      variants: parseVariants(entry, protein, uniprotId),
    };

    annotationCache.set(uniprotId, annotations);
    return annotations;
  } catch (error) {
    console.error(`Annotation fetch failed for ${uniprotId}:`, error);
    return { regions: protein.regions, variants: protein.variants };
  }
};
