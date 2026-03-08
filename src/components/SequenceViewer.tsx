import { Button } from './ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.js';
import { ScrollArea } from './ui/scroll-area.js';
import type {
  Protein,
  SequencePanelState,
  SequenceTrackDensity,
  StructureLevel,
  ViewerSelection,
  ViewerTarget,
} from '../types/structure.js';
import { buildVisibleSequenceLanes } from '../utils/sequenceTrack.js';

interface SequenceViewerProps {
  protein: Protein;
  chainFilter: string[];
  structureLevel: StructureLevel;
  sequenceState: SequencePanelState;
  activeTarget?: ViewerTarget | null;
  selectedResidue?: ViewerSelection | null;
  hoveredResidue?: ViewerSelection | null;
  onDensityChange: (density: SequenceTrackDensity) => void;
  onChainFocusChange: (chainId: string) => void;
  onResidueHover?: (residue: ViewerSelection | null) => void;
  onResidueSelect?: (residue: ViewerSelection) => void;
}

export function SequenceViewer({
  protein,
  chainFilter,
  structureLevel,
  sequenceState,
  activeTarget,
  selectedResidue,
  hoveredResidue,
  onDensityChange,
  onChainFocusChange,
  onResidueHover,
  onResidueSelect,
}: SequenceViewerProps) {
  const lanes = buildVisibleSequenceLanes({
    protein,
    chainFilter,
    sequenceState,
    structureLevel,
    activeTarget,
    selectedResidue,
    hoveredResidue,
  });

  if (lanes.length === 0) {
    return <p className="empty-copy">No residues are available for the current chain filter.</p>;
  }

  return (
    <div className="sequence-workspace">
      <Card size="sm" className="bg-card/88">
        <CardHeader className="gap-3 p-4">
          <div className="space-y-1">
            <CardTitle className="text-sm">Sequence track</CardTitle>
            <CardDescription>Scan visible chains, zoom between overview and residue detail, and click a span to sync the viewer.</CardDescription>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant={sequenceState.density === 'overview' ? 'secondary' : 'outline'}
              onClick={() => onDensityChange('overview')}
            >
              Overview
            </Button>
            <Button
              type="button"
              size="sm"
              variant={sequenceState.density === 'residues' ? 'secondary' : 'outline'}
              onClick={() => onDensityChange('residues')}
            >
              Residues
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          <div className="sequence-minimap">
            {lanes.map((lane) => (
              <Button
                key={`minimap-${lane.chain.id}`}
                type="button"
                variant="ghost"
                size="sm"
                className={`sequence-minimap__lane ${lane.isActive ? 'is-active' : ''}`}
                onClick={() => onChainFocusChange(lane.chain.id)}
              >
                <span className="sequence-minimap__label">Chain {lane.chain.id}</span>
                <span className="sequence-minimap__bar">
                  {lane.items.map((item) => (
                    <span
                      key={item.id}
                      className={[
                        'sequence-minimap__segment',
                        item.toneClass,
                        item.isInHighlightRange ? 'is-highlighted' : '',
                        item.isSelected ? 'is-selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    />
                  ))}
                </span>
              </Button>
            ))}
          </div>

          <ScrollArea className="w-full whitespace-nowrap rounded-xl border border-border/55 bg-secondary/18">
            <div className="sequence-track-lanes">
              {lanes.map((lane) => (
                <section key={lane.chain.id} className={`sequence-track-lane ${lane.isActive ? 'is-active' : ''}`}>
                  <div className="sequence-track-lane__meta">
                    <Button
                      type="button"
                      size="sm"
                      variant={lane.isActive ? 'secondary' : 'ghost'}
                      className="justify-start rounded-xl"
                      onClick={() => onChainFocusChange(lane.chain.id)}
                    >
                      Chain {lane.chain.id}
                    </Button>
                    <p>{lane.chain.residueCount} residues</p>
                    <div className="sequence-track-lane__ticks">
                      {lane.tickLabels.map((tick) => (
                        <span key={`${lane.chain.id}:${tick}`}>{tick}</span>
                      ))}
                    </div>
                  </div>

                  <div className="sequence-track">
                    {lane.items.map((item) => (
                      <Button
                        key={item.id}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={[
                          'sequence-track__item',
                          item.kind === 'block' ? 'sequence-track__item--block' : '',
                          item.toneClass,
                          item.isTargeted ? 'sequence-track__item--targeted' : '',
                          item.isSelected ? 'sequence-track__item--selected' : '',
                          item.isHovered ? 'sequence-track__item--hovered' : '',
                          item.isFocused ? 'sequence-track__item--focused' : '',
                          item.isInHighlightRange ? 'sequence-track__item--highlighted' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        title={`${item.label} · residues ${item.caption}`}
                        onMouseEnter={() => onResidueHover?.(item.selection)}
                        onMouseLeave={() => onResidueHover?.(null)}
                        onClick={() => onResidueSelect?.(item.selection)}
                      >
                        <span>{item.label}</span>
                        <small>{item.caption}</small>
                        {item.hasVariant ? <i className="sequence-track__variant-dot" aria-hidden="true" /> : null}
                      </Button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
