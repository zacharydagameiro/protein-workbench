import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo } from 'react';
const chainPalette = ['#67e8f9', '#c084fc', '#fbbf24', '#fb7185', '#34d399'];
const residueIdForAtom = (atom) => `${atom.chainId ?? 'A'}:${atom.residueNumber ?? 0}:${atom.insertionCode ?? ''}`;
const chainColor = (chainId) => chainPalette[chainId.charCodeAt(0) % chainPalette.length];
const sortBackboneAtoms = (atoms) => [...atoms].sort((left, right) => {
    if ((left.chainId ?? 'A') !== (right.chainId ?? 'A')) {
        return (left.chainId ?? 'A').localeCompare(right.chainId ?? 'A');
    }
    if ((left.residueNumber ?? 0) !== (right.residueNumber ?? 0)) {
        return (left.residueNumber ?? 0) - (right.residueNumber ?? 0);
    }
    return (left.insertionCode ?? '').localeCompare(right.insertionCode ?? '');
});
const residueMatchesTarget = (protein, atom, structureLevel, target) => {
    const chainId = atom.chainId ?? 'A';
    const residueNumber = atom.residueNumber ?? 0;
    if (target?.kind === 'residue') {
        return residueIdForAtom(atom) === target.residue.residueId;
    }
    if (target?.kind === 'variant') {
        return target.variant.chainId === chainId && target.variant.residueNumber === residueNumber;
    }
    if (target?.kind === 'region') {
        return target.region.chainId === chainId && residueNumber >= target.region.startResidue && residueNumber <= target.region.endResidue;
    }
    if (target?.kind === 'chain') {
        return target.chainId === chainId;
    }
    const residue = protein.chains
        .find((chain) => chain.id === chainId)
        ?.residues.find((entry) => entry.residueNumber === residueNumber);
    if (!residue) {
        return false;
    }
    if (structureLevel === 'primary') {
        return true;
    }
    if (structureLevel === 'secondary') {
        return residue.secondaryStructure !== 'loop';
    }
    return true;
};
export default function BackboneView({ protein, visibleChainIds, structureLevel, activeTarget, selectedResidue, hoveredResidue, onResidueHover, onResidueSelect, }) {
    const backboneAtoms = useMemo(() => sortBackboneAtoms(protein.backboneAtoms.filter((atom) => visibleChainIds.has(atom.chainId ?? 'A'))), [protein.backboneAtoms, visibleChainIds]);
    return (_jsx(_Fragment, { children: backboneAtoms.map((atom, index) => {
            const selected = Boolean(selectedResidue && residueIdForAtom(atom) === selectedResidue.residueId);
            const hovered = Boolean(hoveredResidue && residueIdForAtom(atom) === hoveredResidue.residueId);
            const targeted = residueMatchesTarget(protein, atom, structureLevel, activeTarget);
            const emphasizeChains = activeTarget?.kind === 'chain' || structureLevel === 'quaternary';
            const baseColor = emphasizeChains ? chainColor(atom.chainId ?? 'A') : '#7dd3fc';
            const color = selected ? '#facc15' : hovered ? '#fb923c' : targeted ? '#67e8f9' : baseColor;
            const opacity = selected || hovered || targeted ? 1 : activeTarget ? 0.22 : 0.88;
            const scale = selected ? 1.55 : hovered ? 1.28 : targeted ? 1.16 : 1;
            const selection = {
                residueId: residueIdForAtom(atom),
                chainId: atom.chainId ?? 'A',
                residueNumber: atom.residueNumber ?? 0,
                residueName: atom.residueName ?? 'UNK',
            };
            const next = backboneAtoms[index + 1];
            const sameChain = next && (next.chainId ?? 'A') === (atom.chainId ?? 'A');
            const canConnect = sameChain &&
                next &&
                Math.abs((next.residueNumber ?? 0) - (atom.residueNumber ?? 0)) <= 2;
            return (_jsxs("group", { children: [_jsxs("mesh", { position: [atom.x, atom.y, atom.z], scale: scale, userData: { atom }, onPointerEnter: () => onResidueHover?.(selection), onPointerLeave: () => onResidueHover?.(null), onClick: (event) => {
                            event.stopPropagation();
                            onResidueSelect?.(selection);
                        }, children: [_jsx("sphereGeometry", { args: [0.28, 16, 16] }), _jsx("meshStandardMaterial", { color: color, emissive: color, emissiveIntensity: selected || hovered || targeted ? 0.45 : 0.08, transparent: true, opacity: opacity })] }), canConnect ? (_jsxs("line", { children: [_jsx("bufferGeometry", { children: _jsx("bufferAttribute", { attach: "attributes-position", args: [new Float32Array([atom.x, atom.y, atom.z, next.x, next.y, next.z]), 3] }) }), _jsx("lineBasicMaterial", { color: emphasizeChains ? chainColor(atom.chainId ?? 'A') : '#38bdf8', transparent: true, opacity: opacity })] })) : null] }, atom.id));
        }) }));
}
