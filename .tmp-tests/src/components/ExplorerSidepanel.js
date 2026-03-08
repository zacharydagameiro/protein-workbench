import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Badge } from './ui/badge.js';
import { Button } from './ui/button.js';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.js';
import { Combobox } from './ui/combobox.js';
import { ScrollArea } from './ui/scroll-area.js';
import { Separator } from './ui/separator.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs.js';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion.js';
import { SequenceViewer } from './SequenceViewer.js';
import { getStructureLevelDescription, getTargetedResidue, getTeachingCodonEntry } from '../utils/explorerContent.js';
import { findRegionsForResidue, findResidueById, findVariantForResidue } from '../utils/sequenceTrack.js';
const structureLevels = ['primary', 'secondary', 'tertiary', 'quaternary'];
const inspectorTabs = ['general', 'structure', 'sequence', 'variants'];
const structureLevelOptions = structureLevels.map((level) => ({
    value: level,
    label: `${level[0].toUpperCase()}${level.slice(1)}`,
    keywords: [level, 'structure'],
}));
function GeneralOverviewPanel({ protein, visibleChains, }) {
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
    return (_jsxs("div", { className: "inspector-stack", children: [_jsxs(Card, { size: "sm", className: "bg-card/88", children: [_jsxs(CardHeader, { className: "gap-2 p-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { className: "text-sm", children: "General overview" }), _jsx(CardDescription, { children: "Quick structural counts and composition for the chains currently in view." })] }), _jsx(CardAction, { children: _jsx(Badge, { variant: "outline", children: protein.metadata.source }) })] }), _jsx(CardContent, { className: "space-y-4 p-4 pt-0", children: _jsxs("div", { className: "general-stat-grid", children: [_jsxs("div", { className: "general-stat-card", children: [_jsx("span", { className: "general-stat-card__label", children: "Visible chains" }), _jsx("strong", { children: visibleChains.length }), _jsxs("span", { children: [protein.chains.length, " total"] })] }), _jsxs("div", { className: "general-stat-card", children: [_jsx("span", { className: "general-stat-card__label", children: "Residues" }), _jsx("strong", { children: visibleResidues.length }), _jsx("span", { children: "amino acids" })] }), _jsxs("div", { className: "general-stat-card", children: [_jsx("span", { className: "general-stat-card__label", children: "Atoms" }), _jsx("strong", { children: visibleAtoms.length }), _jsx("span", { children: "resolved atoms" })] }), _jsxs("div", { className: "general-stat-card", children: [_jsx("span", { className: "general-stat-card__label", children: "Variants" }), _jsx("strong", { children: visibleVariants.length }), _jsxs("span", { children: [visibleRegions.length, " regions"] })] })] }) })] }), _jsxs(Card, { size: "sm", className: "bg-card/88", children: [_jsx(CardHeader, { className: "p-4", children: _jsxs("div", { children: [_jsx(CardTitle, { className: "text-sm", children: "Structure breakdown" }), _jsx(CardDescription, { children: "Secondary-structure mix for the visible residue set." })] }) }), _jsxs(CardContent, { className: "grid gap-4 p-4 pt-0 lg:grid-cols-[11rem_minmax(0,1fr)]", children: [_jsxs("div", { className: "composition-chart", children: [_jsxs("svg", { viewBox: "0 0 42 42", className: "composition-chart__svg", "aria-label": "Secondary structure breakdown chart", children: [_jsx("circle", { cx: "21", cy: "21", r: "15.9155", fill: "none", stroke: "rgba(148,163,184,0.14)", strokeWidth: "4.2" }), chartSegments.map((segment) => (_jsx("circle", { cx: "21", cy: "21", r: "15.9155", fill: "none", stroke: segment.color, strokeWidth: "4.2", strokeDasharray: `${Math.max((segment.end - segment.start) * 100, 0)} ${100 - Math.max((segment.end - segment.start) * 100, 0)}`, strokeDashoffset: 25 - segment.start * 100, strokeLinecap: "round" }, segment.key)))] }), _jsxs("div", { className: "composition-chart__center", children: [_jsx("strong", { children: visibleResidues.length }), _jsx("span", { children: "residues" })] })] }), _jsx("div", { className: "composition-chart__legend", children: structureBuckets.map((entry) => {
                                    const percent = totalStructuredResidues === 0 ? 0 : Math.round((entry.count / totalStructuredResidues) * 100);
                                    return (_jsxs("div", { className: "composition-chart__legend-item", children: [_jsx("span", { className: "composition-chart__swatch", style: { backgroundColor: entry.color } }), _jsxs("div", { children: [_jsxs("div", { className: "font-medium", children: [entry.label, " \u00B7 ", entry.count] }), _jsxs("div", { className: "text-xs text-muted-foreground", children: [percent, "% of visible residues"] })] })] }, entry.key));
                                }) })] })] }), _jsxs(Card, { size: "sm", className: "bg-card/88", children: [_jsx(CardHeader, { className: "p-4", children: _jsxs("div", { children: [_jsx(CardTitle, { className: "text-sm", children: "Chain breakdown" }), _jsx(CardDescription, { children: "Per-chain size and annotation counts for the current selection." })] }) }), _jsx(CardContent, { className: "space-y-3 p-4 pt-0", children: chainCards.map((chain) => (_jsxs("div", { className: "chain-summary-row", children: [_jsxs("div", { children: [_jsxs("div", { className: "font-medium", children: ["Chain ", chain.id] }), _jsxs("div", { className: "text-xs text-muted-foreground", children: ["Sequence source: ", chain.sequenceSource] })] }), _jsxs("div", { className: "chain-summary-row__stats", children: [_jsxs(Badge, { variant: "outline", children: [chain.residueCount, " residues"] }), _jsxs(Badge, { variant: "outline", children: [chain.atomCount, " atoms"] }), _jsxs(Badge, { variant: "outline", children: [chain.variantCount, " variants"] })] })] }, chain.id))) })] }), _jsxs(Card, { size: "sm", className: "bg-card/88", children: [_jsx(CardHeader, { className: "p-4", children: _jsxs("div", { children: [_jsx(CardTitle, { className: "text-sm", children: "Metadata" }), _jsx(CardDescription, { children: "Source identity, experiment details, and annotation counts for this structure." })] }) }), _jsx(CardContent, { className: "p-4 pt-0", children: _jsxs(Accordion, { type: "multiple", className: "metadata-accordion", children: [_jsxs(AccordionItem, { value: "identity", children: [_jsx(AccordionTrigger, { children: "Identity" }), _jsx(AccordionContent, { children: _jsxs("dl", { className: "metadata-list", children: [_jsxs("div", { children: [_jsx("dt", { children: "Name" }), _jsx("dd", { children: protein.name ?? protein.metadata.displayTitle })] }), _jsxs("div", { children: [_jsx("dt", { children: "Display title" }), _jsx("dd", { children: protein.metadata.displayTitle })] }), _jsxs("div", { children: [_jsx("dt", { children: "Raw source title" }), _jsx("dd", { children: protein.metadata.rawTitle })] }), _jsxs("div", { children: [_jsx("dt", { children: "Summary" }), _jsx("dd", { children: protein.metadata.functionSummary ?? protein.metadata.description })] })] }) })] }), _jsxs(AccordionItem, { value: "source", children: [_jsx(AccordionTrigger, { children: "Source and experiment" }), _jsx(AccordionContent, { children: _jsxs("dl", { className: "metadata-list", children: [_jsxs("div", { children: [_jsx("dt", { children: "PDB ID" }), _jsx("dd", { children: protein.metadata.pdbId ?? 'Sample structure' })] }), _jsxs("div", { children: [_jsx("dt", { children: "UniProt" }), _jsx("dd", { children: protein.metadata.uniprotId ?? 'Unavailable' })] }), _jsxs("div", { children: [_jsx("dt", { children: "Gene" }), _jsx("dd", { children: protein.metadata.geneName ?? 'Unavailable' })] }), _jsxs("div", { children: [_jsx("dt", { children: "Organism" }), _jsx("dd", { children: protein.metadata.organism ?? 'Unavailable' })] }), _jsxs("div", { children: [_jsx("dt", { children: "Method" }), _jsx("dd", { children: protein.metadata.experimentalMethod ?? 'Unavailable' })] }), _jsxs("div", { children: [_jsx("dt", { children: "Resolution" }), _jsx("dd", { children: protein.metadata.resolution ? `${protein.metadata.resolution.toFixed(2)} Å` : 'Unavailable' })] })] }) })] }), _jsxs(AccordionItem, { value: "annotation", children: [_jsx(AccordionTrigger, { children: "Annotation" }), _jsx(AccordionContent, { children: _jsxs("dl", { className: "metadata-list", children: [_jsxs("div", { children: [_jsx("dt", { children: "Keywords" }), _jsx("dd", { children: protein.metadata.keywords?.join(', ') || 'Unavailable' })] }), _jsxs("div", { children: [_jsx("dt", { children: "Regions" }), _jsx("dd", { children: protein.regions.length })] }), _jsxs("div", { children: [_jsx("dt", { children: "Variants" }), _jsx("dd", { children: protein.variants.length })] }), _jsxs("div", { children: [_jsx("dt", { children: "Chains" }), _jsx("dd", { children: protein.chains.length })] })] }) })] })] }) })] })] }));
}
function SequenceResidueDetail({ protein, chainFilter, sequenceState, activeTarget, selectedResidue, hoveredResidue, onTargetSelect, }) {
    const fallbackResidue = protein.chains.find((chain) => chain.id === (chainFilter === 'all' ? sequenceState.activeChainId : chainFilter))?.residues[0] ??
        protein.chains.find((chain) => chainFilter === 'all' || chain.id === chainFilter)?.residues[0];
    const focus = selectedResidue ??
        hoveredResidue ??
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
        return (_jsx(Card, { size: "sm", className: "bg-card/88", children: _jsx(CardContent, { className: "p-4 text-center", children: _jsx("p", { className: "empty-copy", children: "Select a residue from the viewer or sequence track to inspect its local chemistry and codon teaching notes." }) }) }));
    }
    const residue = findResidueById(protein, focus.residueId);
    const residueRegions = findRegionsForResidue(protein.regions, focus.chainId, focus.residueNumber).filter((region) => region.kind !== 'chain');
    const variant = findVariantForResidue(protein.variants, focus.chainId, focus.residueNumber);
    const teachingEntry = getTeachingCodonEntry(residue?.residueCode ?? 'X');
    return (_jsxs(Card, { size: "sm", className: "bg-card/88", children: [_jsxs(CardHeader, { className: "gap-3 p-4", children: [_jsxs("div", { className: "space-y-1", children: [_jsx(CardTitle, { className: "text-sm", children: "Residue detail" }), _jsx(CardDescription, { children: "Focused sequence context, structure role, and teaching notes for the current residue." })] }), _jsxs(CardAction, { className: "rounded-xl border border-primary/25 bg-primary/10 px-3 py-2", children: [_jsx("div", { className: "text-xs text-muted-foreground", children: "Focus" }), _jsxs("div", { className: "text-sm font-medium", children: [focus.residueName, " ", focus.residueNumber] }), _jsxs("div", { className: "text-xs text-muted-foreground", children: ["Chain ", focus.chainId] })] })] }), _jsxs(CardContent, { className: "space-y-4 p-4 pt-0", children: [_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Badge, { variant: "outline", children: residue?.residueCode ?? 'X' }), _jsx(Badge, { variant: "outline", children: residue?.secondaryStructure ?? 'unassigned' }), variant ? _jsx(Badge, { variant: "outline", children: "Variant hotspot" }) : null] }), _jsxs("dl", { className: "sequence-detail-grid", children: [_jsxs("div", { children: [_jsx("dt", { children: "Name" }), _jsx("dd", { children: residue?.residueName ?? focus.residueName })] }), _jsxs("div", { children: [_jsx("dt", { children: "Position" }), _jsxs("dd", { children: ["Chain ", focus.chainId, " \u00B7 ", focus.residueNumber] })] }), _jsxs("div", { children: [_jsx("dt", { children: "Structure" }), _jsx("dd", { children: residue?.secondaryStructure ?? 'Unavailable' })] }), _jsxs("div", { children: [_jsx("dt", { children: "Variant" }), _jsx("dd", { children: variant?.label ?? 'None loaded' })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "text-xs text-muted-foreground", children: "Nearby annotations" }), residueRegions.length > 0 ? (_jsx("div", { className: "flex flex-wrap gap-2", children: residueRegions.map((region) => (_jsx(Button, { type: "button", size: "sm", variant: "outline", className: "h-auto rounded-xl px-3 py-2 text-left", onClick: () => onTargetSelect({ kind: 'region', region }, { tab: 'sequence' }), children: region.label }, region.id))) })) : (_jsx("p", { className: "text-sm text-muted-foreground", children: "No curated region annotation overlaps this residue." }))] }), _jsx(Accordion, { type: "single", collapsible: true, className: "rounded-xl border border-border/55 bg-secondary/18 px-4", children: _jsxs(AccordionItem, { value: "codons", className: "border-none", children: [_jsx(AccordionTrigger, { className: "py-3 text-sm", children: "Codon teaching note" }), _jsxs(AccordionContent, { className: "space-y-3", children: [_jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsxs("div", { className: "rounded-xl border border-border/55 bg-card/70 p-3", children: [_jsx("div", { className: "text-xs text-muted-foreground", children: "DNA codons" }), _jsx("div", { className: "text-sm font-medium", children: teachingEntry.dnaTriplets.join(', ') || 'Unavailable' })] }), _jsxs("div", { className: "rounded-xl border border-border/55 bg-card/70 p-3", children: [_jsx("div", { className: "text-xs text-muted-foreground", children: "RNA codons" }), _jsx("div", { className: "text-sm font-medium", children: teachingEntry.rnaTriplets.join(', ') || 'Unavailable' })] })] }), _jsx("p", { className: "teaching-note", children: "Teaching mode shows common codons for this amino acid. It does not claim to reconstruct the exact transcript used in the deposited structure." })] })] }) })] })] }));
}
export function ExplorerSidepanel({ protein, chainFilter, activeTab, structureLevel, sequenceState, activeTarget, selectedResidue, hoveredResidue, onTabChange, onStructureLevelChange, onSequenceStateChange, onTargetSelect, onResidueHover, onResidueSelect, }) {
    if (!protein) {
        return (_jsx(Card, { className: "flex h-full min-h-0 items-center justify-center bg-card/94", children: _jsx(CardContent, { className: "p-6 text-center", children: _jsx("p", { className: "empty-copy", children: "Load a structure to populate the general, structure, sequence, and variant panels." }) }) }));
    }
    const visibleChains = chainFilter === 'all' ? protein.chains : protein.chains.filter((chain) => chain.id === chainFilter);
    const currentResidue = selectedResidue ?? hoveredResidue ?? getTargetedResidue(activeTarget ?? null) ?? findResidueById(protein, sequenceState.focusedResidueId);
    const structureCopy = getStructureLevelDescription(protein, structureLevel);
    const structureRegions = protein.regions.filter((region) => chainFilter === 'all' || region.chainId === chainFilter);
    return (_jsxs(Card, { className: "flex h-full min-h-0 flex-col overflow-hidden bg-card/94", children: [_jsxs(CardHeader, { className: "gap-3 border-b border-border/55 p-4", children: [_jsxs("div", { className: "space-y-1", children: [_jsx(CardTitle, { className: "text-base", children: "Explorer inspector" }), _jsx(CardDescription, { children: "Use the tabs to move between overview, structural context, sequence, and variants." })] }), currentResidue ? (_jsxs(CardAction, { className: "rounded-xl border border-primary/25 bg-primary/10 px-3 py-2", children: [_jsx("div", { className: "text-xs text-muted-foreground", children: "Current focus" }), _jsxs("div", { className: "text-sm font-medium", children: [currentResidue.residueName, " ", currentResidue.residueNumber] }), _jsxs("div", { className: "text-xs text-muted-foreground", children: ["Chain ", currentResidue.chainId] })] })) : null] }), _jsxs(CardContent, { className: "flex min-h-0 flex-1 flex-col p-4 pt-4", children: [_jsxs(Tabs, { value: activeTab, onValueChange: (value) => onTabChange(value), className: "flex min-h-0 flex-1 flex-col gap-4", children: [_jsx(TabsList, { className: "grid w-full grid-cols-4 rounded-xl bg-secondary/40", children: inspectorTabs.map((tab) => (_jsx(TabsTrigger, { value: tab, children: tab }, tab))) }), _jsxs(ScrollArea, { className: "min-h-0 flex-1 pr-1", children: [_jsx(TabsContent, { value: "general", className: "mt-0", children: _jsx(GeneralOverviewPanel, { protein: protein, visibleChains: visibleChains }) }), _jsx(TabsContent, { value: "structure", className: "mt-0", children: _jsxs("div", { className: "inspector-stack", children: [_jsx(Combobox, { options: structureLevelOptions, value: structureLevel, onValueChange: (value) => {
                                                        const level = value;
                                                        onStructureLevelChange(level);
                                                        onTargetSelect({ kind: 'structure-level', level });
                                                    }, placeholder: "Choose structure level", searchPlaceholder: "Filter structure levels...", emptyMessage: "No structure level matches.", ariaLabel: "Choose structure level" }), _jsx(Card, { size: "sm", className: "bg-card/88", children: _jsx(CardHeader, { className: "p-4", children: _jsxs("div", { children: [_jsx(CardTitle, { className: "text-sm", children: structureCopy.title }), _jsx(CardDescription, { children: structureCopy.body })] }) }) }), _jsx(Accordion, { type: "multiple", className: "rounded-xl border border-border/55 bg-card/88 px-4", children: visibleChains.map((chain) => {
                                                        const chainRegions = structureRegions.filter((region) => region.chainId === chain.id && region.kind !== 'chain');
                                                        return (_jsxs(AccordionItem, { value: `chain-${chain.id}`, children: [_jsx(AccordionTrigger, { className: "py-4", children: _jsxs("div", { className: "text-left", children: [_jsxs("div", { className: "text-sm font-medium", children: ["Chain ", chain.id] }), _jsxs("div", { className: "text-xs text-muted-foreground", children: [chain.residueCount, " resolved residues"] })] }) }), _jsx(AccordionContent, { className: "space-y-3", children: _jsx("div", { className: "region-track", children: chainRegions.map((region) => {
                                                                            const width = Math.max(10, ((region.endResidue - region.startResidue + 1) / Math.max(chain.residueCount, 1)) * 100);
                                                                            return (_jsx(Button, { type: "button", variant: "outline", size: "sm", className: `region-segment region-segment--${region.kind} h-auto justify-start whitespace-normal rounded-xl px-3 py-2 text-left`, style: { flexBasis: `${width}%` }, title: `${region.label} (${region.startResidue}-${region.endResidue})`, onClick: () => onTargetSelect({ kind: 'region', region }, { tab: 'structure' }), children: _jsx("span", { children: region.label }) }, region.id));
                                                                        }) }) })] }, chain.id));
                                                    }) })] }) }), _jsx(TabsContent, { value: "sequence", className: "mt-0", children: _jsxs("div", { className: "inspector-stack", children: [_jsx(SequenceViewer, { protein: protein, chainFilter: chainFilter, structureLevel: structureLevel, sequenceState: sequenceState, activeTarget: activeTarget, selectedResidue: selectedResidue, hoveredResidue: hoveredResidue, onDensityChange: (density) => onSequenceStateChange((current) => ({
                                                        ...current,
                                                        density,
                                                    })), onChainFocusChange: (activeChainId) => onSequenceStateChange((current) => ({
                                                        ...current,
                                                        activeChainId,
                                                    })), onResidueHover: onResidueHover, onResidueSelect: (residue) => {
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
                                                    } }), _jsx(SequenceResidueDetail, { protein: protein, chainFilter: chainFilter, sequenceState: sequenceState, activeTarget: activeTarget, selectedResidue: selectedResidue, hoveredResidue: hoveredResidue, onTargetSelect: onTargetSelect })] }) }), _jsx(TabsContent, { value: "variants", className: "mt-0", children: _jsx("div", { className: "inspector-stack", children: protein.variants.length === 0 ? (_jsx(Card, { size: "sm", className: "bg-card/88", children: _jsxs(CardContent, { className: "p-6 text-center", children: [_jsx("h3", { className: "text-sm font-medium", children: "No notable variants were loaded" }), _jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Use the sequence tab to inspect residue-level context, or check metadata for source details." })] }) })) : (protein.variants.map((variant) => (_jsxs(Card, { size: "sm", className: "bg-card/88", children: [_jsxs(CardHeader, { className: "gap-2 p-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { className: "text-sm", children: variant.label }), _jsx(CardDescription, { children: variant.effect })] }), _jsx(CardAction, { children: _jsx(Badge, { variant: "outline", children: variant.source }) })] }), _jsxs(CardContent, { className: "space-y-3 p-4 pt-0", children: [variant.disease ? _jsxs("p", { className: "text-sm text-muted-foreground", children: ["Disease or condition: ", variant.disease] }) : null, variant.sourceUrl ? _jsxs("p", { className: "text-sm text-muted-foreground", children: ["Source: ", variant.sourceUrl] }) : null, _jsx(Button, { type: "button", variant: "outline", size: "sm", onClick: () => onTargetSelect({ kind: 'variant', variant }, { tab: 'sequence' }), children: "Focus in sequence" })] })] }, variant.id)))) }) })] })] }), _jsx(Separator, { className: "mt-4" })] })] }));
}
