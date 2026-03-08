import { useEffect, useMemo, useState } from 'react';
import { AppCommandPalette } from './components/AppCommandPalette.js';
import { AppSidebar } from './components/AppSidebar.js';
import { ExplorerSidepanel } from './components/ExplorerSidepanel.js';
import { ProteinBank } from './components/ProteinBank.js';
import { ProteinViewer } from './components/ProteinViewer.js';
import { sampleProteins } from './data/sampleProteins.js';
import {
  clearLibrarySection,
  getLibraryState,
  removeHistoryItem,
  saveHistoryItem,
  togglePinnedProtein,
} from './services/libraryService.js';
import { loadProteinById } from './services/pdbService.js';
import { getTargetedResidue } from './utils/explorerContent.js';
import {
  buildProteinBankRows,
  defaultProteinBankFilters,
  filterProteinBankRows,
} from './utils/proteinBank.js';
import { getSequenceHighlightRange } from './utils/sequenceTrack.js';
import type {
  InspectorTab,
  Protein,
  ProteinBankFilterState,
  ProteinBankSortKey,
  SequencePanelState,
  StructureLevel,
  ViewerMode,
  ViewerSceneSettings,
  ViewerSelection,
  ViewerTarget,
  WorkspaceTab,
} from './types/structure.js';
import { Badge } from './components/ui/badge.js';
import { Button } from './components/ui/button.js';
import { Combobox, type ComboboxOption } from './components/ui/combobox.js';
import { Card, CardContent } from './components/ui/card.js';
import {
  DropdownMenuCheckboxItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu.js';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './components/ui/hover-card.js';
import { SidebarInset, SidebarProvider, SidebarTrigger } from './components/ui/sidebar.js';

type ThemeMode = 'dark' | 'light';

interface AppProps {
  initialWorkspace?: WorkspaceTab;
  initialTheme?: ThemeMode;
  render3D?: boolean;
}

const starterProteins = sampleProteins;
const THEME_STORAGE_KEY = 'protein-workbench-theme-v1';

const mergeUniqueProteins = (...groups: Protein[][]): Protein[] => {
  const proteinMap = new Map<string, Protein>();
  for (const group of groups) {
    for (const protein of group) {
      proteinMap.set(protein.id, protein);
    }
  }
  return [...proteinMap.values()];
};

const defaultStructureLevel = (protein: Protein | null): StructureLevel => {
  if (!protein) {
    return 'secondary';
  }
  if (protein.chains.length > 1) {
    return 'quaternary';
  }
  if (protein.helices.length > 0 || protein.sheets.length > 0) {
    return 'secondary';
  }
  return 'tertiary';
};

const getInitialTheme = (fallback: ThemeMode): ThemeMode => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return savedTheme === 'light' ? 'light' : fallback;
};

const getInitialSidebarState = (): boolean => {
  if (typeof window === 'undefined') {
    return true;
  }

  return window.innerWidth >= 1024;
};

const defaultSequenceState = (): SequencePanelState => ({
  activeChainId: 'all',
  density: 'overview',
  focusedResidueId: null,
  highlightedRange: null,
});

const defaultViewerSceneSettings = (): ViewerSceneSettings => ({
  unitSystem: 'angstrom',
  showGrid: true,
  showFog: true,
  lightingPreset: 'scientific',
});

