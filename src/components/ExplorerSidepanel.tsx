import { Badge } from './ui/badge.js';
import { Button } from './ui/button.js';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.js';
import { Combobox, type ComboboxOption } from './ui/combobox.js';
import { ScrollArea } from './ui/scroll-area.js';
import { Separator } from './ui/separator.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs.js';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion.js';
import { SequenceViewer } from './SequenceViewer.js';
import { getStructureLevelDescription, getTargetedResidue, getTeachingCodonEntry } from '../utils/explorerContent.js';
import { findRegionsForResidue, findResidueById, findVariantForResidue } from '../utils/sequenceTrack.js';
import type {
  InspectorTab,
  Protein,
  SequencePanelState,
  StructureLevel,
  ViewerSelection,
  ViewerTarget,
} from '../types/structure.js';

interface ExplorerSidepanelProps {
  protein: Protein | null;
  chainFilter: string[];
  activeTab: InspectorTab;
  structureLevel: StructureLevel;
  sequenceState: SequencePanelState;
  activeTarget?: ViewerTarget | null;
  selectedResidue?: ViewerSelection | null;
  hoveredResidue?: ViewerSelection | null;
  onTabChange: (tab: InspectorTab) => void;
  onStructureLevelChange: (level: StructureLevel) => void;
  onSequenceStateChange: (state: SequencePanelState | ((current: SequencePanelState) => SequencePanelState)) => void;
  onTargetSelect: (target: ViewerTarget, options?: { tab?: InspectorTab }) => void;
  onResidueHover?: (residue: ViewerSelection | null) => void;
  onResidueSelect?: (residue: ViewerSelection) => void;
}

const structureLevels: StructureLevel[] = ['primary', 'secondary', 'tertiary', 'quaternary'];
const inspectorTabs: InspectorTab[] = ['general', 'structure', 'sequence', 'variants'];
const structureLevelOptions: ComboboxOption[] = structureLevels.map((level) => ({
  value: level,
  label: `${level[0].toUpperCase()}${level.slice(1)}`,
  keywords: [level, 'structure'],
}));

