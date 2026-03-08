import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from './ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.js';
import { ScrollArea } from './ui/scroll-area.js';
import { buildVisibleSequenceLanes } from '../utils/sequenceTrack.js';
export function SequenceViewer({ protein, chainFilter, structureLevel, sequenceState, activeTarget, selectedResidue, hoveredResidue, onDensityChange, onChainFocusChange, onResidueHover, onResidueSelect, }) {
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
        return _jsx("p", { className: "empty-copy", children: "No residues are available for the current chain filter." });
    }
    return (_jsx("div", { className: "sequence-workspace", children: _jsxs(Card, { size: "sm", className: "bg-card/88", children: [_jsxs(CardHeader, { className: "gap-3 p-4", children: [_jsxs("div", { className: "space-y-1", children: [_jsx(CardTitle, { className: "text-sm", children: "Sequence track" }), _jsx(CardDescription, { children: "Scan visible chains, zoom between overview and residue detail, and click a span to sync the viewer." })] }), _jsxs("div", { className: "flex flex-wrap justify-end gap-2", children: [_jsx(Button, { type: "button", size: "sm", variant: sequenceState.density === 'overview' ? 'secondary' : 'outline', onClick: () => onDensityChange('overview'), children: "Overview" }), _jsx(Button, { type: "button", size: "sm", variant: sequenceState.density === 'residues' ? 'secondary' : 'outline', onClick: () => onDensityChange('residues'), children: "Residues" })] })] }), _jsxs(CardContent, { className: "space-y-4 p-4 pt-0", children: [_jsx("div", { className: "sequence-minimap", children: lanes.map((lane) => (_jsxs(Button, { type: "button", variant: "ghost", size: "sm", className: `sequence-minimap__lane ${lane.isActive ? 'is-active' : ''}`, onClick: () => onChainFocusChange(lane.chain.id), children: [_jsxs("span", { className: "sequence-minimap__label", children: ["Chain ", lane.chain.id] }), _jsx("span", { className: "sequence-minimap__bar", children: lane.items.map((item) => (_jsx("span", { className: [
                                                'sequence-minimap__segment',
                                                item.toneClass,
                                                item.isInHighlightRange ? 'is-highlighted' : '',
                                                item.isSelected ? 'is-selected' : '',
                                            ]
                                                .filter(Boolean)
                                                .join(' ') }, item.id))) })] }, `minimap-${lane.chain.id}`))) }), _jsx(ScrollArea, { className: "w-full whitespace-nowrap rounded-xl border border-border/55 bg-secondary/18", children: _jsx("div", { className: "sequence-track-lanes", children: lanes.map((lane) => (_jsxs("section", { className: `sequence-track-lane ${lane.isActive ? 'is-active' : ''}`, children: [_jsxs("div", { className: "sequence-track-lane__meta", children: [_jsxs(Button, { type: "button", size: "sm", variant: lane.isActive ? 'secondary' : 'ghost', className: "justify-start rounded-xl", onClick: () => onChainFocusChange(lane.chain.id), children: ["Chain ", lane.chain.id] }), _jsxs("p", { children: [lane.chain.residueCount, " residues"] }), _jsx("div", { className: "sequence-track-lane__ticks", children: lane.tickLabels.map((tick) => (_jsx("span", { children: tick }, `${lane.chain.id}:${tick}`))) })] }), _jsx("div", { className: "sequence-track", children: lane.items.map((item) => (_jsxs(Button, { type: "button", variant: "ghost", size: "sm", className: [
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
                                                    .join(' '), title: `${item.label} · residues ${item.caption}`, onMouseEnter: () => onResidueHover?.(item.selection), onMouseLeave: () => onResidueHover?.(null), onClick: () => onResidueSelect?.(item.selection), children: [_jsx("span", { children: item.label }), _jsx("small", { children: item.caption }), item.hasVariant ? _jsx("i", { className: "sequence-track__variant-dot", "aria-hidden": "true" }) : null] }, item.id))) })] }, lane.chain.id))) }) })] })] }) }));
}