export default function App({ initialWorkspace = 'explorer', initialTheme = 'dark', render3D = true }: AppProps) {
  const initialLibrary = useMemo(() => getLibraryState(), []);
  const [workspace, setWorkspace] = useState<WorkspaceTab>(initialWorkspace);
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme(initialTheme));
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => getInitialSidebarState());
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Protein[]>([]);
  const [pinnedProteins, setPinnedProteins] = useState<Protein[]>(initialLibrary.pinned);
  const [historyProteins, setHistoryProteins] = useState<Protein[]>(initialLibrary.history);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialLibrary.history[0]?.id ?? initialLibrary.pinned[0]?.id ?? starterProteins[0]?.id ?? null,
  );
  const [viewerMode, setViewerMode] = useState<ViewerMode>('backbone');
  const [showAxes, setShowAxes] = useState(false);
  const [fitViewNonce, setFitViewNonce] = useState(0);
  const [chainFilter, setChainFilter] = useState('all');
  const [selectedResidue, setSelectedResidue] = useState<ViewerSelection | null>(null);
  const [hoveredResidue, setHoveredResidue] = useState<ViewerSelection | null>(null);
  const [activeTarget, setActiveTarget] = useState<ViewerTarget | null>(null);
  const [activeTab, setActiveTab] = useState<InspectorTab>('structure');
  const [structureLevel, setStructureLevel] = useState<StructureLevel>(defaultStructureLevel(starterProteins[0] ?? null));
  const [sequenceState, setSequenceState] = useState<SequencePanelState>(() => defaultSequenceState());
  const [viewerSceneSettings, setViewerSceneSettings] = useState<ViewerSceneSettings>(() => defaultViewerSceneSettings());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [bankFilters, setBankFilters] = useState<ProteinBankFilterState>(() => defaultProteinBankFilters());
  const [bankSortKey, setBankSortKey] = useState<ProteinBankSortKey>('title');

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((current) => !current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const availableProteins = useMemo(
    () => mergeUniqueProteins(starterProteins, pinnedProteins, historyProteins, searchResults),
    [historyProteins, pinnedProteins, searchResults],
  );

  const selectedProtein = useMemo(
    () => availableProteins.find((protein) => protein.id === selectedId) ?? starterProteins[0] ?? null,
    [availableProteins, selectedId],
  );

  const bankRows = useMemo(
    () =>
      buildProteinBankRows({
        starterProteins,
        pinnedProteins,
        historyProteins,
        searchResults,
      }),
    [historyProteins, pinnedProteins, searchResults],
  );

  const visibleBankRows = useMemo(() => filterProteinBankRows(bankRows, bankFilters), [bankFilters, bankRows]);

  const explorerHeading = selectedProtein?.metadata.moleculeName ?? selectedProtein?.name ?? selectedProtein?.metadata.displayTitle ?? 'Choose a protein';
  const explorerSubtitle = (() => {
    if (!selectedProtein) {
      return 'Open a structure from Protein Bank or the sidebar.';
    }

    const title = explorerHeading.trim().toLowerCase();
    const rawTitle = selectedProtein.metadata.rawTitle?.trim();
    if (rawTitle && rawTitle.toLowerCase() !== title) {
      return rawTitle;
    }

    const functionSummary = selectedProtein.metadata.functionSummary?.trim();
    if (functionSummary && functionSummary.toLowerCase() !== title) {
      return functionSummary;
    }

    const description = selectedProtein.metadata.description?.trim();
    if (description && description.toLowerCase() !== title) {
      return description;
    }

    return [selectedProtein.metadata.organism, selectedProtein.metadata.experimentalMethod].filter(Boolean).join(' · ') || 'Open a structure from Protein Bank or the sidebar.';
  })();

  const resetLearningState = (protein: Protein, tab: InspectorTab = 'structure') => {
    setChainFilter('all');
    setSelectedResidue(null);
    setHoveredResidue(null);
    setActiveTarget(null);
    setActiveTab(tab);
    setStructureLevel(defaultStructureLevel(protein));
    setSequenceState(defaultSequenceState());
  };

  const handleSelectProtein = (
    protein: Protein,
    options?: { saveHistory?: boolean; tab?: InspectorTab; workspace?: WorkspaceTab },
  ) => {
    setSelectedId(protein.id);
    resetLearningState(protein, options?.tab ?? 'structure');

    if (options?.saveHistory ?? protein.metadata.source === 'rcsb') {
      setHistoryProteins(saveHistoryItem(protein));
    }

    if (options?.workspace) {
      setWorkspace(options.workspace);
    }
  };

  const handleSearchResults = (proteins: Protein[]) => {
    setSearchResults(proteins);
    setStatusMessage(
      proteins.length > 0 ? `Loaded ${proteins.length} protein${proteins.length === 1 ? '' : 's'} into Protein Bank.` : 'No proteins were added to Protein Bank.',
    );
  };

  const handleTogglePinned = (protein: Protein) => {
    setPinnedProteins(togglePinnedProtein(protein));
  };

  const handleRemoveHistory = (proteinId: string) => {
    setHistoryProteins(removeHistoryItem(proteinId));
  };

  const handleResidueSelect = (residue: ViewerSelection) => {
    setSelectedResidue(residue);
    setActiveTarget({ kind: 'residue', residue });
    setSequenceState((current) => ({
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
  };

  const handleTargetSelect = (target: ViewerTarget, options?: { tab?: InspectorTab }) => {
    setActiveTarget(target);

    if (target.kind === 'structure-level') {
      setStructureLevel(target.level);
    }
    if (target.kind === 'chain') {
      setChainFilter(target.chainId);
      setStructureLevel(selectedProtein && selectedProtein.chains.length > 1 ? 'quaternary' : 'tertiary');
      setSequenceState((current) => ({
        ...current,
        activeChainId: target.chainId,
        highlightedRange: null,
      }));
    }
    if (target.kind === 'region') {
      setChainFilter(target.region.chainId);
      if (target.region.structureLevel) {
        setStructureLevel(target.region.structureLevel);
      }
      setSelectedResidue(null);
      setSequenceState((current) => ({
        ...current,
        activeChainId: target.region.chainId,
        highlightedRange: getSequenceHighlightRange(target),
      }));
    }
    if (target.kind === 'variant') {
      setChainFilter(target.variant.chainId);
      setSelectedResidue({
        residueId: `${target.variant.chainId}:${target.variant.residueNumber}:`,
        chainId: target.variant.chainId,
        residueNumber: target.variant.residueNumber,
        residueName: target.variant.to ?? target.variant.from ?? 'UNK',
      });
      setSequenceState((current) => ({
        ...current,
        activeChainId: target.variant.chainId,
        highlightedRange: getSequenceHighlightRange(target),
      }));
    }
    if (target.kind === 'residue') {
      setChainFilter(target.residue.chainId);
      setSelectedResidue(target.residue);
      setStructureLevel('primary');
      setSequenceState((current) => ({
        ...current,
        activeChainId: target.residue.chainId,
        focusedResidueId: target.residue.residueId,
        highlightedRange: getSequenceHighlightRange(target),
      }));
    }

    const derivedResidue = getTargetedResidue(target);
    if (target.kind === 'residue' || target.kind === 'variant') {
      setSelectedResidue(derivedResidue);
      setSequenceState((current) => ({
        ...current,
        activeChainId: derivedResidue?.chainId ?? current.activeChainId,
        focusedResidueId: derivedResidue?.residueId ?? current.focusedResidueId,
      }));
    }

    if (options?.tab) {
      setActiveTab(options.tab);
    }
    if (target.kind !== 'chain' && target.kind !== 'region' && target.kind !== 'variant' && target.kind !== 'residue') {
      setSequenceState((current) => ({
        ...current,
        highlightedRange: getSequenceHighlightRange(target),
      }));
    }
  };

  const handleToggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  const openHomeWorkspace = () => {
    setWorkspace('explorer');
    setActiveTab('structure');
    setSequenceState(defaultSequenceState());
    setStatusMessage(null);
  };

  const openProteinBankWorkspace = () => {
    setWorkspace('protein-bank');
    setStatusMessage(null);
  };

  const requestFitView = () => {
    setFitViewNonce((current) => current + 1);
    setStatusMessage(null);
  };

  const openCommandPalette = () => {
    setCommandOpen(true);
    setStatusMessage(null);
  };

  const handleCommandOpenProtein = (protein: Protein) => {
    handleSelectProtein(protein, { workspace: 'explorer', tab: 'structure' });
    setStatusMessage(`Opened ${protein.name ?? protein.metadata.displayTitle} in Explorer.`);
  };

  const handleCommandOpenPdbId = async (pdbId: string) => {
    try {
      const protein = await loadProteinById(pdbId);
      setSearchResults((current) => mergeUniqueProteins(current, [protein]));
      handleSelectProtein(protein, { workspace: 'explorer', tab: 'structure' });
      setStatusMessage(`Loaded ${protein.metadata.pdbId ?? protein.id.toUpperCase()} into Explorer.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to load the requested PDB ID.');
    }
  };

  const chainOptions = selectedProtein?.chains.map((chain) => chain.id) ?? [];
  const chainComboboxOptions: ComboboxOption[] = [
    { value: 'all', label: 'All chains', keywords: ['all', 'chains'] },
    ...chainOptions.map((chainId) => ({ value: chainId, label: `Chain ${chainId}`, keywords: [chainId, 'chain'] })),
  ];
  const unitComboboxOptions: ComboboxOption[] = [
    { value: 'angstrom', label: 'Angstrom (Å)', keywords: ['angstrom', 'angstroms', 'a'] },
    { value: 'nanometer', label: 'Nanometer (nm)', keywords: ['nanometer', 'nanometers', 'nm'] },
  ];
  const pinnedIds = new Set(pinnedProteins.map((protein) => protein.id));

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="h-dvh overflow-hidden bg-background text-foreground">
        <div className="relative flex h-full overflow-hidden bg-[radial-gradient(circle_at_top_left,oklch(0.52_0.07_210_/_0.18),transparent_24%),radial-gradient(circle_at_top_right,oklch(0.58_0.08_180_/_0.16),transparent_26%),linear-gradient(180deg,oklch(0.19_0.01_255)_0%,oklch(0.15_0.01_255)_100%)]">
          <AppSidebar
            workspace={workspace}
            pinnedProteins={pinnedProteins}
            historyProteins={historyProteins}
            selectedId={selectedProtein?.id ?? null}
            onSelectProtein={(protein) => handleSelectProtein(protein, { workspace: 'explorer' })}
            onTogglePinned={handleTogglePinned}
            onRemoveHistory={handleRemoveHistory}
            onSearch={openProteinBankWorkspace}
            onAskAI={openCommandPalette}
            onProteinBankViewer={openProteinBankWorkspace}
            onClearHistory={() => setHistoryProteins(clearLibrarySection('history').history)}
            onToggleTheme={handleToggleTheme}
          />

          <SidebarInset>
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 lg:p-6">
              <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
                <SidebarTrigger aria-label="Open sidebar" />
                <Badge variant="outline" className="border-border/60 bg-secondary/50 text-foreground">
                  {theme} theme
                </Badge>
              </div>

              {statusMessage ? (
                <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
                  {statusMessage}
                </div>
              ) : null}

              {workspace === 'explorer' ? (
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
                  <div className="shrink-0">
                    <Card className="bg-card/94 shadow-[0_16px_48px_-40px_rgba(8,145,178,0.35)] backdrop-blur">
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0 space-y-1">
                            <div className="text-xs text-muted-foreground">Explorer</div>
                            <h1 className="truncate text-lg font-semibold">{explorerHeading}</h1>
                            <p className="truncate text-sm text-muted-foreground">{explorerSubtitle}</p>
                          </div>
                          <div className="flex flex-col items-stretch gap-3 lg:min-w-[26rem] lg:items-end">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Badge variant="outline" className="border-border/60 bg-secondary/45 text-foreground">
                                {selectedProtein?.metadata.pdbId ?? 'Sample'}
                              </Badge>
                              <Badge variant="outline" className="border-border/60 bg-secondary/45 text-foreground">
                                {selectedProtein?.chains.length ?? 0} chains
                              </Badge>
                              <Badge variant="outline" className="border-border/60 bg-secondary/45 text-foreground">
                                {selectedProtein?.variants.length ?? 0} variants
                              </Badge>
                              {selectedProtein?.metadata.resolution ? (
                                <Badge variant="outline" className="border-border/60 bg-secondary/45 text-foreground">
                                  {selectedProtein.metadata.resolution.toFixed(2)} Å
                                </Badge>
                              ) : null}
                            </div>

                            <div className="grid gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,12rem)_auto_auto]">
                              <Combobox
                                options={chainComboboxOptions}
                                value={chainFilter}
                                onValueChange={(nextChain) => {
                                  setChainFilter(nextChain);
                                  setSequenceState((current) => ({
                                    ...current,
                                    activeChainId: nextChain === 'all' ? 'all' : nextChain,
                                  }));
                                }}
                                placeholder="Chain"
                                searchPlaceholder="Filter chains..."
                                emptyMessage="No chain matches."
                                disabled={!selectedProtein}
                                ariaLabel="Choose chain"
                              />

                              <Combobox
                                options={unitComboboxOptions}
                                value={viewerSceneSettings.unitSystem}
                                onValueChange={(value) =>
                                  setViewerSceneSettings((current) => ({
                                    ...current,
                                    unitSystem: value as ViewerSceneSettings['unitSystem'],
                                  }))
                                }
                                placeholder="Units"
                                searchPlaceholder="Filter units..."
                                emptyMessage="No unit matches."
                                ariaLabel="Choose viewer units"
                              />

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" className="rounded-xl">
                                    Viewer menu
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64 rounded-xl">
                                  <DropdownMenuLabel>Viewer actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />

                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>Representation</DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent className="w-44 rounded-xl">
                                      <DropdownMenuRadioGroup value={viewerMode} onValueChange={(value) => setViewerMode(value as ViewerMode)}>
                                        <DropdownMenuRadioItem value="atoms">Atoms</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="backbone">Backbone</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="cartoon">Cartoon</DropdownMenuRadioItem>
                                      </DropdownMenuRadioGroup>
                                    </DropdownMenuSubContent>
                                  </DropdownMenuSub>

                                  <DropdownMenuCheckboxItem checked={showAxes} onCheckedChange={(checked) => setShowAxes(Boolean(checked))}>
                                    Axes
                                  </DropdownMenuCheckboxItem>
                                  <DropdownMenuCheckboxItem
                                    checked={viewerSceneSettings.showGrid}
                                    onCheckedChange={(checked) =>
                                      setViewerSceneSettings((current) => ({ ...current, showGrid: Boolean(checked) }))
                                    }
                                  >
                                    Grid
                                  </DropdownMenuCheckboxItem>
                                  <DropdownMenuCheckboxItem
                                    checked={viewerSceneSettings.showFog}
                                    onCheckedChange={(checked) =>
                                      setViewerSceneSettings((current) => ({ ...current, showFog: Boolean(checked) }))
                                    }
                                  >
                                    Fog
                                  </DropdownMenuCheckboxItem>

                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      if (selectedProtein) {
                                        resetLearningState(selectedProtein, 'structure');
                                      }
                                    }}
                                  >
                                    Reset focus
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={requestFitView}>Fit view</DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => setActiveTab('sequence')}>Open sequence</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              {selectedProtein ? (
                                <HoverCard>
                                  <HoverCardTrigger asChild>
                                    <Button variant="outline" className="rounded-xl">
                                      Source details
                                    </Button>
                                  </HoverCardTrigger>
                                  <HoverCardContent align="end" className="w-80 rounded-xl">
                                    <div className="space-y-2 text-sm">
                                      <div className="font-medium">{selectedProtein.metadata.rawTitle}</div>
                                      <p className="text-muted-foreground">
                                        {selectedProtein.metadata.functionSummary ?? selectedProtein.metadata.description}
                                      </p>
                                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                        <span>PDB: {selectedProtein.metadata.pdbId ?? 'Sample'}</span>
                                        <span>Source: {selectedProtein.metadata.source}</span>
                                        <span>Method: {selectedProtein.metadata.experimentalMethod ?? 'Unavailable'}</span>
                                        <span>
                                          Resolution: {selectedProtein.metadata.resolution ? `${selectedProtein.metadata.resolution.toFixed(2)} Å` : 'Unavailable'}
                                        </span>
                                      </div>
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="explorer-workbench min-h-0 flex-1">
                    <section className="explorer-workbench__viewer flex min-h-0 rounded-2xl border border-border/55 bg-card/94 p-2 shadow-sm">
                      {render3D ? (
                        <ProteinViewer
                          protein={selectedProtein}
                          chainFilter={chainFilter}
                          viewMode={viewerMode}
                          showAxes={showAxes}
                          sceneSettings={viewerSceneSettings}
                          fitViewNonce={fitViewNonce}
                          onViewModeChange={setViewerMode}
                          onShowAxesChange={setShowAxes}
                          onSceneSettingsChange={setViewerSceneSettings}
                          structureLevel={structureLevel}
                          activeTarget={activeTarget}
                          selectedResidue={selectedResidue}
                          hoveredResidue={hoveredResidue}
                          onResidueHover={setHoveredResidue}
                          onResidueSelect={handleResidueSelect}
                          onResetFocus={() => {
                            if (selectedProtein) {
                              resetLearningState(selectedProtein, 'structure');
                            }
                          }}
                        />
                      ) : (
                        <div className="viewer-empty">3D viewer disabled for shell rendering tests.</div>
                      )}
                    </section>

                    <div className="explorer-workbench__rail">
                      <ExplorerSidepanel
                        protein={selectedProtein}
                        chainFilter={chainFilter}
                        activeTab={activeTab}
                        structureLevel={structureLevel}
                        sequenceState={sequenceState}
                        activeTarget={activeTarget}
                        selectedResidue={selectedResidue}
                        hoveredResidue={hoveredResidue}
                        onTabChange={setActiveTab}
                        onStructureLevelChange={setStructureLevel}
                        onSequenceStateChange={setSequenceState}
                        onTargetSelect={handleTargetSelect}
                        onResidueHover={setHoveredResidue}
                        onResidueSelect={handleResidueSelect}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-auto pr-1">
                  <ProteinBank
                    rows={visibleBankRows}
                    selectedId={selectedProtein?.id ?? null}
                    filters={bankFilters}
                    sortKey={bankSortKey}
                    pinnedIds={pinnedIds}
                    onFiltersChange={setBankFilters}
                    onSortKeyChange={setBankSortKey}
                    onSearchResults={handleSearchResults}
                    onOpenProtein={(protein) => handleSelectProtein(protein, { workspace: 'explorer', tab: 'structure' })}
                    onTogglePinned={handleTogglePinned}
                  />
                </div>
              )}
            </main>
          </SidebarInset>

          <AppCommandPalette
            open={commandOpen}
            pinnedProteins={pinnedProteins}
            historyProteins={historyProteins}
            onOpenChange={setCommandOpen}
            onGoHome={openHomeWorkspace}
            onGoProteinBank={openProteinBankWorkspace}
            onToggleTheme={handleToggleTheme}
            onOpenProtein={handleCommandOpenProtein}
            onOpenPdbId={handleCommandOpenPdbId}
          />
        </div>
      </div>
    </SidebarProvider>
  );
}
