import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { firestoreDb, isFirebaseConfigured } from '../lib/firebase.js';
import type { Protein } from '../types/structure.js';

export type ProteinSyncEventType = 'favorite-added' | 'inventory-added';

const SYNC_EVENTS_COLLECTION = 'protein_sync_events';

const buildSearchTerms = (protein: Protein) =>
  [
    protein.id,
    protein.metadata.pdbId,
    protein.name,
    protein.metadata.displayTitle,
    protein.metadata.rawTitle,
    protein.metadata.moleculeName,
    protein.metadata.geneName,
    protein.metadata.organism,
    ...(protein.metadata.keywords ?? []),
  ]
    .filter(Boolean)
    .flatMap((value) =>
      String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .split(' ')
        .filter(Boolean),
    );

export const emitProteinSyncEvent = async (protein: Protein, eventType: ProteinSyncEventType): Promise<void> => {
  if (!isFirebaseConfigured || !firestoreDb) {
    return;
  }

  await addDoc(collection(firestoreDb, SYNC_EVENTS_COLLECTION), {
    type: eventType,
    proteinId: protein.id,
    pdbId: protein.metadata.pdbId ?? protein.id.toUpperCase(),
    pdbIdUpper: (protein.metadata.pdbId ?? protein.id).toUpperCase(),
    source: 'protein-workbench-web',
    createdAt: serverTimestamp(),
    searchTerms: buildSearchTerms(protein),
    protein: {
      id: protein.id,
      name: protein.name,
      metadata: protein.metadata,
    },
  });
};
