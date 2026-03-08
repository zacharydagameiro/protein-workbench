import test from 'node:test';
import assert from 'node:assert/strict';
import { getLibraryState } from '../src/services/libraryService.js';
const createStorage = (seed = {}) => {
    const store = new Map(Object.entries(seed));
    return {
        getItem: (key) => store.get(key) ?? null,
        setItem: (key, value) => {
            store.set(key, value);
        },
        removeItem: (key) => {
            store.delete(key);
        },
        clear: () => {
            store.clear();
        },
    };
};
test('getLibraryState normalizes legacy stored proteins missing newer explorer fields', () => {
    Object.defineProperty(globalThis, 'localStorage', {
        value: createStorage({
            'protein-workbench-history-v1': JSON.stringify([
                {
                    id: 'legacy-1',
                    name: 'Legacy Protein',
                    metadata: {
                        title: 'Legacy Protein',
                        source: 'rcsb',
                        pdbId: '1LEG',
                    },
                    chains: [{ id: 'A' }],
                },
            ]),
        }),
        configurable: true,
    });
    const state = getLibraryState();
    assert.equal(state.history.length, 1);
    assert.deepEqual(state.history[0].variants, []);
    assert.deepEqual(state.history[0].regions, []);
    assert.deepEqual(state.history[0].storyCards, []);
    assert.equal(state.history[0].metadata.displayTitle, 'Legacy Protein');
});
