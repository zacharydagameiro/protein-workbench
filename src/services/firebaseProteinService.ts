import type { Protein, StructureMetadata } from '../types/structure.js';
import type { FirestoreProteinRecord } from '../types/firebase.js';
import { appStore } from '../store/index.js';
import { firestoreApi } from '../store/firestoreApi.js';

const normalizePdbId = (value: string | undefined, fallbackId: string) => (value ?? fallbackId).trim().toUpperCase();

const toMetadataPatch = (record: FirestoreProteinRecord): Partial<StructureMetadata> => ({
  pdbId: record.pdbIdUpper ?? record.pdbId,
  title: record.title,
  rawTitle: record.rawTitle,
  displayTitle: record.displayTitle,
  moleculeName: record.moleculeName,
  description: record.description,
  organism: record.organism,
  experimentalMethod: record.experimentalMethod,
  resolution: record.resolution ?? null,
  keywords: record.keywords,
  functionSummary: record.functionSummary,
  geneName: record.geneName,
  uniprotId: record.uniprotId,
});

export const mergeProteinWithFirestore = (protein: Protein, record: FirestoreProteinRecord | null): Protein => {
  if (!record) {
    return protein;
  }

  const metadataPatch = toMetadataPatch(record);

  return {
    ...protein,
    name: record.displayTitle ?? record.title ?? protein.name,
    metadata: {
      ...protein.metadata,
      ...metadataPatch,
    },
  };
};

export const getFirestoreProteinByPdbId = async (pdbId: string): Promise<FirestoreProteinRecord | null> => {
  const result = await appStore.dispatch(firestoreApi.endpoints.getProteinByPdbId.initiate(pdbId, { forceRefetch: true }));
  return 'data' in result ? (result.data ?? null) : null;
};

export const searchFirestoreProteins = async (searchQuery: string): Promise<FirestoreProteinRecord[]> => {
  const result = await appStore.dispatch(firestoreApi.endpoints.searchProteins.initiate(searchQuery, { forceRefetch: true }));
  return 'data' in result ? (result.data ?? []) : [];
};

export const mergeKnownProteinsFromFirestore = async (proteins: Protein[]): Promise<Protein[]> => {
  const merged = await Promise.all(
    proteins.map(async (protein) => {
      const firebaseRecord = await getFirestoreProteinByPdbId(normalizePdbId(protein.metadata.pdbId, protein.id));
      return mergeProteinWithFirestore(protein, firebaseRecord);
    }),
  );

  return merged;
};
