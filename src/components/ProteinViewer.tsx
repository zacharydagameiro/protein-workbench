import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { Canvas, type ThreeEvent, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { AxesHelper, Vector3 } from 'three';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import BackboneView from './BackboneView.js';
import CartoonView from './CartoonView.js';
import { Button } from './ui/button.js';
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from './ui/context-menu.js';
import type { Atom, Protein, StructureLevel, ViewerMode, ViewerSceneSettings, ViewerSelection, ViewerTarget } from '../types/structure.js';
import {
  getFittedCameraDistance,
  getStructureBounds,
} from '../utils/viewerScene.js';

interface ProteinViewerProps {
  protein: Protein | null;
  chainFilter: string[];
  viewMode: ViewerMode;
  showAxes: boolean;
  sceneSettings: ViewerSceneSettings;
  fitViewNonce: number;
  onViewModeChange?: (mode: ViewerMode) => void;
  onShowAxesChange?: (showAxes: boolean) => void;
  onSceneSettingsChange: (settings: ViewerSceneSettings | ((current: ViewerSceneSettings) => ViewerSceneSettings)) => void;
  structureLevel: StructureLevel;
  activeTarget?: ViewerTarget | null;
  selectedResidue?: ViewerSelection | null;
  hoveredResidue?: ViewerSelection | null;
  onResidueHover?: (residue: ViewerSelection | null) => void;
  onResidueSelect?: (residue: ViewerSelection) => void;
  onResetFocus?: () => void;
}

interface Bond {
  id: string;
  points: Float32Array;
}

type CameraControlsHandle = OrbitControlsImpl;

const chainPalette = ['#67e8f9', '#c084fc', '#fbbf24', '#fb7185', '#34d399'];

const elementColor = (element: Atom['element']): string => {
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

const residueIdForAtom = (atom: Atom): string =>
  `${atom.chainId ?? 'A'}:${atom.residueNumber ?? 0}:${atom.insertionCode ?? ''}`;

const selectionForAtom = (atom: Atom): ViewerSelection => ({
  residueId: residueIdForAtom(atom),
  chainId: atom.chainId ?? 'A',
  residueNumber: atom.residueNumber ?? 0,
  residueName: atom.residueName ?? 'UNK',
});

const distance = (left: Atom, right: Atom): number =>
  Math.sqrt((left.x - right.x) ** 2 + (left.y - right.y) ** 2 + (left.z - right.z) ** 2);

const chainColor = (chainId: string): string => chainPalette[chainId.charCodeAt(0) % chainPalette.length];
const defaultCameraDirection = new THREE.Vector3(0.78, 0.34, 1).normalize();

function AtomBond({ bond }: { bond: Bond }) {
  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[bond.points, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#475569" transparent opacity={0.6} />
    </line>
  );
}

function residueMatchesTarget(protein: Protein, atom: Atom, structureLevel: StructureLevel, activeTarget?: ViewerTarget | null): boolean {
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

function AtomMesh({
  protein,
  atom,
  structureLevel,
  activeTarget,
  selectedResidue,
  hoveredResidue,
  isEmphasizedChain,
  hoverEnabled,
  onResidueHover,
  onResidueSelect,
}: {
  protein: Protein;
  atom: Atom;
  structureLevel: StructureLevel;
  activeTarget?: ViewerTarget | null;
  selectedResidue?: ViewerSelection | null;
  hoveredResidue?: ViewerSelection | null;
  isEmphasizedChain: boolean;
  hoverEnabled: boolean;
  onResidueHover?: (residue: ViewerSelection | null) => void;
  onResidueSelect?: (residue: ViewerSelection) => void;
}) {
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
  const baseOpacity = isEmphasizedChain ? (activeTarget ? 0.24 : 0.92) : 0.08;

  return (
      <mesh
      position={[atom.x, atom.y, atom.z]}
      scale={isSelected ? 1.4 : isHovered ? 1.15 : isTargeted ? 1.08 : 1}
      onPointerEnter={() => {
        if (hoverEnabled) {
          onResidueHover?.(selection);
        }
      }}
      onPointerLeave={() => {
        if (hoverEnabled) {
          onResidueHover?.(null);
        }
      }}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onResidueSelect?.(selection);
      }}
    >
      <sphereGeometry args={[0.22, 20, 20]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={isSelected || isHovered || isTargeted ? 0.35 : 0.08}
        transparent
        opacity={isSelected || isHovered || isTargeted ? 1 : baseOpacity}
      />
    </mesh>
  );
}

function MiniAxis({ camera }: { camera: THREE.Camera }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) {
      return;
    }

    groupRef.current.quaternion.copy(camera.quaternion.clone().invert());
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0.38, 0, 0]}>
        <boxGeometry args={[0.76, 0.04, 0.04]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[0.04, 0.76, 0.04]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
      <mesh position={[0, 0, 0.38]}>
        <boxGeometry args={[0.04, 0.04, 0.76]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <Text position={[0.92, 0, 0]} fontSize={0.18} color="#fecaca" anchorX="center" anchorY="middle">
        X
      </Text>
      <Text position={[0, 0.92, 0]} fontSize={0.18} color="#bbf7d0" anchorX="center" anchorY="middle">
        Y
      </Text>
      <Text position={[0, 0, 0.92]} fontSize={0.18} color="#bfdbfe" anchorX="center" anchorY="middle">
        Z
      </Text>
    </group>
  );
}

