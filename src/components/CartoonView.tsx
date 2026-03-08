import { useEffect, useMemo } from 'react';
import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three';
import type { Atom, Protein } from '../types/structure.js';

interface CartoonViewProps {
  protein: Protein;
  visibleChainIds: Set<string>;
}

interface Segment {
  id: string;
  atoms: Atom[];
  color: string;
  radius: number;
}

const colorForStructure = (structure: string): { color: string; radius: number } => {
  switch (structure) {
    case 'helix':
      return { color: '#fb7185', radius: 0.28 };
    case 'sheet':
      return { color: '#2dd4bf', radius: 0.24 };
    default:
      return { color: '#94a3b8', radius: 0.16 };
  }
};

function RibbonSegment({ atoms, color, radius }: Segment) {
  const geometry = useMemo(() => {
    if (atoms.length < 2) {
      return null;
    }

    const points = atoms.map((atom) => new Vector3(atom.x, atom.y, atom.z));
    return new TubeGeometry(new CatmullRomCurve3(points), Math.max(24, atoms.length * 4), radius, 8, false);
  }, [atoms, radius]);

  useEffect(() => () => geometry?.dispose(), [geometry]);

  if (!geometry) {
    return null;
  }

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

export default function CartoonView({ protein, visibleChainIds }: CartoonViewProps) {
  const residueIndex = useMemo(() => {
    const entries = protein.chains.flatMap((chain) => chain.residues.map((residue) => [residue.id, residue.secondaryStructure] as const));
    return new Map(entries);
  }, [protein.chains]);

  const segments = useMemo(() => {
    const byChain = new Map<string, Atom[]>();

    for (const atom of protein.backboneAtoms) {
      const chainId = atom.chainId ?? 'A';
      if (!visibleChainIds.has(chainId)) {
        continue;
      }
      const next = byChain.get(chainId) ?? [];
      next.push(atom);
      byChain.set(chainId, next);
    }

    const builtSegments: Segment[] = [];

    for (const [chainId, atoms] of byChain.entries()) {
      const sortedAtoms = [...atoms].sort((left, right) => (left.residueNumber ?? 0) - (right.residueNumber ?? 0));
      let currentSegmentAtoms: Atom[] = [];
      let currentStructure = 'loop';

      for (const atom of sortedAtoms) {
        const structure =
          residueIndex.get(`${chainId}:${atom.residueNumber ?? 0}:${atom.insertionCode ?? ''}`) ?? 'loop';

        if (currentSegmentAtoms.length === 0 || structure === currentStructure) {
          currentSegmentAtoms.push(atom);
          currentStructure = structure;
          continue;
        }

        const segmentStyle = colorForStructure(currentStructure);
        builtSegments.push({
          id: `${chainId}:${currentStructure}:${currentSegmentAtoms[0]?.id ?? 'start'}`,
          atoms: currentSegmentAtoms,
          ...segmentStyle,
        });
        currentSegmentAtoms = [currentSegmentAtoms[currentSegmentAtoms.length - 1], atom];
        currentStructure = structure;
      }

      if (currentSegmentAtoms.length > 1) {
        builtSegments.push({
          id: `${chainId}:${currentStructure}:${currentSegmentAtoms[0]?.id ?? 'end'}`,
          atoms: currentSegmentAtoms,
          ...colorForStructure(currentStructure),
        });
      }
    }

    return builtSegments;
  }, [protein.backboneAtoms, residueIndex, visibleChainIds]);

  return (
    <>
      {segments.map((segment) => (
        <RibbonSegment key={segment.id} {...segment} />
      ))}
    </>
  );
}
