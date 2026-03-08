import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { AxesHelper, Vector3 } from 'three';
import * as THREE from 'three';
import BackboneView from './BackboneView.js';
import CartoonView from './CartoonView.js';
import { Button } from './ui/button.js';
import { ContextMenu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger, } from './ui/context-menu.js';
import { getBoundsSizeLabel, getFittedCameraDistance, getScaleBarDisplay, getStructureBounds, } from '../utils/viewerScene.js';
const chainPalette = ['#67e8f9', '#c084fc', '#fbbf24', '#fb7185', '#34d399'];
const elementColor = (element) => {
    switch (element) {
        case 'N':
            return '#38bdf8';
        case 'O':
            return '#f87171';
        case 'S':
            return '#facc15';
        case 'P':
            return '#f97316';
        case 'H':
            return '#e2e8f0';
        default:
            return '#a3e635';
    }
};
const residueIdForAtom = (atom) => `${atom.chainId ?? 'A'}:${atom.residueNumber ?? 0}:${atom.insertionCode ?? ''}`;
const selectionForAtom = (atom) => ({
    residueId: residueIdForAtom(atom),
    chainId: atom.chainId ?? 'A',
    residueNumber: atom.residueNumber ?? 0,
    residueName: atom.residueName ?? 'UNK',
});
const distance = (left, right) => Math.sqrt((left.x - right.x) ** 2 + (left.y - right.y) ** 2 + (left.z - right.z) ** 2);
const chainColor = (chainId) => chainPalette[chainId.charCodeAt(0) % chainPalette.length];
const defaultCameraDirection = new THREE.Vector3(0.78, 0.34, 1).normalize();
function AtomBond({ bond }) {
    return (_jsxs("line", { children: [_jsx("bufferGeometry", { children: _jsx("bufferAttribute", { attach: "attributes-position", args: [bond.points, 3] }) }), _jsx("lineBasicMaterial", { color: "#475569", transparent: true, opacity: 0.6 })] }));
}
function residueMatchesTarget(protein, atom, structureLevel, activeTarget) {
    const chainId = atom.chainId ?? 'A';
    const residueNumber = atom.residueNumber ?? 0;
    if (activeTarget?.kind === 'residue') {
        return residueIdForAtom(atom) === activeTarget.residue.residueId;
    }
    if (activeTarget?.kind === 'variant') {
        return activeTarget.variant.chainId === chainId && activeTarget.variant.residueNumber === residueNumber;
    }
    if (activeTarget?.kind === 'region') {
        return activeTarget.region.chainId === chainId && residueNumber >= activeTarget.region.startResidue && residueNumber <= activeTarget.region.endResidue;
    }
    if (activeTarget?.kind === 'chain') {
        return activeTarget.chainId === chainId;
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
}
function AtomMesh({ protein, atom, structureLevel, activeTarget, selectedResidue, hoveredResidue, onResidueHover, onResidueSelect, }) {
    const selection = selectionForAtom(atom);
    const isSelected = selectedResidue?.residueId === selection.residueId;
    const isHovered = hoveredResidue?.residueId === selection.residueId;
    const isTargeted = residueMatchesTarget(protein, atom, structureLevel, activeTarget);
    const emphasizeChains = activeTarget?.kind === 'chain' || structureLevel === 'quaternary';
    const color = isSelected
        ? '#facc15'
        : isHovered
            ? '#fb923c'
            : isTargeted
                ? '#67e8f9'
                : emphasizeChains
                    ? chainColor(atom.chainId ?? 'A')
                    : elementColor(atom.element);
    return (_jsxs("mesh", { position: [atom.x, atom.y, atom.z], scale: isSelected ? 1.4 : isHovered ? 1.15 : isTargeted ? 1.08 : 1, onPointerEnter: () => onResidueHover?.(selection), onPointerLeave: () => onResidueHover?.(null), onClick: (event) => {
            event.stopPropagation();
            onResidueSelect?.(selection);
        }, children: [_jsx("sphereGeometry", { args: [0.22, 20, 20] }), _jsx("meshStandardMaterial", { color: color, emissive: color, emissiveIntensity: isSelected || isHovered || isTargeted ? 0.35 : 0.08, transparent: true, opacity: isSelected || isHovered || isTargeted ? 1 : activeTarget ? 0.24 : 0.92 })] }));
}
function MiniAxis({ camera }) {
    const groupRef = useRef(null);
    useFrame(() => {
        if (!groupRef.current) {
            return;
        }
        groupRef.current.quaternion.copy(camera.quaternion.clone().invert());
    });
    return (_jsxs("group", { ref: groupRef, children: [_jsxs("mesh", { position: [0.38, 0, 0], children: [_jsx("boxGeometry", { args: [0.76, 0.04, 0.04] }), _jsx("meshStandardMaterial", { color: "#ef4444" })] }), _jsxs("mesh", { position: [0, 0.38, 0], children: [_jsx("boxGeometry", { args: [0.04, 0.76, 0.04] }), _jsx("meshStandardMaterial", { color: "#22c55e" })] }), _jsxs("mesh", { position: [0, 0, 0.38], children: [_jsx("boxGeometry", { args: [0.04, 0.04, 0.76] }), _jsx("meshStandardMaterial", { color: "#3b82f6" })] }), _jsxs("mesh", { children: [_jsx("sphereGeometry", { args: [0.08, 12, 12] }), _jsx("meshStandardMaterial", { color: "#f8fafc" })] }), _jsx(Text, { position: [0.92, 0, 0], fontSize: 0.18, color: "#fecaca", anchorX: "center", anchorY: "middle", children: "X" }), _jsx(Text, { position: [0, 0.92, 0], fontSize: 0.18, color: "#bbf7d0", anchorX: "center", anchorY: "middle", children: "Y" }), _jsx(Text, { position: [0, 0, 0.92], fontSize: 0.18, color: "#bfdbfe", anchorX: "center", anchorY: "middle", children: "Z" })] }));
}
function SceneGrid({ size, y }) {
    const helper = useMemo(() => {
        const grid = new THREE.GridHelper(size, 24, '#3b82f6', '#1e3a5f');
        const material = Array.isArray(grid.material) ? grid.material : [grid.material];
        material.forEach((entry) => {
            entry.transparent = true;
            entry.opacity = 0.18;
        });
        grid.position.set(0, y, 0);
        return grid;
    }, [size, y]);
    useEffect(() => () => helper.dispose(), [helper]);
    return _jsx("primitive", { object: helper });
}
function SceneAxes({ size }) {
    const helper = useMemo(() => {
        const axes = new AxesHelper(size);
        const material = Array.isArray(axes.material) ? axes.material : [axes.material];
        material.forEach((entry) => {
            entry.transparent = true;
            entry.opacity = 0.42;
            entry.depthWrite = false;
        });
        return axes;
    }, [size]);
    useEffect(() => () => helper.dispose(), [helper]);
    return _jsx("primitive", { object: helper });
}
function IdleCameraAnimation({ controlsRef, lastInteractionRef, autoOrbitingRef, autoOrbiting, setAutoOrbiting, }) {
    const baselineHeightRef = useRef(null);
    useFrame((state) => {
        const controls = controlsRef.current;
        if (!controls) {
            return;
        }
        const idleForMs = performance.now() - lastInteractionRef.current;
        const shouldAutoOrbit = idleForMs >= 10_000;
        if (!shouldAutoOrbit) {
            controls.autoRotate = false;
            if (autoOrbiting) {
                autoOrbitingRef.current = false;
                setAutoOrbiting(false);
            }
            baselineHeightRef.current = null;
            return;
        }
        if (!autoOrbiting) {
            const offset = controls.object.position.clone().sub(controls.target);
            autoOrbitingRef.current = true;
            baselineHeightRef.current = offset.y;
            setAutoOrbiting(true);
        }
        const baselineHeight = baselineHeightRef.current ?? 0;
        const elapsed = state.clock.getElapsedTime();
        const verticalOffset = baselineHeight + Math.sin(elapsed * 0.45) * 0.55;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.75;
        controls.object.position.y = THREE.MathUtils.lerp(controls.object.position.y, verticalOffset, 0.02);
        controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.08);
        controls.update();
    });
    return null;
}
function ProteinScene({ protein, visibleChainIds, viewMode, showAxes, showGrid, structureLevel, activeTarget, selectedResidue, hoveredResidue, onResidueHover, onResidueSelect, }) {
    const filteredAtoms = useMemo(() => protein.atoms.filter((atom) => visibleChainIds.has(atom.chainId ?? 'A')), [protein.atoms, visibleChainIds]);
    const center = useMemo(() => {
        if (filteredAtoms.length === 0) {
            return new Vector3();
        }
        const sum = filteredAtoms.reduce((accumulator, atom) => accumulator.add(new Vector3(atom.x, atom.y, atom.z)), new Vector3());
        return sum.divideScalar(filteredAtoms.length);
    }, [filteredAtoms]);
    const bonds = useMemo(() => {
        if (viewMode !== 'atoms') {
            return [];
        }
        const sample = filteredAtoms.length > 400 ? filteredAtoms.filter((_, index) => index % 2 === 0) : filteredAtoms;
        const nextBonds = [];
        for (let index = 0; index < sample.length; index += 1) {
            for (let compareIndex = index + 1; compareIndex < sample.length; compareIndex += 1) {
                const left = sample[index];
                const right = sample[compareIndex];
                if (distance(left, right) > 2.1) {
                    continue;
                }
                nextBonds.push({
                    id: `${left.id}:${right.id}`,
                    points: new Float32Array([left.x, left.y, left.z, right.x, right.y, right.z]),
                });
            }
        }
        return nextBonds;
    }, [filteredAtoms, viewMode]);
    const bounds = useMemo(() => getStructureBounds(filteredAtoms), [filteredAtoms]);
    const gridSize = Math.max(Math.ceil(bounds.maxDimension * 2.2), 16);
    const gridY = -(bounds.size.y / 2) - 1.2;
    return (_jsxs("group", { position: [-center.x, -center.y, -center.z], children: [_jsx("ambientLight", { intensity: 0.42 }), _jsx("hemisphereLight", { args: ['#cfe8ff', '#081220', 0.38] }), _jsx("directionalLight", { position: [10, 9, 8], intensity: 0.95, color: "#dbeafe" }), _jsx("directionalLight", { position: [-8, 2, 6], intensity: 0.4, color: "#93c5fd" }), _jsx("pointLight", { position: [0, 8, -10], intensity: 0.25, color: "#7dd3fc" }), showGrid ? _jsx(SceneGrid, { size: gridSize, y: gridY }) : null, showAxes ? _jsx(SceneAxes, { size: Math.max(bounds.maxDimension * 0.45, 7) }) : null, viewMode === 'atoms'
                ? (_jsxs(_Fragment, { children: [bonds.map((bond) => (_jsx(AtomBond, { bond: bond }, bond.id))), filteredAtoms.map((atom) => (_jsx(AtomMesh, { protein: protein, atom: atom, structureLevel: structureLevel, activeTarget: activeTarget, selectedResidue: selectedResidue, hoveredResidue: hoveredResidue, onResidueHover: onResidueHover, onResidueSelect: onResidueSelect }, atom.id)))] }))
                : null, viewMode === 'backbone' ? (_jsx(BackboneView, { protein: protein, visibleChainIds: visibleChainIds, structureLevel: structureLevel, activeTarget: activeTarget, selectedResidue: selectedResidue, hoveredResidue: hoveredResidue, onResidueHover: onResidueHover, onResidueSelect: onResidueSelect })) : null, viewMode === 'cartoon' ? _jsx(CartoonView, { protein: protein, visibleChainIds: visibleChainIds }) : null] }));
}
export function ProteinViewer({ protein, chainFilter, viewMode, showAxes, sceneSettings, fitViewNonce, onViewModeChange, onShowAxesChange, onSceneSettingsChange, structureLevel, activeTarget, selectedResidue, hoveredResidue, onResidueHover, onResidueSelect, onResetFocus, }) {
    const [camera, setCamera] = useState(null);
    const [autoOrbiting, setAutoOrbiting] = useState(false);
    const controlsRef = useRef(null);
    const lastInteractionRef = useRef(performance.now());
    const autoOrbitingRef = useRef(false);
    const visibleChainIds = useMemo(() => new Set(chainFilter === 'all' ? protein?.chains.map((chain) => chain.id) ?? [] : [chainFilter]), [chainFilter, protein]);
    const visibleAtoms = useMemo(() => protein?.atoms.filter((atom) => visibleChainIds.has(atom.chainId ?? 'A')) ?? [], [protein?.atoms, visibleChainIds]);
    const bounds = useMemo(() => getStructureBounds(visibleAtoms), [visibleAtoms]);
    const scaleBar = useMemo(() => getScaleBarDisplay(bounds, sceneSettings.unitSystem), [bounds, sceneSettings.unitSystem]);
    const sizeLabel = useMemo(() => getBoundsSizeLabel(bounds, sceneSettings.unitSystem), [bounds, sceneSettings.unitSystem]);
    const markInteraction = () => {
        autoOrbitingRef.current = false;
        if (controlsRef.current) {
            controlsRef.current.autoRotate = false;
        }
        lastInteractionRef.current = performance.now();
        setAutoOrbiting(false);
    };
    useEffect(() => {
        onResidueHover?.(null);
    }, [chainFilter, onResidueHover, protein?.id, viewMode]);
    useEffect(() => {
        autoOrbitingRef.current = autoOrbiting;
    }, [autoOrbiting]);
    useEffect(() => {
        markInteraction();
    }, [activeTarget, chainFilter, protein?.id, selectedResidue?.residueId, showAxes, structureLevel, viewMode]);
    const fitViewToStructure = () => {
        const controls = controlsRef.current;
        const perspectiveCamera = camera;
        if (!controls || !perspectiveCamera) {
            return;
        }
        const distance = getFittedCameraDistance(bounds, perspectiveCamera.fov, perspectiveCamera.aspect, 1.25);
        const nextPosition = defaultCameraDirection.clone().multiplyScalar(distance);
        perspectiveCamera.position.copy(nextPosition);
        perspectiveCamera.near = Math.max(distance / 100, 0.1);
        perspectiveCamera.far = Math.max(distance * 10, 200);
        perspectiveCamera.updateProjectionMatrix();
        controls.target.set(0, 0, 0);
        controls.minDistance = Math.max(distance * 0.35, 4);
        controls.maxDistance = Math.max(distance * 4.5, 30);
        controls.update();
        markInteraction();
    };
    useEffect(() => {
        if (!protein || !camera || !controlsRef.current || visibleAtoms.length === 0) {
            return;
        }
        fitViewToStructure();
    }, [protein?.id, chainFilter, viewMode, fitViewNonce, camera, visibleAtoms.length]);
    if (!protein) {
        return _jsx("div", { className: "viewer-empty", children: "Select a structure to inspect its chains, residues, and guided explanations." });
    }
    return (_jsxs(ContextMenu, { children: [_jsx(ContextMenuTrigger, { asChild: true, children: _jsxs("div", { className: "viewer-shell", "data-viewer-context-menu": "enabled", onPointerMove: markInteraction, onPointerDown: markInteraction, onWheel: markInteraction, children: [_jsxs(Canvas, { camera: { position: [0, 0, 16], fov: 40 }, onCreated: (state) => setCamera(state.camera), children: [_jsx("color", { attach: "background", args: ['#091223'] }), sceneSettings.showFog ? _jsx("fog", { attach: "fog", args: ['#0b1424', Math.max(bounds.radius * 2.2, 12), Math.max(bounds.radius * 5.2, 30)] }) : null, _jsxs(Suspense, { fallback: null, children: [_jsx(ProteinScene, { protein: protein, visibleChainIds: visibleChainIds, viewMode: viewMode, showAxes: showAxes, showGrid: sceneSettings.showGrid, structureLevel: structureLevel, activeTarget: activeTarget, selectedResidue: selectedResidue, hoveredResidue: hoveredResidue, onResidueHover: onResidueHover, onResidueSelect: onResidueSelect }), _jsx(IdleCameraAnimation, { controlsRef: controlsRef, lastInteractionRef: lastInteractionRef, autoOrbitingRef: autoOrbitingRef, autoOrbiting: autoOrbiting, setAutoOrbiting: setAutoOrbiting }), _jsx(OrbitControls, { ref: controlsRef, enablePan: true, enableRotate: true, enableZoom: true, onStart: markInteraction, onChange: () => {
                                                if (!autoOrbitingRef.current) {
                                                    markInteraction();
                                                }
                                            }, onEnd: markInteraction, touches: {
                                                ONE: THREE.TOUCH.ROTATE,
                                                TWO: THREE.TOUCH.DOLLY_ROTATE,
                                            } })] })] }), _jsx("div", { className: "viewer-level-chip viewer-level-chip--compact", children: structureLevel }), _jsxs("div", { className: "viewer-hud viewer-hud--top-right", children: [_jsxs("div", { className: "viewer-axis", "aria-label": "Orientation gizmo showing X Y Z axes", children: [_jsx("span", { className: "sr-only", children: "Orientation gizmo X Y Z" }), _jsxs(Canvas, { orthographic: true, camera: { position: [0, 0, 4], zoom: 80 }, children: [_jsx("ambientLight", { intensity: 0.6 }), _jsx("directionalLight", { position: [1, 1, 2], intensity: 0.9 }), camera ? _jsx(MiniAxis, { camera: camera }) : null] })] }), _jsx(Button, { variant: "outline", size: "sm", className: "viewer-hud__button", onClick: fitViewToStructure, children: "Fit view" })] }), hoveredResidue ? (_jsxs("div", { className: "viewer-tooltip", children: [_jsxs("strong", { children: [hoveredResidue.residueName, " ", hoveredResidue.residueNumber] }), _jsxs("span", { children: ["Chain ", hoveredResidue.chainId] })] })) : null, _jsx("div", { className: "viewer-hud viewer-hud--bottom-left", children: _jsxs("div", { className: "viewer-scale-panel", children: [_jsxs("div", { className: "viewer-scale-panel__meta", children: [_jsx("span", { className: "viewer-scale-panel__title", children: "Scale" }), _jsx("span", { className: "viewer-scale-panel__size", children: sizeLabel })] }), _jsxs("div", { className: "viewer-scale-bar__row", children: [_jsx("div", { className: "viewer-scale-bar", children: _jsx("div", { className: "viewer-scale-bar__fill", style: { width: `${scaleBar.widthPercent}%` } }) }), _jsx("span", { className: "viewer-scale-bar__label", children: scaleBar.label })] })] }) })] }) }), _jsxs(ContextMenuContent, { className: "w-56 rounded-xl", children: [_jsx(ContextMenuItem, { onSelect: fitViewToStructure, children: "Fit view" }), _jsx(ContextMenuItem, { onSelect: () => onResetFocus?.(), disabled: !onResetFocus, children: "Reset focus" }), _jsx(ContextMenuSeparator, {}), _jsxs(ContextMenuSub, { children: [_jsx(ContextMenuSubTrigger, { children: "Representation" }), _jsx(ContextMenuSubContent, { className: "w-44 rounded-xl", children: _jsxs(ContextMenuRadioGroup, { value: viewMode, onValueChange: (value) => onViewModeChange?.(value), children: [_jsx(ContextMenuRadioItem, { value: "atoms", children: "Atoms" }), _jsx(ContextMenuRadioItem, { value: "backbone", children: "Backbone" }), _jsx(ContextMenuRadioItem, { value: "cartoon", children: "Cartoon" })] }) })] }), _jsxs(ContextMenuSub, { children: [_jsx(ContextMenuSubTrigger, { children: "Grid units" }), _jsx(ContextMenuSubContent, { className: "w-44 rounded-xl", children: _jsxs(ContextMenuRadioGroup, { value: sceneSettings.unitSystem, onValueChange: (value) => onSceneSettingsChange((current) => ({
                                        ...current,
                                        unitSystem: value,
                                    })), children: [_jsx(ContextMenuRadioItem, { value: "angstrom", children: "Angstrom (\u00C5)" }), _jsx(ContextMenuRadioItem, { value: "nanometer", children: "Nanometer (nm)" })] }) })] }), _jsx(ContextMenuSeparator, {}), _jsx(ContextMenuCheckboxItem, { checked: showAxes, onCheckedChange: (checked) => onShowAxesChange?.(Boolean(checked)), children: "Axes" }), _jsx(ContextMenuCheckboxItem, { checked: sceneSettings.showGrid, onCheckedChange: (checked) => onSceneSettingsChange((current) => ({
                            ...current,
                            showGrid: Boolean(checked),
                        })), children: "Grid" }), _jsx(ContextMenuCheckboxItem, { checked: sceneSettings.showFog, onCheckedChange: (checked) => onSceneSettingsChange((current) => ({
                            ...current,
                            showFog: Boolean(checked),
                        })), children: "Fog" })] })] }));
}
