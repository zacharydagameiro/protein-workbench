import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { collection, deleteDoc, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { firestoreDb, isFirebaseConfigured } from '../lib/firebase.js';
import type { ChainData, Helix, Protein, Sheet } from '../types/structure.js';
import type { FirestoreProteinRecord } from '../types/firebase.js';

const PROTEINS_COLLECTION = 'proteins';
const USERS_COLLECTION = 'users';

export type UserProteinCollection = 'favorites' | 'inventory';
interface UserProteinReference {
  proteinId?: string;
  pdbId?: string;
  pdbIdUpper?: string;
  name?: string;
}

const normalizeSearchTerm = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean);

const mapHelixRecord = (value: unknown): Helix | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<Helix>;
  if (
    typeof candidate.id !== 'number' ||
    typeof candidate.chainId !== 'string' ||
    typeof candidate.startResidue !== 'number' ||
    typeof candidate.endResidue !== 'number' ||
    typeof candidate.type !== 'string'
  ) {
    return null;
  }

  return {
    id: candidate.id,
    chainId: candidate.chainId,
    startResidue: candidate.startResidue,
    endResidue: candidate.endResidue,
    type: candidate.type,
    comment: typeof candidate.comment === 'string' ? candidate.comment : undefined,
  };
};

const mapSheetRecord = (value: unknown): Sheet | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<Sheet>;
  if (typeof candidate.id !== 'number' || typeof candidate.numStrands !== 'number' || !Array.isArray(candidate.strands)) {
    return null;
  }

  const strands: Sheet['strands'] = [];
  candidate.strands.forEach((strand) => {
    if (!strand || typeof strand !== 'object') {
      return;
    }

    const parsed = strand as Sheet['strands'][number];
    if (typeof parsed.chainId !== 'string' || typeof parsed.startResidue !== 'number' || typeof parsed.endResidue !== 'number') {
      return;
    }

    strands.push({
      chainId: parsed.chainId,
      startResidue: parsed.startResidue,
      endResidue: parsed.endResidue,
      sense: typeof parsed.sense === 'number' ? parsed.sense : undefined,
    });
  });

  return {
    id: candidate.id,
    numStrands: candidate.numStrands,
    strands,
  };
};

const mapChainRecord = (value: unknown): ChainData | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<ChainData>;
  if (
    typeof candidate.id !== 'string' ||
    candidate.polymerType !== 'protein' ||
    !Array.isArray(candidate.residues) ||
    typeof candidate.residueCount !== 'number' ||
    typeof candidate.sequence !== 'string' ||
    (candidate.sequenceSource !== 'atoms' && candidate.sequenceSource !== 'seqres')
  ) {
    return null;
  }

  const residues: ChainData['residues'] = [];
  candidate.residues.forEach((residue) => {
    if (!residue || typeof residue !== 'object') {
      return;
    }

    const parsed = residue as ChainData['residues'][number];
    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.chainId !== 'string' ||
      typeof parsed.residueNumber !== 'number' ||
      typeof parsed.residueName !== 'string' ||
      typeof parsed.residueCode !== 'string' ||
      typeof parsed.sequenceIndex !== 'number' ||
      !Array.isArray(parsed.atomIds) ||
      (parsed.secondaryStructure !== 'helix' && parsed.secondaryStructure !== 'sheet' && parsed.secondaryStructure !== 'loop' && parsed.secondaryStructure !== 'unassigned')
    ) {
      return;
    }

    residues.push({
      id: parsed.id,
      chainId: parsed.chainId,
      residueNumber: parsed.residueNumber,
      insertionCode: typeof parsed.insertionCode === 'string' ? parsed.insertionCode : undefined,
      residueName: parsed.residueName,
      residueCode: parsed.residueCode,
      sequenceIndex: parsed.sequenceIndex,
      atomIds: parsed.atomIds.filter((atomId): atomId is string => typeof atomId === 'string'),
      secondaryStructure: parsed.secondaryStructure,
    });
  });

  return {
    id: candidate.id,
    polymerType: 'protein',
    residues,
    residueCount: candidate.residueCount,
    sequence: candidate.sequence,
    sequenceSource: candidate.sequenceSource,
  };
};

