import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { AppCommandPalette } from './components/AppCommandPalette.js';
import { AppSidebar } from './components/AppSidebar.js';
import { ExplorerSidepanel } from './components/ExplorerSidepanel.js';
import { ProteinBank } from './components/ProteinBank.js';
import { ProteinViewer } from './components/ProteinViewer.js';
import { sampleProteins } from './data/sampleProteins.js';
import { clearLibrarySection, getLibraryState, removeHistoryItem, saveHistoryItem, togglePinnedProtein, } from './services/libraryService.js';
import { loadProteinById } from './services/pdbService.js';
import { getTargetedResidue } from './utils/explorerContent.js';
import { buildProteinBankRows, defaultProteinBankFilters, filterProteinBankRows, } from './utils/proteinBank.js';
import { getSequenceHighlightRange } from './utils/sequenceTrack.js';
import { Badge } from './components/ui/badge.js';
import { Button } from './components/ui/button.js';
import { Combobox } from './components/ui/combobox.js';
import { Card, CardContent } from './components/ui/card.js';
import { DropdownMenuCheckboxItem, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, } from './components/ui/dropdown-menu.js';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './components/ui/hover-card.js';
import { SidebarInset, SidebarProvider, SidebarTrigger } from './components/ui/sidebar.js';
const starterProteins = sampleProteins;
const THEME_STORAGE_KEY = 'protein-workbench-theme-v1';
const mergeUniqueProteins = (...groups) => {
    const proteinMap = new Map();
    for (const group of groups) {
        for (const protein of group) {
            proteinMap.set(protein.id, protein);
        }
    }
    return [...proteinMap.values()];
};
const defaultStructureLevel = (protein) => {
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
const getInitialTheme = (fallback) => {
    if (typeof window === 'undefined') {
        return fallback;
    }
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === 'light' ? 'light' : fallback;
};
const getInitialSidebarState = () => {
    if (typeof window === 'undefined') {
        return true;
    }
    return window.innerWidth >= 1024;
};
const defaultSequenceState = () => ({
    activeChainId: 'all',
    density: 'overview',
    focusedResidueId: null,
    highlightedRange: null,
});
const defaultViewerSceneSettings = () => ({
    unitSystem: 'angstrom',
    showGrid: true,
    showFog: true,
    lightingPreset: 'scientific',
});
export default function App({ initialWorkspace = 'explorer', initialTheme = 'dark', render3D = true }) {
    const initialLibrary = useMemo(() => getLibraryState(), []);
    const [workspace, setWorkspace] = useState(initialWorkspace);
    const [theme, setTheme] = useState(() => getInitialTheme(initialTheme));
    const [sidebarOpen, setSidebarOpen] = useState(() => getInitialSidebarState());
    const [commandOpen, setCommandOpen] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [pinnedProteins, setPinnedProteins] = useState(initialLibrary.pinned);
    const [historyProteins, setHistoryProteins] = useState(initialLibrary.history);
    const [selectedId, setSelectedId] = useState(initialLibrary.history[0]?.id ?? initialLibrary.pinned[0]?.id ?? starterProteins[0]?.id ?? null);
    const [viewerMode, setViewerMode] = useState('backbone');
    const [showAxes, setShowAxes] = useState(false);
    const [fitViewNonce, setFitViewNonce] = useState(0);
    const [chainFilter, setChainFilter] = useState('all');
    const [selectedResidue, setSelectedResidue] = useState(null);
    const [hoveredResidue, setHoveredResidue] = useState(null);
    const [activeTarget, setActiveTarget] = useState(null);
    const [activeTab, setActiveTab] = useState('structure');
    const [structureLevel, setStructureLevel] = useState(defaultStructureLevel(starterProteins[0] ?? null));
    const [sequenceState, setSequenceState] = useState(() => defaultSequenceState());
    const [viewerSceneSettings, setViewerSceneSettings] = useState(() => defaultViewerSceneSettings());
    const [statusMessage, setStatusMessage] = useState(null);
    const [bankFilters, setBankFilters] = useState(() => defaultProteinBankFilters());
    const [bankSortKey, setBankSortKey] = useState('title');
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
        const handleKeyDown = (event) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setCommandOpen((current) => !current);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    const availableProteins = useMemo(() => mergeUniqueProteins(starterProteins, pinnedProteins, historyProteins, searchResults), [historyProteins, pinnedProteins, searchResults]);
    const selectedProtein = useMemo(() => availableProteins.find((protein) => protein.id === selectedId) ?? starterProteins[0] ?? null, [availableProteins, selectedId]);
    const bankRows = useMemo(() => buildProteinBankRows({
        starterProteins,
        pinnedProteins,
        historyProteins,
        searchResults,
    }), [historyProteins, pinnedProteins, searchResults]);
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
    const resetLearningState = (protein, tab = 'structure') => {
        setChainFilter('all');
        setSelectedResidue(null);
        setHoveredResidue(null);
        setActiveTarget(null);
        setActiveTab(tab);
        setStructureLevel(defaultStructureLevel(protein));
        setSequenceState(defaultSequenceState());
    };
    const handleSelectProtein = (protein, options) => {
        setSelectedId(protein.id);
        resetLearningState(protein, options?.tab ?? 'structure');
        if (options?.saveHistory ?? protein.metadata.source === 'rcsb') {
            setHistoryProteins(saveHistoryItem(protein));
        }
        if (options?.workspace) {
            setWorkspace(options.workspace);
        }
    };
    const handleSearchResults = (proteins) => {
        setSearchResults(proteins);
        setStatusMessage(proteins.length > 0 ? `Loaded ${proteins.length} protein${proteins.length === 1 ? '' : 's'} into Protein Bank.` : 'No proteins were added to Protein Bank.');
    };
    const handleTogglePinned = (protein) => {
        setPinnedProteins(togglePinnedProtein(protein));
    };
    const handleRemoveHistory = (proteinId) => {
        setHistoryProteins(removeHistoryItem(proteinId));
    };
    const handleResidueSelect = (residue) => {
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
    const handleTargetSelect = (target, options) => {
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
    const handleCommandOpenProtein = (protein) => {
        handleSelectProtein(protein, { workspace: 'explorer', tab: 'structure' });
        setStatusMessage(`Opened ${protein.name ?? protein.metadata.displayTitle} in Explorer.`);
    };
    const handleCommandOpenPdbId = async (pdbId) => {
        try {
            const protein = await loadProteinById(pdbId);
            setSearchResults((current) => mergeUniqueProteins(current, [protein]));
            handleSelectProtein(protein, { workspace: 'explorer', tab: 'structure' });
            setStatusMessage(`Loaded ${protein.metadata.pdbId ?? protein.id.toUpperCase()} into Explorer.`);
        }
        catch (error) {
            setStatusMessage(error instanceof Error ? error.message : 'Failed to load the requested PDB ID.');
        }
    };
    const chainOptions = selectedProtein?.chains.map((chain) => chain.id) ?? [];
    const chainComboboxOptions = [
        { value: 'all', label: 'All chains', keywords: ['all', 'chains'] },
        ...chainOptions.map((chainId) => ({ value: chainId, label: `Chain ${chainId}`, keywords: [chainId, 'chain'] })),
    ];
    const unitComboboxOptions = [
        { value: 'angstrom', label: 'Angstrom (Å)', keywords: ['angstrom', 'angstroms', 'a'] },
        { value: 'nanometer', label: 'Nanometer (nm)', keywords: ['nanometer', 'nanometers', 'nm'] },
    ];
    const pinnedIds = new Set(pinnedProteins.map((protein) => protein.id));
    return (_jsx(SidebarProvider, { open: sidebarOpen, onOpenChange: setSidebarOpen, children: _jsx("div", { className: "h-dvh overflow-hidden bg-background text-foreground", children: _jsxs("div", { className: "relative flex h-full overflow-hidden bg-[radial-gradient(circle_at_top_left,oklch(0.52_0.07_210_/_0.18),transparent_24%),radial-gradient(circle_at_top_right,oklch(0.58_0.08_180_/_0.16),transparent_26%),linear-gradient(180deg,oklch(0.19_0.01_255)_0%,oklch(0.15_0.01_255)_100%)]", children: [_jsx(AppSidebar, { workspace: workspace, pinnedProteins: pinnedProteins, historyProteins: historyProteins, selectedId: selectedProtein?.id ?? null, onSelectProtein: (protein) => handleSelectProtein(protein, { workspace: 'explorer' }), onTogglePinned: handleTogglePinned, onRemoveHistory: handleRemoveHistory, onSearch: openProteinBankWorkspace, onAskAI: openCommandPalette, onProteinBankViewer: openProteinBankWorkspace, onClearHistory: () => setHistoryProteins(clearLibrarySection('history').history), onToggleTheme: handleToggleTheme }), _jsx(SidebarInset, { children: _jsxs("main", { className: "flex min-h-0 flex-1 flex-col overflow-hidden p-4 lg:p-6", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between gap-3 lg:hidden", children: [_jsx(SidebarTrigger, { "aria-label": "Open sidebar" }), _jsxs(Badge, { variant: "outline", className: "border-border/60 bg-secondary/50 text-foreground", children: [theme, " theme"] })] }), statusMessage ? (_jsx("div", { className: "mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-50", children: statusMessage })) : null, workspace === 'explorer' ? (_jsxs("div", { className: "flex min-h-0 flex-1 flex-col gap-4 overflow-hidden", children: [_jsx("div", { className: "shrink-0", children: _jsx(Card, { className: "bg-card/94 shadow-[0_16px_48px_-40px_rgba(8,145,178,0.35)] backdrop-blur", children: _jsx(CardContent, { className: "p-4", children: _jsxs("div", { className: "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", children: [_jsxs("div", { className: "min-w-0 space-y-1", children: [_jsx("div", { className: "text-xs text-muted-foreground", children: "Explorer" }), _jsx("h1", { className: "truncate text-lg font-semibold", children: explorerHeading }), _jsx("p", { className: "truncate text-sm text-muted-foreground", children: explorerSubtitle })] }), _jsxs("div", { className: "flex flex-col items-stretch gap-3 lg:min-w-[26rem] lg:items-end", children: [_jsxs("div", { className: "flex flex-wrap justify-end gap-2", children: [_jsx(Badge, { variant: "outline", className: "border-border/60 bg-secondary/45 text-foreground", children: selectedProtein?.metadata.pdbId ?? 'Sample' }), _jsxs(Badge, { variant: "outline", className: "border-border/60 bg-secondary/45 text-foreground", children: [selectedProtein?.chains.length ?? 0, " chains"] }), _jsxs(Badge, { variant: "outline", className: "border-border/60 bg-secondary/45 text-foreground", children: [selectedProtein?.variants.length ?? 0, " variants"] }), selectedProtein?.metadata.resolution ? (_jsxs(Badge, { variant: "outline", className: "border-border/60 bg-secondary/45 text-foreground", children: [selectedProtein.metadata.resolution.toFixed(2), " \u00C5"] })) : null] }), _jsxs("div", { className: "grid gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,12rem)_auto_auto]", children: [_jsx(Combobox, { options: chainComboboxOptions, value: chainFilter, onValueChange: (nextChain) => {
                                                                                    setChainFilter(nextChain);
                                                                                    setSequenceState((current) => ({
                                                                                        ...current,
                                                                                        activeChainId: nextChain === 'all' ? 'all' : nextChain,
                                                                                    }));
                                                                                }, placeholder: "Chain", searchPlaceholder: "Filter chains...", emptyMessage: "No chain matches.", disabled: !selectedProtein, ariaLabel: "Choose chain" }), _jsx(Combobox, { options: unitComboboxOptions, value: viewerSceneSettings.unitSystem, onValueChange: (value) => setViewerSceneSettings((current) => ({
                                                                                    ...current,
                                                                                    unitSystem: value,
                                                                                })), placeholder: "Units", searchPlaceholder: "Filter units...", emptyMessage: "No unit matches.", ariaLabel: "Choose viewer units" }), _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsx(Button, { variant: "outline", className: "rounded-xl", children: "Viewer menu" }) }), _jsxs(DropdownMenuContent, { align: "end", className: "w-64 rounded-xl", children: [_jsx(DropdownMenuLabel, { children: "Viewer actions" }), _jsx(DropdownMenuSeparator, {}), _jsxs(DropdownMenuSub, { children: [_jsx(DropdownMenuSubTrigger, { children: "Representation" }), _jsx(DropdownMenuSubContent, { className: "w-44 rounded-xl", children: _jsxs(DropdownMenuRadioGroup, { value: viewerMode, onValueChange: (value) => setViewerMode(value), children: [_jsx(DropdownMenuRadioItem, { value: "atoms", children: "Atoms" }), _jsx(DropdownMenuRadioItem, { value: "backbone", children: "Backbone" }), _jsx(DropdownMenuRadioItem, { value: "cartoon", children: "Cartoon" })] }) })] }), _jsx(DropdownMenuCheckboxItem, { checked: showAxes, onCheckedChange: (checked) => setShowAxes(Boolean(checked)), children: "Axes" }), _jsx(DropdownMenuCheckboxItem, { checked: viewerSceneSettings.showGrid, onCheckedChange: (checked) => setViewerSceneSettings((current) => ({ ...current, showGrid: Boolean(checked) })), children: "Grid" }), _jsx(DropdownMenuCheckboxItem, { checked: viewerSceneSettings.showFog, onCheckedChange: (checked) => setViewerSceneSettings((current) => ({ ...current, showFog: Boolean(checked) })), children: "Fog" }), _jsx(DropdownMenuSeparator, {}), _jsx(DropdownMenuItem, { onSelect: () => {
                                                                                                    if (selectedProtein) {
                                                                                                        resetLearningState(selectedProtein, 'structure');
                                                                                                    }
                                                                                                }, children: "Reset focus" }), _jsx(DropdownMenuItem, { onSelect: requestFitView, children: "Fit view" }), _jsx(DropdownMenuItem, { onSelect: () => setActiveTab('sequence'), children: "Open sequence" })] })] }), selectedProtein ? (_jsxs(HoverCard, { children: [_jsx(HoverCardTrigger, { asChild: true, children: _jsx(Button, { variant: "outline", className: "rounded-xl", children: "Source details" }) }), _jsx(HoverCardContent, { align: "end", className: "w-80 rounded-xl", children: _jsxs("div", { className: "space-y-2 text-sm", children: [_jsx("div", { className: "font-medium", children: selectedProtein.metadata.rawTitle }), _jsx("p", { className: "text-muted-foreground", children: selectedProtein.metadata.functionSummary ?? selectedProtein.metadata.description }), _jsxs("div", { className: "grid grid-cols-2 gap-2 text-xs text-muted-foreground", children: [_jsxs("span", { children: ["PDB: ", selectedProtein.metadata.pdbId ?? 'Sample'] }), _jsxs("span", { children: ["Source: ", selectedProtein.metadata.source] }), _jsxs("span", { children: ["Method: ", selectedProtein.metadata.experimentalMethod ?? 'Unavailable'] }), _jsxs("span", { children: ["Resolution: ", selectedProtein.metadata.resolution ? `${selectedProtein.metadata.resolution.toFixed(2)} Å` : 'Unavailable'] })] })] }) })] })) : null] })] })] }) }) }) }), _jsxs("div", { className: "explorer-workbench min-h-0 flex-1", children: [_jsx("section", { className: "explorer-workbench__viewer flex min-h-0 rounded-2xl border border-border/55 bg-card/94 p-2 shadow-sm", children: render3D ? (_jsx(ProteinViewer, { protein: selectedProtein, chainFilter: chainFilter, viewMode: viewerMode, showAxes: showAxes, sceneSettings: viewerSceneSettings, fitViewNonce: fitViewNonce, onViewModeChange: setViewerMode, onShowAxesChange: setShowAxes, onSceneSettingsChange: setViewerSceneSettings, structureLevel: structureLevel, activeTarget: activeTarget, selectedResidue: selectedResidue, hoveredResidue: hoveredResidue, onResidueHover: setHoveredResidue, onResidueSelect: handleResidueSelect, onResetFocus: () => {
                                                            if (selectedProtein) {
                                                                resetLearningState(selectedProtein, 'structure');
                                                            }
                                                        } })) : (_jsx("div", { className: "viewer-empty", children: "3D viewer disabled for shell rendering tests." })) }), _jsx("div", { className: "explorer-workbench__rail", children: _jsx(ExplorerSidepanel, { protein: selectedProtein, chainFilter: chainFilter, activeTab: activeTab, structureLevel: structureLevel, sequenceState: sequenceState, activeTarget: activeTarget, selectedResidue: selectedResidue, hoveredResidue: hoveredResidue, onTabChange: setActiveTab, onStructureLevelChange: setStructureLevel, onSequenceStateChange: setSequenceState, onTargetSelect: handleTargetSelect, onResidueHover: setHoveredResidue, onResidueSelect: handleResidueSelect }) })] })] })) : (_jsx("div", { className: "min-h-0 flex-1 overflow-auto pr-1", children: _jsx(ProteinBank, { rows: visibleBankRows, selectedId: selectedProtein?.id ?? null, filters: bankFilters, sortKey: bankSortKey, pinnedIds: pinnedIds, onFiltersChange: setBankFilters, onSortKeyChange: setBankSortKey, onSearchResults: handleSearchResults, onOpenProtein: (protein) => handleSelectProtein(protein, { workspace: 'explorer', tab: 'structure' }), onTogglePinned: handleTogglePinned }) }))] }) }), _jsx(AppCommandPalette, { open: commandOpen, pinnedProteins: pinnedProteins, historyProteins: historyProteins, onOpenChange: setCommandOpen, onGoHome: openHomeWorkspace, onGoProteinBank: openProteinBankWorkspace, onToggleTheme: handleToggleTheme, onOpenProtein: handleCommandOpenProtein, onOpenPdbId: handleCommandOpenPdbId })] }) }) }));
}
