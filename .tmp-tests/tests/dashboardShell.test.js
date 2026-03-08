import { jsx as _jsx } from "react/jsx-runtime";
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../src/App.js';
const createStorage = () => {
    const store = new Map();
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
test('App defaults to the Explorer workspace and renders persistent sidebar sections', () => {
    Object.defineProperty(globalThis, 'localStorage', {
        value: createStorage(),
        configurable: true,
    });
    const markup = renderToStaticMarkup(_jsx(App, { render3D: false }));
    assert.match(markup, /Favorites/);
    assert.match(markup, /History/);
    assert.match(markup, /Viewer menu/);
    assert.match(markup, /All chains/);
    assert.match(markup, /Angstrom/);
    assert.match(markup, /Signal Helix Starter/);
});
test('App can render the Protein Bank workspace with inventory actions', () => {
    Object.defineProperty(globalThis, 'localStorage', {
        value: createStorage(),
        configurable: true,
    });
    const markup = renderToStaticMarkup(_jsx(App, { initialWorkspace: "protein-bank", render3D: false }));
    assert.match(markup, /Protein Bank/);
    assert.match(markup, /Protein inventory/);
    assert.match(markup, /Open in Explorer/);
    assert.match(markup, /Columns/);
    assert.match(markup, /Pin selected/);
    assert.match(markup, /Direct PDB ID/);
    assert.match(markup, /All collections/);
    assert.match(markup, /All sources/);
});