const mapProteinRecord = (id: string, value: Record<string, unknown>): FirestoreProteinRecord => ({
  id,
  pdbId: typeof value.pdbId === 'string' ? value.pdbId : undefined,
  pdbIdUpper: typeof value.pdbIdUpper === 'string' ? value.pdbIdUpper : undefined,
  title: typeof value.title === 'string' ? value.title : undefined,
  rawTitle: typeof value.rawTitle === 'string' ? value.rawTitle : undefined,
  displayTitle: typeof value.displayTitle === 'string' ? value.displayTitle : undefined,
  moleculeName: typeof value.moleculeName === 'string' ? value.moleculeName : undefined,
  description: typeof value.description === 'string' ? value.description : undefined,
  organism: typeof value.organism === 'string' ? value.organism : undefined,
  experimentalMethod: typeof value.experimentalMethod === 'string' ? value.experimentalMethod : undefined,
  resolution: typeof value.resolution === 'number' ? value.resolution : null,
  keywords: Array.isArray(value.keywords) ? value.keywords.filter((item): item is string => typeof item === 'string') : undefined,
  functionSummary: typeof value.functionSummary === 'string' ? value.functionSummary : undefined,
  geneName: typeof value.geneName === 'string' ? value.geneName : undefined,
  uniprotId: typeof value.uniprotId === 'string' ? value.uniprotId : undefined,
  aliases: Array.isArray(value.aliases) ? value.aliases.filter((item): item is string => typeof item === 'string') : undefined,
  categoryTags: Array.isArray(value.categoryTags) ? value.categoryTags.filter((item): item is string => typeof item === 'string') : undefined,
  searchTerms: Array.isArray(value.searchTerms) ? value.searchTerms.filter((item): item is string => typeof item === 'string') : undefined,
  chains: Array.isArray(value.chains) ? value.chains.map(mapChainRecord).filter((chain): chain is ChainData => chain !== null) : undefined,
  helices: Array.isArray(value.helices) ? value.helices.map(mapHelixRecord).filter((helix): helix is Helix => helix !== null) : undefined,
  sheets: Array.isArray(value.sheets) ? value.sheets.map(mapSheetRecord).filter((sheet): sheet is Sheet => sheet !== null) : undefined,
});

const mapUserProteinPayload = (protein: Protein) =>
  sanitizeFirestoreValue({
    proteinId: protein.id,
    pdbId: protein.metadata.pdbId ?? protein.id.toUpperCase(),
    pdbIdUpper: (protein.metadata.pdbId ?? protein.id).toUpperCase(),
    name: protein.name ?? protein.metadata.displayTitle,
    savedAt: serverTimestamp(),
  });

function sanitizeFirestoreValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => sanitizeFirestoreValue(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, sanitizeFirestoreValue(entry)]),
    ) as T;
  }

  return value;
}

const mapUserProteinReference = (value: unknown): UserProteinReference | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as UserProteinReference;
  if (!candidate.proteinId && !candidate.pdbId && !candidate.pdbIdUpper) {
    return null;
  }

  return candidate;
};

const normalizeReferenceId = (reference: UserProteinReference) =>
  (reference.pdbIdUpper ?? reference.pdbId ?? reference.proteinId ?? '').trim().toUpperCase();

const applyUserProteinReference = (protein: Protein, reference: UserProteinReference): Protein => {
  const userName = reference.name?.trim();
  if (!userName) {
    return protein;
  }

  return {
    ...protein,
    name: userName,
    metadata: {
      ...protein.metadata,
      displayTitle: userName,
    },
  };
};

const mapReferenceToProtein = (reference: UserProteinReference): Protein | null => {
  const canonicalId = normalizeReferenceId(reference);
  if (!canonicalId) {
    return null;
  }

  const displayTitle = reference.name?.trim() || canonicalId;

  return {
    id: (reference.proteinId ?? canonicalId).toLowerCase(),
    name: displayTitle,
    atoms: [],
    backboneAtoms: [],
    chains: [],
    helices: [],
    sheets: [],
    regions: [],
    variants: [],
    storyCards: [],
    metadata: {
      source: 'rcsb',
      title: displayTitle,
      rawTitle: displayTitle,
      displayTitle,
      moleculeName: displayTitle,
      description: displayTitle,
      pdbId: canonicalId,
      keywords: [],
      resolution: null,
    },
  };
};

const mapProteinRecordToProtein = (record: FirestoreProteinRecord): Protein => {
  const proteinId = record.id.toLowerCase();
  const displayTitle = record.displayTitle ?? record.title ?? record.moleculeName ?? record.pdbIdUpper ?? record.pdbId ?? proteinId;
  const description = record.description ?? record.functionSummary ?? displayTitle;

  return {
    id: proteinId,
    name: displayTitle,
    atoms: [],
    backboneAtoms: [],
    chains: record.chains ?? [],
    helices: record.helices ?? [],
    sheets: record.sheets ?? [],
    regions: [],
    variants: [],
    storyCards: [],
    metadata: {
      source: 'rcsb',
      title: record.title ?? displayTitle,
      rawTitle: record.rawTitle ?? record.title ?? displayTitle,
      displayTitle,
      moleculeName: record.moleculeName ?? displayTitle,
      description,
      pdbId: record.pdbIdUpper ?? record.pdbId,
      uniprotId: record.uniprotId,
      organism: record.organism,
      experimentalMethod: record.experimentalMethod,
      resolution: record.resolution ?? null,
      keywords: record.keywords ?? [],
      functionSummary: record.functionSummary,
      geneName: record.geneName,
    },
  };
};

