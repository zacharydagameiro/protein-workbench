import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { loadProteinById, searchAndLoadProteins } from '../services/pdbService.js';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
export function ProteinSearch({ onResults }) {
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState('id');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const runSearch = async () => {
        if (!query.trim()) {
            setError('Enter a PDB ID or a search phrase.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const results = mode === 'id'
                ? [await loadProteinById(query.trim())]
                : await searchAndLoadProteins(query.trim());
            if (results.length === 0) {
                setError('No matching structures were found.');
            }
            onResults(results);
        }
        catch (searchError) {
            setError(searchError instanceof Error ? searchError.message : 'Search failed.');
            onResults([]);
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsxs("section", { className: "search-panel", children: [_jsxs("div", { className: "search-mode", children: [_jsx(Button, { type: "button", variant: mode === 'id' ? 'secondary' : 'ghost', size: "sm", onClick: () => setMode('id'), children: "Direct ID" }), _jsx(Button, { type: "button", variant: mode === 'text' ? 'secondary' : 'ghost', size: "sm", onClick: () => setMode('text'), children: "Text Search" })] }), _jsxs("div", { className: "search-input-group", children: [_jsx(Input, { className: "search-input", type: "text", value: query, placeholder: mode === 'id' ? 'Example: 1CRN or 4HHB' : 'Example: hemoglobin or kinase', onChange: (event) => setQuery(event.target.value), onKeyDown: (event) => {
                            if (event.key === 'Enter' && !isLoading) {
                                void runSearch();
                            }
                        } }), _jsx(Button, { type: "button", className: "search-button", disabled: isLoading, onClick: () => void runSearch(), children: isLoading ? 'Loading...' : 'Search' })] }), _jsx("div", { className: "search-examples", children: ['1CRN', '4HHB', '1BNA'].map((example) => (_jsx(Button, { type: "button", variant: "outline", size: "sm", className: "pill-button", onClick: () => {
                        setMode('id');
                        setQuery(example);
                    }, children: example }, example))) }), error ? _jsx("p", { className: "search-feedback search-feedback--error", children: error }) : null, !error && isLoading ? _jsx("p", { className: "search-feedback", children: "Fetching structure and metadata\u2026" }) : null] }));
}
