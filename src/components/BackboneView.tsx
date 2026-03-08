import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Atom, Protein, StructureLevel, ViewerSelection, ViewerTarget } from '../types/structure.js';

interface BackboneViewProps {
  protein: Protein;
  visibleChainIds: Set<string>;
  structureLevel: StructureLevel;
  activeTarget?: ViewerTarget | null;
  selectedResidue?: ViewerSelection | null;
  hoveredResidue?: ViewerSelection | null;
  onResidueHover?: (residue: ViewerSelection | null) => void;
  onResidueSelect?: (residue: ViewerSelection) => void;
}

const chainPalette = ['#67e8f9', '#c084fc', '#fbbf24', '#fb7185', '#34d399'];

const residueIdForAtom = (atom: Atom): string =>
  `${atom.chainId ?? 'A'}:${atom.residueNumber ?? 0}:${atom.insertionCode ?? ''}`;

const chainColor = (chainId: string): string => chainPalette[chainId.charCodeAt(0) % chainPalette.length];

const sortBackboneAtoms = (atoms: Atom[]): Atom[] =>
  [...atoms].sort((left, right) => {
    if ((left.chainId ?? 'A') !== (right.chainId ?? 'A')) {
      return (left.chainId ?? 'A').localeCompare(right.chainId ?? 'A');
    }

    if ((left.residueNumber ?? 0) !== (right.residueNumber ?? 0)) {
      return (left.residueNumber ?? 0) - (right.residueNumber ?? 0);
    }

    return (left.insertionCode ?? '').localeCompare(right.insertionCode ?? '');
  });

const residueMatchesTarget = (protein: Protein, atom: Atom, structureLevel: StructureLevel, target?: ViewerTarget | null): boolean => {
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

export default function BackboneView({
  protein,
  visibleChainIds,
  structureLevel,
  activeTarget,
  selectedResidue,
  hoveredResidue,
  onResidueHover,
  onResidueSelect,
}: BackboneViewProps) {
  const backboneAtoms = useMemo(
    () => sortBackboneAtoms(protein.backboneAtoms.filter((atom) => visibleChainIds.has(atom.chainId ?? 'A'))),
    [protein.backboneAtoms, visibleChainIds],
  );

  return (
    <>
      {backboneAtoms.map((atom, index) => {
        const selected = Boolean(selectedResidue && residueIdForAtom(atom) === selectedResidue.residueId);
        const hovered = Boolean(hoveredResidue && residueIdForAtom(atom) === hoveredResidue.residueId);
        const targeted = residueMatchesTarget(protein, atom, structureLevel, activeTarget);
        const emphasizeChains = activeTarget?.kind === 'chain' || structureLevel === 'quaternary';
        const baseColor = emphasizeChains ? chainColor(atom.chainId ?? 'A') : '#7dd3fc';
        const color = selected ? '#facc15' : hovered ? '#fb923c' : targeted ? '#67e8f9' : baseColor;
        const opacity = selected || hovered || targeted ? 1 : activeTarget ? 0.22 : 0.88;
        const scale = selected ? 1.55 : hovered ? 1.28 : targeted ? 1.16 : 1;
        const selection: ViewerSelection = {
          residueId: residueIdForAtom(atom),
          chainId: atom.chainId ?? 'A',
          residueNumber: atom.residueNumber ?? 0,
          residueName: atom.residueName ?? 'UNK',
        };

        const next = backboneAtoms[index + 1];
        const sameChain = next && (next.chainId ?? 'A') === (atom.chainId ?? 'A');
        const canConnect =
          sameChain &&
          next &&
          Math.abs((next.residueNumber ?? 0) - (atom.residueNumber ?? 0)) <= 2;

        return (
          <group key={atom.id}>
            <mesh
              position={[atom.x, atom.y, atom.z]}
              scale={scale}
              userData={{ atom }}
              onPointerEnter={() => onResidueHover?.(selection)}
              onPointerLeave={() => onResidueHover?.(null)}
              onClick={(event: ThreeEvent<MouseEvent>) => {
                event.stopPropagation();
                onResidueSelect?.(selection);
              }}
            >
              <sphereGeometry args={[0.28, 16, 16]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected || hovered || targeted ? 0.45 : 0.08} transparent opacity={opacity} />
            </mesh>

            {canConnect ? (
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[new Float32Array([atom.x, atom.y, atom.z, next.x, next.y, next.z]), 3]}
                  />
                </bufferGeometry>
                <lineBasicMaterial color={emphasizeChains ? chainColor(atom.chainId ?? 'A') : '#38bdf8'} transparent opacity={opacity} />
              </line>
            ) : null}
          </group>
        );
      })}
    </>
  );
}
