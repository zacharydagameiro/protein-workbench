import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppSidebar } from '../src/components/AppSidebar.js';
import { SidebarProvider } from '../src/components/ui/sidebar.js';
import { sampleProteins } from '../src/data/sampleProteins.js';

test('AppSidebar renders nav entry points and protein groups', () => {
  const markup = renderToStaticMarkup(
    <SidebarProvider open>
      <AppSidebar
        workspace="explorer"
        pinnedProteins={[sampleProteins[0]]}
        historyProteins={[sampleProteins[1]]}
        selectedId={sampleProteins[0].id}
        onSelectProtein={() => undefined}
        onTogglePinned={() => undefined}
        onRemoveHistory={() => undefined}
        onSearch={() => undefined}
        onAskAI={() => undefined}
        onProteinBankViewer={() => undefined}
        onClearHistory={() => undefined}
        onToggleTheme={() => undefined}
      />
    </SidebarProvider>,
  );

  assert.match(markup, /Ask AI/);
  assert.match(markup, /Cmd\+K/);
  assert.match(markup, /Favorites/);
  assert.match(markup, /History/);
  assert.match(markup, new RegExp(sampleProteins[0].name));
});
