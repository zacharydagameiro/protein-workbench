const residueToneClass = (residueCode) => {
    if ('DE'.includes(residueCode)) {
        return 'sequence-track__item--acidic';
    }
    if ('KRH'.includes(residueCode)) {
        return 'sequence-track__item--basic';
    }
    if ('STNQ'.includes(residueCode)) {
        return 'sequence-track__item--polar';
    }
    if ('FWY'.includes(residueCode)) {
        return 'sequence-track__item--aromatic';
    }
    return 'sequence-track__item--hydrophobic';
};
const selectionForResidue = (chainId, residue) => ({
    residueId: residue.id,
    chainId,
    residueNumber: residue.residueNumber,
    residueName: residue.residueName,
});
const residueMatchesSelection = (residue, selection) => Boolean(selection &&
    (selection.residueId === residue.id ||
        (selection.chainId === residue.chainId && selection.residueNumber === residue.residueNumber)));
const residueMatchesTarget = (chain, residue, structureLevel, activeTarget) => {
    if (activeTarget?.kind === 'residue') {
        return activeTarget.residue.residueId === residue.id;
    }
    if (activeTarget?.kind === 'variant') {
        return activeTarget.variant.chainId === residue.chainId && activeTarget.variant.residueNumber === residue.residueNumber;
    }
    if (activeTarget?.kind === 'region') {
        return (activeTarget.region.chainId === residue.chainId &&
            residue.residueNumber >= activeTarget.region.startResidue &&
            residue.residueNumber <= activeTarget.region.endResidue);
    }
    if (activeTarget?.kind === 'chain') {
        return activeTarget.chainId === residue.chainId;
    }
    if (structureLevel === 'primary') {
        return true;
    }
    if (structureLevel === 'secondary') {
        return residue.secondaryStructure !== 'loop';
    }
    if (structureLevel === 'tertiary' || structureLevel === 'quaternary') {
        return chain.id === residue.chainId;
    }
    return false;
};
export const getSequenceHighlightRange = (target) => {
    if (!target) {
        return null;
    }
    if (target.kind === 'region') {
        return {
            chainId: target.region.chainId,
            startResidue: target.region.startResidue,
            endResidue: target.region.endResidue,
            source: 'region',
        };
    }
    if (target.kind === 'variant') {
        return {
            chainId: target.variant.chainId,
            startResidue: target.variant.residueNumber,
            endResidue: target.variant.residueNumber,
            source: 'variant',
        };
    }
    if (target.kind === 'residue') {
        return {
            chainId: target.residue.chainId,
            startResidue: target.residue.residueNumber,
            endResidue: target.residue.residueNumber,
            source: 'selection',
        };
    }
    return null;
};
const buildTickLabels = (chain) => {
    const firstResidue = chain.residues[0]?.residueNumber ?? 1;
    const lastResidue = chain.residues[chain.residues.length - 1]?.residueNumber ?? chain.residueCount;
    if (chain.residueCount <= 2) {
        return [firstResidue, lastResidue];
    }
    const midpoint = Math.round((firstResidue + lastResidue) / 2);
    return [firstResidue, midpoint, lastResidue];
};
const buildTrackItems = ({ chain, density, structureLevel, activeTarget, selectedResidue, hoveredResidue, focusedResidueId, highlightedRange, variants, }) => {
    const groupSize = density === 'overview' && chain.residueCount >= 18 ? 6 : 1;
    const items = [];
    for (let index = 0; index < chain.residues.length; index += groupSize) {
        const residues = chain.residues.slice(index, index + groupSize);
        const first = residues[0];
        const last = residues[residues.length - 1];
        const focusResidue = residues.find((residue) => residue.id === selectedResidue?.residueId) ??
            residues.find((residue) => residue.id === hoveredResidue?.residueId) ??
            residues[0];
        const selection = selectionForResidue(chain.id, focusResidue);
        const hasVariant = variants.some((variant) => variant.chainId === chain.id &&
            variant.residueNumber >= first.residueNumber &&
            variant.residueNumber <= last.residueNumber);
        items.push({
            id: `${chain.id}:${first.residueNumber}-${last.residueNumber}`,
            kind: residues.length === 1 ? 'residue' : 'block',
            chainId: chain.id,
            startResidue: first.residueNumber,
            endResidue: last.residueNumber,
            label: residues.length === 1 ? first.residueCode : `${first.residueCode}-${last.residueCode}`,
            caption: residues.length === 1 ? `${first.residueNumber}` : `${first.residueNumber}-${last.residueNumber}`,
            residueCodes: residues.map((residue) => residue.residueCode).join(''),
            toneClass: residueToneClass(focusResidue.residueCode),
            isSelected: residues.some((residue) => residueMatchesSelection(residue, selectedResidue)),
            isHovered: residues.some((residue) => residueMatchesSelection(residue, hoveredResidue)),
            isTargeted: residues.some((residue) => residueMatchesTarget(chain, residue, structureLevel, activeTarget)),
            isFocused: residues.some((residue) => residue.id === focusedResidueId || `${residue.chainId}:${residue.residueNumber}:` === focusedResidueId),
            isInHighlightRange: Boolean(highlightedRange &&
                highlightedRange.chainId === chain.id &&
                first.residueNumber <= highlightedRange.endResidue &&
                last.residueNumber >= highlightedRange.startResidue),
            hasVariant,
            selection,
        });
    }
    return items;
};
export const buildVisibleSequenceLanes = ({ protein, chainFilter, sequenceState, structureLevel, activeTarget, selectedResidue, hoveredResidue, }) => {
    const visibleChains = chainFilter === 'all' ? protein.chains : protein.chains.filter((chain) => chain.id === chainFilter);
    return visibleChains.map((chain) => ({
        chain,
        isActive: sequenceState.activeChainId === chain.id || (sequenceState.activeChainId === 'all' && visibleChains.length === 1),
        tickLabels: buildTickLabels(chain),
        items: buildTrackItems({
            chain,
            density: sequenceState.density,
            structureLevel,
            activeTarget,
            selectedResidue,
            hoveredResidue,
            focusedResidueId: sequenceState.focusedResidueId,
            highlightedRange: sequenceState.highlightedRange,
            variants: protein.variants,
        }),
    }));
};
export const findResidueById = (protein, residueId) => protein.chains
    .flatMap((chain) => chain.residues)
    .find((residue) => residue.id === residueId || `${residue.chainId}:${residue.residueNumber}:` === residueId) ?? null;
export const findRegionsForResidue = (regions, chainId, residueNumber) => regions.filter((region) => region.chainId === chainId && residueNumber >= region.startResidue && residueNumber <= region.endResidue);
export const findVariantForResidue = (variants, chainId, residueNumber) => variants.find((variant) => variant.chainId === chainId && variant.residueNumber === residueNumber) ?? null;