function GeneralOverviewPanel({
  protein,
  visibleChains,
}: {
  protein: Protein;
  visibleChains: Protein['chains'];
}) {
  const visibleChainIds = new Set(visibleChains.map((chain) => chain.id));
  const visibleResidues = visibleChains.flatMap((chain) => chain.residues);
  const visibleVariants = protein.variants.filter((variant) => visibleChainIds.has(variant.chainId));
  const visibleRegions = protein.regions.filter((region) => visibleChainIds.has(region.chainId));
  const visibleAtoms = protein.atoms.filter((atom) => visibleChainIds.has(atom.chainId ?? 'A'));
  const structureBuckets = [
    {
      key: 'helix',
      label: 'Helix',
      color: '#fb7185',
      count: visibleResidues.filter((residue) => residue.secondaryStructure === 'helix').length,
    },
    {
      key: 'sheet',
      label: 'Sheet',
      color: '#2dd4bf',
      count: visibleResidues.filter((residue) => residue.secondaryStructure === 'sheet').length,
    },
    {
      key: 'loop',
      label: 'Loop',
      color: '#93c5fd',
      count: visibleResidues.filter((residue) => residue.secondaryStructure === 'loop').length,
    },
    {
      key: 'unassigned',
      label: 'Unassigned',
      color: '#cbd5e1',
      count: visibleResidues.filter((residue) => residue.secondaryStructure === 'unassigned').length,
    },
  ].filter((entry) => entry.count > 0);

  const totalStructuredResidues = structureBuckets.reduce((sum, entry) => sum + entry.count, 0);
  let cumulative = 0;
  const chartSegments = structureBuckets.map((entry) => {
    const start = totalStructuredResidues === 0 ? 0 : cumulative / totalStructuredResidues;
    cumulative += entry.count;
    const end = totalStructuredResidues === 0 ? 0 : cumulative / totalStructuredResidues;
    return { ...entry, start, end };
  });
  const chainCards = visibleChains.map((chain) => ({
    id: chain.id,
    residueCount: chain.residueCount,
    atomCount: protein.atoms.filter((atom) => (atom.chainId ?? 'A') === chain.id).length,
    variantCount: visibleVariants.filter((variant) => variant.chainId === chain.id).length,
    sequenceSource: chain.sequenceSource,
  }));

  return (
    <div className="inspector-stack">
      <Card size="sm" className="bg-card/88">
        <CardHeader className="gap-2 p-4">
          <div>
            <CardTitle className="text-sm">General overview</CardTitle>
            <CardDescription>Quick structural counts and composition for the chains currently in view.</CardDescription>
          </div>
          <CardAction>
            <Badge variant="outline">{protein.metadata.source}</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          <div className="general-stat-grid">
            <div className="general-stat-card">
              <span className="general-stat-card__label">Visible chains</span>
              <strong>{visibleChains.length}</strong>
              <span>{protein.chains.length} total</span>
            </div>
            <div className="general-stat-card">
              <span className="general-stat-card__label">Residues</span>
              <strong>{visibleResidues.length}</strong>
              <span>amino acids</span>
            </div>
            <div className="general-stat-card">
              <span className="general-stat-card__label">Atoms</span>
              <strong>{visibleAtoms.length}</strong>
              <span>resolved atoms</span>
            </div>
            <div className="general-stat-card">
              <span className="general-stat-card__label">Variants</span>
              <strong>{visibleVariants.length}</strong>
              <span>{visibleRegions.length} regions</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="bg-card/88">
        <CardHeader className="p-4">
          <div>
            <CardTitle className="text-sm">Structure breakdown</CardTitle>
            <CardDescription>Secondary-structure mix for the visible residue set.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 pt-0 lg:grid-cols-[11rem_minmax(0,1fr)]">
          <div className="composition-chart">
            <svg viewBox="0 0 42 42" className="composition-chart__svg" aria-label="Secondary structure breakdown chart">
              <circle cx="21" cy="21" r="15.9155" fill="none" stroke="rgba(148,163,184,0.14)" strokeWidth="4.2" />
              {chartSegments.map((segment) => (
                <circle
                  key={segment.key}
                  cx="21"
                  cy="21"
                  r="15.9155"
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="4.2"
                  strokeDasharray={`${Math.max((segment.end - segment.start) * 100, 0)} ${100 - Math.max((segment.end - segment.start) * 100, 0)}`}
                  strokeDashoffset={25 - segment.start * 100}
                  strokeLinecap="round"
                />
              ))}
            </svg>
            <div className="composition-chart__center">
              <strong>{visibleResidues.length}</strong>
              <span>residues</span>
            </div>
          </div>

          <div className="composition-chart__legend">
            {structureBuckets.map((entry) => {
              const percent = totalStructuredResidues === 0 ? 0 : Math.round((entry.count / totalStructuredResidues) * 100);
              return (
                <div key={entry.key} className="composition-chart__legend-item">
                  <span className="composition-chart__swatch" style={{ backgroundColor: entry.color }} />
                  <div>
                    <div className="font-medium">
                      {entry.label} · {entry.count}
                    </div>
                    <div className="text-xs text-muted-foreground">{percent}% of visible residues</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="bg-card/88">
        <CardHeader className="p-4">
          <div>
            <CardTitle className="text-sm">Chain breakdown</CardTitle>
            <CardDescription>Per-chain size and annotation counts for the current selection.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          {chainCards.map((chain) => (
            <div key={chain.id} className="chain-summary-row">
              <div>
                <div className="font-medium">Chain {chain.id}</div>
                <div className="text-xs text-muted-foreground">Sequence source: {chain.sequenceSource}</div>
              </div>
              <div className="chain-summary-row__stats">
                <Badge variant="outline">{chain.residueCount} residues</Badge>
                <Badge variant="outline">{chain.atomCount} atoms</Badge>
                <Badge variant="outline">{chain.variantCount} variants</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card size="sm" className="bg-card/88">
        <CardHeader className="p-4">
          <div>
            <CardTitle className="text-sm">Metadata</CardTitle>
            <CardDescription>Source identity, experiment details, and annotation counts for this structure.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Accordion type="multiple" className="metadata-accordion">
            <AccordionItem value="identity">
              <AccordionTrigger>Identity</AccordionTrigger>
              <AccordionContent>
                <dl className="metadata-list">
                  <div>
                    <dt>Name</dt>
                    <dd>{protein.name ?? protein.metadata.displayTitle}</dd>
                  </div>
                  <div>
                    <dt>Display title</dt>
                    <dd>{protein.metadata.displayTitle}</dd>
                  </div>
                  <div>
                    <dt>Raw source title</dt>
                    <dd>{protein.metadata.rawTitle}</dd>
                  </div>
                  <div>
                    <dt>Summary</dt>
                    <dd>{protein.metadata.functionSummary ?? protein.metadata.description}</dd>
                  </div>
                </dl>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="source">
              <AccordionTrigger>Source and experiment</AccordionTrigger>
              <AccordionContent>
                <dl className="metadata-list">
                  <div>
                    <dt>PDB ID</dt>
                    <dd>{protein.metadata.pdbId ?? 'Sample structure'}</dd>
                  </div>
                  <div>
                    <dt>UniProt</dt>
                    <dd>{protein.metadata.uniprotId ?? 'Unavailable'}</dd>
                  </div>
                  <div>
                    <dt>Gene</dt>
                    <dd>{protein.metadata.geneName ?? 'Unavailable'}</dd>
                  </div>
                  <div>
                    <dt>Organism</dt>
                    <dd>{protein.metadata.organism ?? 'Unavailable'}</dd>
                  </div>
                  <div>
                    <dt>Method</dt>
                    <dd>{protein.metadata.experimentalMethod ?? 'Unavailable'}</dd>
                  </div>
                  <div>
                    <dt>Resolution</dt>
                    <dd>{protein.metadata.resolution ? `${protein.metadata.resolution.toFixed(2)} Å` : 'Unavailable'}</dd>
                  </div>
                </dl>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="annotation">
              <AccordionTrigger>Annotation</AccordionTrigger>
              <AccordionContent>
                <dl className="metadata-list">
                  <div>
                    <dt>Keywords</dt>
                    <dd>{protein.metadata.keywords?.join(', ') || 'Unavailable'}</dd>
                  </div>
                  <div>
                    <dt>Regions</dt>
                    <dd>{protein.regions.length}</dd>
                  </div>
                  <div>
                    <dt>Variants</dt>
                    <dd>{protein.variants.length}</dd>
                  </div>
                  <div>
                    <dt>Chains</dt>
                    <dd>{protein.chains.length}</dd>
                  </div>
                </dl>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

function SequenceResidueDetail({
  protein,
  chainFilter,
  sequenceState,
  activeTarget,
  selectedResidue,
  onTargetSelect,
}: {
  protein: Protein;
  chainFilter: string[];
  sequenceState: SequencePanelState;
  activeTarget?: ViewerTarget | null;
  selectedResidue?: ViewerSelection | null;
  onTargetSelect: (target: ViewerTarget, options?: { tab?: InspectorTab }) => void;
}) {
  const fallbackResidue =
    protein.chains.find((chain) => chain.id === (chainFilter.length === 0 ? sequenceState.activeChainId : chainFilter[0]))?.residues[0] ??
    protein.chains.find((chain) => chainFilter.length === 0 || chainFilter.includes(chain.id))?.residues[0];
  const focus =
    selectedResidue ??
    getTargetedResidue(activeTarget ?? null) ??
    (fallbackResidue
      ? {
          residueId: fallbackResidue.id,
          chainId: fallbackResidue.chainId,
          residueNumber: fallbackResidue.residueNumber,
          residueName: fallbackResidue.residueName,
        }
      : null);

  if (!focus) {
    return (
      <Card size="sm" className="bg-card/88">
        <CardContent className="p-4 text-center">
          <p className="empty-copy">Select a residue from the viewer or sequence track to inspect its local chemistry and codon teaching notes.</p>
        </CardContent>
      </Card>
    );
  }

  const residue = findResidueById(protein, focus.residueId);
  const residueRegions = findRegionsForResidue(protein.regions, focus.chainId, focus.residueNumber).filter((region) => region.kind !== 'chain');
  const variant = findVariantForResidue(protein.variants, focus.chainId, focus.residueNumber);
  const teachingEntry = getTeachingCodonEntry(residue?.residueCode ?? 'X');

  return (
    <Card size="sm" className="bg-card/88">
      <CardHeader className="gap-3 p-4">
        <div className="space-y-1">
          <CardTitle className="text-sm">Residue detail</CardTitle>
          <CardDescription>Focused sequence context, structure role, and teaching notes for the current residue.</CardDescription>
        </div>
        <CardAction className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2">
          <div className="text-xs text-muted-foreground">Focus</div>
          <div className="text-sm font-medium">
            {focus.residueName} {focus.residueNumber}
          </div>
          <div className="text-xs text-muted-foreground">Chain {focus.chainId}</div>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{residue?.residueCode ?? 'X'}</Badge>
          <Badge variant="outline">{residue?.secondaryStructure ?? 'unassigned'}</Badge>
          {variant ? <Badge variant="outline">Variant hotspot</Badge> : null}
        </div>

        <dl className="sequence-detail-grid">
          <div>
            <dt>Name</dt>
            <dd>{residue?.residueName ?? focus.residueName}</dd>
          </div>
          <div>
            <dt>Position</dt>
            <dd>
              Chain {focus.chainId} · {focus.residueNumber}
            </dd>
          </div>
          <div>
            <dt>Structure</dt>
            <dd>{residue?.secondaryStructure ?? 'Unavailable'}</dd>
          </div>
          <div>
            <dt>Variant</dt>
            <dd>{variant?.label ?? 'None loaded'}</dd>
          </div>
        </dl>

        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Nearby annotations</div>
          {residueRegions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {residueRegions.map((region) => (
                <Button
                  key={region.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-auto rounded-xl px-3 py-2 text-left"
                  onClick={() => onTargetSelect({ kind: 'region', region }, { tab: 'sequence' })}
                >
                  {region.label}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No curated region annotation overlaps this residue.</p>
          )}
        </div>

        <Accordion type="single" collapsible className="rounded-xl border border-border/55 bg-secondary/18 px-4">
          <AccordionItem value="codons" className="border-none">
            <AccordionTrigger className="py-3 text-sm">Codon teaching note</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/55 bg-card/70 p-3">
                  <div className="text-xs text-muted-foreground">DNA codons</div>
                  <div className="text-sm font-medium">{teachingEntry.dnaTriplets.join(', ') || 'Unavailable'}</div>
                </div>
                <div className="rounded-xl border border-border/55 bg-card/70 p-3">
                  <div className="text-xs text-muted-foreground">RNA codons</div>
                  <div className="text-sm font-medium">{teachingEntry.rnaTriplets.join(', ') || 'Unavailable'}</div>
                </div>
              </div>
              <p className="teaching-note">
                Teaching mode shows common codons for this amino acid. It does not claim to reconstruct the exact transcript used in the deposited structure.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

export function ExplorerSidepanel({
  protein,
  chainFilter,
  activeTab,
  structureLevel,
  sequenceState,
  activeTarget,
  selectedResidue,
  hoveredResidue,
  onTabChange,
  onStructureLevelChange,
  onSequenceStateChange,
  onTargetSelect,
  onResidueHover,
  onResidueSelect,
}: ExplorerSidepanelProps) {
  if (!protein) {
    return (
      <Card className="flex h-full min-h-0 items-center justify-center bg-card/94">
        <CardContent className="p-6 text-center">
          <p className="empty-copy">Load a structure to populate the general, structure, sequence, and variant panels.</p>
        </CardContent>
      </Card>
    );
  }

  const visibleChains = chainFilter.length === 0 ? protein.chains : protein.chains.filter((chain) => chainFilter.includes(chain.id));
  const currentResidue =
    selectedResidue ?? getTargetedResidue(activeTarget ?? null) ?? findResidueById(protein, sequenceState.focusedResidueId);
  const structureCopy = getStructureLevelDescription(protein, structureLevel);
  const structureRegions = protein.regions.filter((region) => chainFilter.length === 0 || chainFilter.includes(region.chainId));

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden bg-card/94">
      <CardHeader className="gap-3 border-b border-border/55 p-4">
        <div className="space-y-1">
          <CardTitle className="text-base">Explorer inspector</CardTitle>
          <CardDescription>Use the tabs to move between overview, structural context, sequence, and variants.</CardDescription>
        </div>
        {currentResidue ? (
          <CardAction className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2">
            <div className="text-xs text-muted-foreground">Current focus</div>
            <div className="text-sm font-medium">
              {currentResidue.residueName} {currentResidue.residueNumber}
            </div>
            <div className="text-xs text-muted-foreground">Chain {currentResidue.chainId}</div>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col p-4 pt-4">
        <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as InspectorTab)} className="flex min-h-0 flex-1 flex-col gap-4">
          <TabsList className="grid w-full grid-cols-4 rounded-xl bg-secondary/40">
            {inspectorTabs.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="min-h-0 flex-1 pr-1">
            <TabsContent value="general" className="mt-0">
              <GeneralOverviewPanel protein={protein} visibleChains={visibleChains} />
            </TabsContent>

            <TabsContent value="structure" className="mt-0">
              <div className="inspector-stack">
                <Combobox
                  options={structureLevelOptions}
                  value={structureLevel}
                  onValueChange={(value) => {
                    const level = value as StructureLevel;
                    onStructureLevelChange(level);
                    onTargetSelect({ kind: 'structure-level', level });
                  }}
                  placeholder="Choose structure level"
                  searchPlaceholder="Filter structure levels..."
                  emptyMessage="No structure level matches."
                  ariaLabel="Choose structure level"
                />

                <Card size="sm" className="bg-card/88">
                  <CardHeader className="p-4">
                    <div>
                      <CardTitle className="text-sm">{structureCopy.title}</CardTitle>
                      <CardDescription>{structureCopy.body}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>

                <Accordion type="multiple" className="rounded-xl border border-border/55 bg-card/88 px-4">
                  {visibleChains.map((chain) => {
                    const chainRegions = structureRegions.filter((region) => region.chainId === chain.id && region.kind !== 'chain');
                    return (
                      <AccordionItem key={chain.id} value={`chain-${chain.id}`}>
                        <AccordionTrigger className="py-4">
                          <div className="text-left">
                            <div className="text-sm font-medium">Chain {chain.id}</div>
                            <div className="text-xs text-muted-foreground">{chain.residueCount} resolved residues</div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3">
                          <div className="region-track">
                            {chainRegions.map((region) => {
                              const width = Math.max(10, ((region.endResidue - region.startResidue + 1) / Math.max(chain.residueCount, 1)) * 100);
                              return (
                                <Button
                                  key={region.id}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className={`region-segment region-segment--${region.kind} h-auto justify-start whitespace-normal rounded-xl px-3 py-2 text-left`}
                                  style={{ flexBasis: `${width}%` }}
                                  title={`${region.label} (${region.startResidue}-${region.endResidue})`}
                                  onClick={() => onTargetSelect({ kind: 'region', region }, { tab: 'structure' })}
                                >
                                  <span>{region.label}</span>
                                </Button>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </TabsContent>

            <TabsContent value="sequence" className="mt-0">
              <div className="inspector-stack">
                <SequenceViewer
                  protein={protein}
                  chainFilter={chainFilter}
                  structureLevel={structureLevel}
                  sequenceState={sequenceState}
                  activeTarget={activeTarget}
                  selectedResidue={selectedResidue}
                  hoveredResidue={hoveredResidue}
                  onDensityChange={(density) =>
                    onSequenceStateChange((current) => ({
                      ...current,
                      density,
                    }))
                  }
                  onChainFocusChange={(activeChainId) =>
                    onSequenceStateChange((current) => ({
                      ...current,
                      activeChainId,
                    }))
                  }
                  onResidueHover={onResidueHover}
                  onResidueSelect={(residue) => {
                    onSequenceStateChange((current) => ({
                      ...current,
                      activeChainId: residue.chainId,
                      focusedResidueId: residue.residueId,
                      highlightedRange: {
                        chainId: residue.chainId,
                        startResidue: residue.residueNumber,
                        endResidue: residue.residueNumber,
                        source: 'selection',
                      },
                    }));
                    onResidueSelect?.(residue);
                  }}
                />

                <SequenceResidueDetail
                  protein={protein}
                  chainFilter={chainFilter}
                  sequenceState={sequenceState}
                  activeTarget={activeTarget}
                  selectedResidue={selectedResidue}
                  onTargetSelect={onTargetSelect}
                />
              </div>
            </TabsContent>

            <TabsContent value="variants" className="mt-0">
              <div className="inspector-stack">
                {protein.variants.length === 0 ? (
                  <Card size="sm" className="bg-card/88">
                    <CardContent className="p-6 text-center">
                      <h3 className="text-sm font-medium">No notable variants were loaded</h3>
                      <p className="mt-2 text-sm text-muted-foreground">Use the sequence tab to inspect residue-level context, or check metadata for source details.</p>
                    </CardContent>
                  </Card>
                ) : (
                  protein.variants.map((variant) => (
                    <Card key={variant.id} size="sm" className="bg-card/88">
                      <CardHeader className="gap-2 p-4">
                        <div>
                          <CardTitle className="text-sm">{variant.label}</CardTitle>
                          <CardDescription>{variant.effect}</CardDescription>
                        </div>
                        <CardAction>
                          <Badge variant="outline">{variant.source}</Badge>
                        </CardAction>
                      </CardHeader>
                      <CardContent className="space-y-3 p-4 pt-0">
                        {variant.disease ? <p className="text-sm text-muted-foreground">Disease or condition: {variant.disease}</p> : null}
                        {variant.sourceUrl ? <p className="text-sm text-muted-foreground">Source: {variant.sourceUrl}</p> : null}
                        <Button type="button" variant="outline" size="sm" onClick={() => onTargetSelect({ kind: 'variant', variant }, { tab: 'sequence' })}>
                          Focus in sequence
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
        <Separator className="mt-4" />
      </CardContent>
    </Card>
  );
}