function SceneGrid({ size, y }: { size: number; y: number }) {
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

  return <primitive object={helper} />;
}

function SceneAxes({ size }: { size: number }) {
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

  return <primitive object={helper} />;
}

function IdleCameraAnimation({
  controlsRef,
  lastInteractionRef,
  autoOrbitingRef,
  autoOrbiting,
  setAutoOrbiting,
}: {
  controlsRef: MutableRefObject<CameraControlsHandle | null>;
  lastInteractionRef: MutableRefObject<number>;
  autoOrbitingRef: MutableRefObject<boolean>;
  autoOrbiting: boolean;
  setAutoOrbiting: Dispatch<SetStateAction<boolean>>;
}) {
  const baselineHeightRef = useRef<number | null>(null);

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

function ProteinScene({
  protein,
  emphasizedChainIds,
  viewMode,
  showAxes,
  showGrid,
  structureLevel,
  activeTarget,
  selectedResidue,
  hoveredResidue,
  hoverEnabled,
  onResidueHover,
  onResidueSelect,
}: {
  protein: Protein;
  emphasizedChainIds: Set<string>;
  viewMode: ViewerMode;
  showAxes: boolean;
  showGrid: boolean;
  structureLevel: StructureLevel;
  activeTarget?: ViewerTarget | null;
  selectedResidue?: ViewerSelection | null;
  hoveredResidue?: ViewerSelection | null;
  hoverEnabled: boolean;
  onResidueHover?: (residue: ViewerSelection | null) => void;
  onResidueSelect?: (residue: ViewerSelection) => void;
}) {
  const filteredAtoms = useMemo(
    () => protein.atoms,
    [protein.atoms],
  );

  const center = useMemo(() => {
    if (filteredAtoms.length === 0) {
      return new Vector3();
    }

    const sum = filteredAtoms.reduce(
      (accumulator, atom) => accumulator.add(new Vector3(atom.x, atom.y, atom.z)),
      new Vector3(),
    );

    return sum.divideScalar(filteredAtoms.length);
  }, [filteredAtoms]);

  const bonds = useMemo(() => {
    if (viewMode !== 'atoms') {
      return [];
    }

    const sample = filteredAtoms.length > 400 ? filteredAtoms.filter((_, index) => index % 2 === 0) : filteredAtoms;
    const nextBonds: Bond[] = [];

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

  return (
    <group position={[-center.x, -center.y, -center.z]}>
      <ambientLight intensity={0.42} />
      <hemisphereLight args={['#cfe8ff', '#081220', 0.38]} />
      <directionalLight position={[10, 9, 8]} intensity={0.95} color="#dbeafe" />
      <directionalLight position={[-8, 2, 6]} intensity={0.4} color="#93c5fd" />
      <pointLight position={[0, 8, -10]} intensity={0.25} color="#7dd3fc" />

      {showGrid ? <SceneGrid size={gridSize} y={gridY} /> : null}
      {showAxes ? <SceneAxes size={Math.max(bounds.maxDimension * 0.45, 7)} /> : null}

      {viewMode === 'atoms'
        ? (
            <>
              {bonds.map((bond) => (
                <AtomBond key={bond.id} bond={bond} />
              ))}
              {filteredAtoms.map((atom) => (
                <AtomMesh
                  key={atom.id}
                  protein={protein}
                  atom={atom}
                  structureLevel={structureLevel}
                  activeTarget={activeTarget}
                  selectedResidue={selectedResidue}
                  hoveredResidue={hoveredResidue}
                  isEmphasizedChain={emphasizedChainIds.has(atom.chainId ?? 'A')}
                  hoverEnabled={hoverEnabled}
                  onResidueHover={onResidueHover}
                  onResidueSelect={onResidueSelect}
                />
              ))}
            </>
          )
        : null}

      {viewMode === 'backbone' ? (
        <BackboneView
          protein={protein}
          emphasizedChainIds={emphasizedChainIds}
          structureLevel={structureLevel}
          activeTarget={activeTarget}
          selectedResidue={selectedResidue}
          hoveredResidue={hoveredResidue}
          hoverEnabled={hoverEnabled}
          onResidueHover={onResidueHover}
          onResidueSelect={onResidueSelect}
        />
      ) : null}

      {viewMode === 'cartoon' ? <CartoonView protein={protein} emphasizedChainIds={emphasizedChainIds} /> : null}
    </group>
  );
}

export function ProteinViewer({
  protein,
  chainFilter,
  viewMode,
  showAxes,
  sceneSettings,
  fitViewNonce,
  onViewModeChange,
  onShowAxesChange,
  onSceneSettingsChange,
  structureLevel,
  activeTarget,
  selectedResidue,
  hoveredResidue,
  onResidueHover,
  onResidueSelect,
  onResetFocus,
}: ProteinViewerProps) {
  const [axisCamera, setAxisCamera] = useState<THREE.Camera | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [autoOrbiting, setAutoOrbiting] = useState(false);
  const [interactionLocked, setInteractionLocked] = useState(false);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const controlsRef = useRef<CameraControlsHandle | null>(null);
  const lastInteractionRef = useRef<number>(0);
  const autoOrbitingRef = useRef(false);
  const interactionReleaseTimeoutRef = useRef<number | null>(null);
  const emphasizedChainIds = useMemo(
    () => new Set(chainFilter.length === 0 ? protein?.chains.map((chain) => chain.id) ?? [] : chainFilter),
    [chainFilter, protein],
  );
  const visibleAtoms = useMemo(
    () => protein?.atoms ?? [],
    [protein?.atoms],
  );
  const bounds = useMemo(() => getStructureBounds(visibleAtoms), [visibleAtoms]);

  const markInteractionRefs = () => {
    autoOrbitingRef.current = false;
    if (controlsRef.current) {
      controlsRef.current.autoRotate = false;
    }
    lastInteractionRef.current = performance.now();
  };

  const markInteraction = () => {
    markInteractionRefs();
    setAutoOrbiting(false);
  };

  const clearInteractionReleaseTimeout = () => {
    if (interactionReleaseTimeoutRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(interactionReleaseTimeoutRef.current);
      interactionReleaseTimeoutRef.current = null;
    }
  };

  const beginInteractionLock = () => {
    clearInteractionReleaseTimeout();
    setInteractionLocked(true);
    onResidueHover?.(null);
    markInteraction();
  };

  const endInteractionLock = () => {
    clearInteractionReleaseTimeout();
    if (typeof window === 'undefined') {
      setInteractionLocked(false);
      return;
    }

    interactionReleaseTimeoutRef.current = window.setTimeout(() => {
      setInteractionLocked(false);
      interactionReleaseTimeoutRef.current = null;
    }, 160);
  };

  useEffect(() => {
    lastInteractionRef.current = performance.now();
  }, []);

  useEffect(() => {
    onResidueHover?.(null);
  }, [chainFilter, onResidueHover, protein?.id, viewMode]);

  useEffect(
    () => () => {
      clearInteractionReleaseTimeout();
    },
    [],
  );

  useEffect(() => {
    autoOrbitingRef.current = autoOrbiting;
  }, [autoOrbiting]);

  useEffect(() => {
    markInteractionRefs();
  }, [activeTarget, chainFilter, protein?.id, selectedResidue?.residueId, showAxes, structureLevel, viewMode]);

  const positionCameraToStructure = useCallback(() => {
    const controls = controlsRef.current;
    const perspectiveCamera = cameraRef.current as THREE.PerspectiveCamera | null;
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
  }, [bounds]);

  const fitViewToStructure = () => {
    positionCameraToStructure();
    markInteraction();
  };

  useEffect(() => {
    if (!protein || !cameraReady || !controlsRef.current || visibleAtoms.length === 0) {
      return;
    }

    positionCameraToStructure();
    markInteractionRefs();
  }, [cameraReady, chainFilter, fitViewNonce, positionCameraToStructure, protein, viewMode, visibleAtoms.length]);

  if (!protein) {
    return <div className="viewer-empty">Select a structure to inspect its chains, residues, and guided explanations.</div>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="viewer-shell"
          data-viewer-context-menu="enabled"
          onPointerMove={markInteraction}
        >
          <Canvas
            camera={{ position: [0, 0, 16], fov: 40 }}
            onCreated={(state) => {
              cameraRef.current = state.camera;
              setAxisCamera(state.camera);
              setCameraReady(true);
            }}
          >
            <color attach="background" args={['#091223']} />
            {sceneSettings.showFog ? <fog attach="fog" args={['#0b1424', Math.max(bounds.radius * 2.2, 12), Math.max(bounds.radius * 5.2, 30)]} /> : null}
            <Suspense fallback={null}>
              <ProteinScene
                protein={protein}
                emphasizedChainIds={emphasizedChainIds}
                viewMode={viewMode}
                showAxes={showAxes}
                showGrid={sceneSettings.showGrid}
                structureLevel={structureLevel}
                activeTarget={activeTarget}
                selectedResidue={selectedResidue}
                hoveredResidue={interactionLocked ? null : hoveredResidue}
                hoverEnabled={!interactionLocked}
                onResidueHover={onResidueHover}
                onResidueSelect={onResidueSelect}
              />
              <IdleCameraAnimation
                controlsRef={controlsRef}
                lastInteractionRef={lastInteractionRef}
                autoOrbitingRef={autoOrbitingRef}
                autoOrbiting={autoOrbiting}
                setAutoOrbiting={setAutoOrbiting}
              />
              <OrbitControls
                ref={controlsRef}
                enablePan
                enableRotate
                enableZoom
                onStart={beginInteractionLock}
                onChange={() => {
                  if (!autoOrbitingRef.current) {
                    markInteraction();
                  }
                }}
                onEnd={endInteractionLock}
                touches={{
                  ONE: THREE.TOUCH.ROTATE,
                  TWO: THREE.TOUCH.DOLLY_ROTATE,
                }}
              />
            </Suspense>
          </Canvas>

          <div className="viewer-level-chip viewer-level-chip--compact">{structureLevel}</div>

          <div className="viewer-hud viewer-hud--top-right">
            <div className="viewer-axis" aria-label="Orientation gizmo showing X Y Z axes">
              <span className="sr-only">Orientation gizmo X Y Z</span>
              <Canvas orthographic camera={{ position: [0, 0, 4], zoom: 80 }}>
                <ambientLight intensity={0.6} />
                <directionalLight position={[1, 1, 2]} intensity={0.9} />
                {axisCamera ? <MiniAxis camera={axisCamera} /> : null}
              </Canvas>
            </div>
            <Button variant="outline" size="sm" className="viewer-hud__button" onClick={fitViewToStructure}>
              Fit view
            </Button>
          </div>

          {!interactionLocked && hoveredResidue ? (
            <div className="viewer-tooltip">
              <strong>
                {hoveredResidue.residueName} {hoveredResidue.residueNumber}
              </strong>
              <span>Chain {hoveredResidue.chainId}</span>
            </div>
          ) : null}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56 rounded-xl">
        <ContextMenuItem onSelect={fitViewToStructure}>Fit view</ContextMenuItem>
        <ContextMenuItem onSelect={() => onResetFocus?.()} disabled={!onResetFocus}>
          Reset focus
        </ContextMenuItem>

        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>Representation</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44 rounded-xl">
            <ContextMenuRadioGroup value={viewMode} onValueChange={(value) => onViewModeChange?.(value as ViewerMode)}>
              <ContextMenuRadioItem value="atoms">Atoms</ContextMenuRadioItem>
              <ContextMenuRadioItem value="backbone">Backbone</ContextMenuRadioItem>
              <ContextMenuRadioItem value="cartoon">Cartoon</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />
        <ContextMenuCheckboxItem checked={showAxes} onCheckedChange={(checked) => onShowAxesChange?.(Boolean(checked))}>
          Axes
        </ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem
          checked={sceneSettings.showGrid}
          onCheckedChange={(checked) =>
            onSceneSettingsChange((current) => ({
              ...current,
              showGrid: Boolean(checked),
            }))
          }
        >
          Grid
        </ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem
          checked={sceneSettings.showFog}
          onCheckedChange={(checked) =>
            onSceneSettingsChange((current) => ({
              ...current,
              showFog: Boolean(checked),
            }))
          }
        >
          Fog
        </ContextMenuCheckboxItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
