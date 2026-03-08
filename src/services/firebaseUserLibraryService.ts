import { browserLocalPersistence, setPersistence, signInAnonymously, type User } from 'firebase/auth';
import { firebaseAuth, firestoreDb, isFirebaseConfigured } from '../lib/firebase.js';

export const ensureAnonymousSession = async (): Promise<User | null> => {
  if (!isFirebaseConfigured || !firebaseAuth || !firestoreDb) {
    return null;
  }

  await setPersistence(firebaseAuth, browserLocalPersistence);

  if (firebaseAuth.currentUser) {
    return firebaseAuth.currentUser;
  }

  const credential = await signInAnonymously(firebaseAuth);
  return credential.user;
};
