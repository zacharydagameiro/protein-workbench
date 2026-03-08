import { useState } from 'react';
import { loadProteinById, searchAndLoadProteins } from '../services/pdbService.js';
import type { Protein } from '../types/structure.js';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';

interface ProteinSearchProps {
  onResults: (proteins: Protein[]) => void;
}

export function ProteinSearch({ onResults }: ProteinSearchProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'id' | 'text'>('id');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async () => {
    if (!query.trim()) {
      setError('Enter a PDB ID or a search phrase.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results =
        mode === 'id'
          ? [await loadProteinById(query.trim())]
          : await searchAndLoadProteins(query.trim());

      if (results.length === 0) {
        setError('No matching structures were found.');
      }

      onResults(results);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Search failed.');
      onResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="search-panel">
      <div className="search-mode">
        <Button type="button" variant={mode === 'id' ? 'secondary' : 'ghost'} size="sm" onClick={() => setMode('id')}>
          Direct ID
        </Button>
        <Button type="button" variant={mode === 'text' ? 'secondary' : 'ghost'} size="sm" onClick={() => setMode('text')}>
          Text Search
        </Button>
      </div>

      <div className="search-input-group">
        <Input
          className="search-input"
          type="text"
          value={query}
          placeholder={mode === 'id' ? 'Example: 1CRN or 4HHB' : 'Example: hemoglobin or kinase'}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !isLoading) {
              void runSearch();
            }
          }}
        />
        <Button type="button" className="search-button" disabled={isLoading} onClick={() => void runSearch()}>
          {isLoading ? 'Loading...' : 'Search'}
        </Button>
      </div>

      <div className="search-examples">
        {['1CRN', '4HHB', '1BNA'].map((example) => (
          <Button
            key={example}
            type="button"
            variant="outline"
            size="sm"
            className="pill-button"
            onClick={() => {
              setMode('id');
              setQuery(example);
            }}
          >
            {example}
          </Button>
        ))}
      </div>

      {error ? <p className="search-feedback search-feedback--error">{error}</p> : null}
      {!error && isLoading ? <p className="search-feedback">Fetching structure and metadata…</p> : null}
    </section>
  );
}
