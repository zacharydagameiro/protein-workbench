import { configureStore } from '@reduxjs/toolkit';
import { firestoreApi } from './firestoreApi.js';

export const appStore = configureStore({
  reducer: {
    [firestoreApi.reducerPath]: firestoreApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(firestoreApi.middleware),
});

export type RootState = ReturnType<typeof appStore.getState>;
export type AppDispatch = typeof appStore.dispatch;