export const firestoreApi = createApi({
  reducerPath: 'firestoreApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['UserLibrary'],
  endpoints: (builder) => ({
    getProteinByPdbId: builder.query<FirestoreProteinRecord | null, string>({
      async queryFn(pdbId) {
        if (!isFirebaseConfigured || !firestoreDb) {
          return { data: null };
        }

        try {
          const normalizedId = pdbId.trim().toUpperCase();
          const snapshot = await getDocs(
            query(collection(firestoreDb, PROTEINS_COLLECTION), where('pdbIdUpper', '==', normalizedId), limit(1)),
          );

          if (snapshot.empty) {
            return { data: null };
          }

          const doc = snapshot.docs[0];
          return { data: mapProteinRecord(doc.id, doc.data()) };
        } catch (error) {
          return { error: error instanceof Error ? error : new Error('Failed to load Firebase protein metadata.') };
        }
      },
    }),
    searchProteins: builder.query<FirestoreProteinRecord[], string>({
      async queryFn(searchQuery) {
        if (!isFirebaseConfigured || !firestoreDb) {
          return { data: [] };
        }

        try {
          const terms = normalizeSearchTerm(searchQuery);
          if (terms.length === 0) {
            return { data: [] };
          }

          const firstTerm = terms[0];
          const snapshots = await Promise.all([
            getDocs(query(collection(firestoreDb, PROTEINS_COLLECTION), where('searchTerms', 'array-contains', firstTerm), limit(8))),
            firstTerm.length <= 6
              ? getDocs(query(collection(firestoreDb, PROTEINS_COLLECTION), where('pdbIdUpper', '==', firstTerm.toUpperCase()), limit(1)))
              : Promise.resolve(null),
          ]);

          const records = new Map<string, FirestoreProteinRecord>();
          snapshots
            .filter((snapshot): snapshot is NonNullable<(typeof snapshots)[number]> => snapshot !== null)
            .forEach((snapshot) => {
              snapshot.docs.forEach((doc) => {
                records.set(doc.id, mapProteinRecord(doc.id, doc.data()));
              });
            });

          return { data: [...records.values()] };
        } catch (error) {
          return { error: error instanceof Error ? error : new Error('Failed to search Firebase proteins.') };
        }
      },
    }),
    getUserProteinCollection: builder.query<Protein[], { userId: string; collectionName: UserProteinCollection }>({
      providesTags: (_result, _error, { userId, collectionName }) => [{ type: 'UserLibrary', id: `${userId}:${collectionName}` }],
      async queryFn({ userId, collectionName }) {
        if (!firestoreDb) {
          return { data: [] };
        }

        try {
          const db = firestoreDb;
          const snapshot = await getDocs(collection(db, USERS_COLLECTION, userId, collectionName));
          const references = snapshot.docs
            .map((entry) => mapUserProteinReference(entry.data()))
            .filter((reference): reference is UserProteinReference => reference !== null);

          const proteinSnapshots = await Promise.all(
            references.map(async (reference) => {
              const canonicalId = normalizeReferenceId(reference);
              if (!canonicalId) {
                return null;
              }

              const proteinSnapshot = await getDoc(doc(db, PROTEINS_COLLECTION, canonicalId));
              if (!proteinSnapshot.exists()) {
                return mapReferenceToProtein(reference);
              }

              return applyUserProteinReference(
                mapProteinRecordToProtein(mapProteinRecord(proteinSnapshot.id, proteinSnapshot.data())),
                reference,
              );
            }),
          );

          return {
            data: proteinSnapshots.filter((protein): protein is Protein => protein !== null),
          };
        } catch (error) {
          return { error: error instanceof Error ? error : new Error('Failed to load the user protein collection.') };
        }
      },
    }),
    saveUserProtein: builder.mutation<void, { userId: string; collectionName: UserProteinCollection; protein: Protein }>({
      invalidatesTags: (_result, _error, { userId, collectionName }) => [{ type: 'UserLibrary', id: `${userId}:${collectionName}` }],
      async queryFn({ userId, collectionName, protein }) {
        if (!firestoreDb) {
          return { data: undefined };
        }

        try {
          await setDoc(
            doc(firestoreDb, USERS_COLLECTION, userId, collectionName, protein.id),
            mapUserProteinPayload(protein),
            { merge: true },
          );

          return { data: undefined };
        } catch (error) {
          return { error: error instanceof Error ? error : new Error('Failed to save the user protein.') };
        }
      },
    }),
    removeUserProtein: builder.mutation<void, { userId: string; collectionName: UserProteinCollection; proteinId: string }>({
      invalidatesTags: (_result, _error, { userId, collectionName }) => [{ type: 'UserLibrary', id: `${userId}:${collectionName}` }],
      async queryFn({ userId, collectionName, proteinId }) {
        if (!firestoreDb) {
          return { data: undefined };
        }

        try {
          await deleteDoc(doc(firestoreDb, USERS_COLLECTION, userId, collectionName, proteinId));
          return { data: undefined };
        } catch (error) {
          return { error: error instanceof Error ? error : new Error('Failed to remove the user protein.') };
        }
      },
    }),
  }),
});

export const {
  useGetProteinByPdbIdQuery,
  useGetUserProteinCollectionQuery,
  useRemoveUserProteinMutation,
  useSaveUserProteinMutation,
  useSearchProteinsQuery,
} = firestoreApi;
