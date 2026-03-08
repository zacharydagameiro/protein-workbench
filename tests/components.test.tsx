import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExplorerSidepanel } from '../src/components/ExplorerSidepanel.js';
import { ProteinViewer } from '../src/components/ProteinViewer.js';
import { SequenceViewer } from '../src/components/SequenceViewer.js';
import { sampleProteins } from '../src/data/sampleProteins.js';

test('SequenceViewer renders selected residue state in the sequence track', () => {
  const protein = sampleProteins[0];
  const residue = protein.chains[0].residues[0];
  const markup = renderToStaticMarkup(
    <SequenceViewer
      protein={protein}
      chainFilter="all"
      structureLevel="primary"
      sequenceState={{
        activeChainId: 'A',
        density: 'residues',
        focusedResidueId: residue.id,
        highlightedRange: null,
      }}
      selectedResidue={{
        residueId: residue.id,
        chainId: residue.chainId,
        residueNumber: residue.residueNumber,
        residueName: residue.residueName,
      }}
      onDensityChange={() => undefined}
      onChainFocusChange={() => undefined}
    />,
  );

  assert.match(markup, /sequence-track__item--selected/);
  assert.match(markup, new RegExp(residue.residueCode));
});

test('ExplorerSidepanel general tab includes the metadata section safely with partial metadata', () => {
  const protein = sampleProteins[0];
  const markup = renderToStaticMarkup(
    <ExplorerSidepanel
      protein={protein}
      chainFilter="all"
      activeTab="general"
      structureLevel="secondary"
      sequenceState={{ activeChainId: 'all', density: 'overview', focusedResidueId: null, highlightedRange: null }}
      onTabChange={() => undefined}
      onStructureLevelChange={() => undefined}
      onSequenceStateChange={() => undefined}
      onTargetSelect={() => undefined}
    />,
  );

  assert.match(markup, /Metadata/);
  assert.match(markup, /Identity/);
  assert.match(markup, /Source and experiment/);
  assert.match(markup, /Annotation/);
});

test('ExplorerSidepanel general tab renders protein overview metrics and structure breakdown', () => {
  const protein = sampleProteins[0];
  const markup = renderToStaticMarkup(
    <ExplorerSidepanel
      protein={protein}
      chainFilter="all"
      activeTab="general"
      structureLevel="secondary"
      sequenceState={{ activeChainId: 'all', density: 'overview', focusedResidueId: null, highlightedRange: null }}
      onTabChange={() => undefined}
      onStructureLevelChange={() => undefined}
      onSequenceStateChange={() => undefined}
      onTargetSelect={() => undefined}
    />,
  );

  assert.match(markup, /General overview/);
  assert.match(markup, /Structure breakdown/);
  assert.match(markup, /Chain breakdown/);
  assert.match(markup, /Secondary structure breakdown chart/);
});

test('ExplorerSidepanel structure tab renders structure controls', () => {
  const protein = sampleProteins[0];
  const markup = renderToStaticMarkup(
    <ExplorerSidepanel
      protein={protein}
      chainFilter="all"
      activeTab="structure"
      structureLevel="secondary"
      sequenceState={{ activeChainId: 'all', density: 'overview', focusedResidueId: null, highlightedRange: null }}
      onTabChange={() => undefined}
      onStructureLevelChange={() => undefined}
      onSequenceStateChange={() => undefined}
      onTargetSelect={() => undefined}
    />,
  );

  assert.match(markup, /secondary/);
  assert.match(markup, /Chain A/);
  assert.match(markup, /Explorer inspector/);
});

test('ExplorerSidepanel sequence tab renders the new track and residue detail panel', () => {
  const protein = sampleProteins[0];
  const markup = renderToStaticMarkup(
    <ExplorerSidepanel
      protein={protein}
      chainFilter="all"
      activeTab="sequence"
      structureLevel="secondary"
      sequenceState={{ activeChainId: 'A', density: 'overview', focusedResidueId: protein.chains[0].residues[0].id, highlightedRange: null }}
      onTabChange={() => undefined}
      onStructureLevelChange={() => undefined}
      onSequenceStateChange={() => undefined}
      onTargetSelect={() => undefined}
      selectedResidue={{
        residueId: protein.chains[0].residues[0].id,
        chainId: protein.chains[0].residues[0].chainId,
        residueNumber: protein.chains[0].residues[0].residueNumber,
        residueName: protein.chains[0].residues[0].residueName,
      }}
    />,
  );

  assert.match(markup, /Sequence track/);
  assert.match(markup, /Residue detail/);
  assert.match(markup, /Codon teaching note/);
});

test('ProteinViewer renders scale HUD and orientation widget affordances', () => {
  const markup = renderToStaticMarkup(
    <ProteinViewer
      protein={sampleProteins[0]}
      chainFilter="all"
      viewMode="backbone"
      showAxes={false}
      sceneSettings={{ unitSystem: 'angstrom', showGrid: true, showFog: true, lightingPreset: 'scientific' }}
      fitViewNonce={0}
      onSceneSettingsChange={() => undefined}
      structureLevel="secondary"
    />,
  );

  assert.match(markup, /Scale/);
  assert.match(markup, /Fit view/);
  assert.match(markup, /Orientation gizmo showing X Y Z axes/);
  assert.match(markup, /data-viewer-context-menu="enabled"/);
});
