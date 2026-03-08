import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProteinBank } from '../src/components/ProteinBank.js';
import { sampleProteins } from '../src/data/sampleProteins.js';
import { defaultProteinBankFilters, buildProteinBankRows } from '../src/utils/proteinBank.js';

test('ProteinBank renders table controls, bulk actions, and row action triggers', () => {
  const rows = buildProteinBankRows({
    starterProteins: sampleProteins.slice(0, 2),
    pinnedProteins: [],
    historyProteins: [],
    searchResults: [],
  });

  const markup = renderToStaticMarkup(
    <ProteinBank
      rows={rows}
      selectedId={sampleProteins[0].id}
      filters={defaultProteinBankFilters()}
      sortKey="title"
      pinnedIds={new Set()}
      onFiltersChange={() => undefined}
      onSortKeyChange={() => undefined}
      onSearchResults={() => undefined}
      onOpenProtein={() => undefined}
      onTogglePinned={() => undefined}
    />,
  );

  assert.match(markup, /Columns/);
  assert.match(markup, /Sort: Title/);
  assert.match(markup, /Pin selected/);
  assert.match(markup, /Open in Explorer/);
  assert.match(markup, /Select all rows/);
});
