import type {
  Atom,
  AtomElement,
  ChainData,
  Helix,
  Protein,
  ResidueData,
  SecondaryStructureType,
  Sheet,
  VariantAnnotation,
} from '../types/structure.js';
import { enrichProteinForExplorer, normalizeDisplayTitle } from '../utils/explorerContent.js';

const residueCycle = [
  ['ALA', 'A'],
  ['GLY', 'G'],
  ['SER', 'S'],
  ['LEU', 'L'],
  ['ASP', 'D'],
  ['LYS', 'K'],
  ['TYR', 'Y'],
  ['VAL', 'V'],
] as const;

const atomElementForIndex = (index: number): AtomElement => {
  if (index % 7 === 0) {
    return 'N';
  }
  if (index % 5 === 0) {
    return 'O';
  }
  if (index % 11 === 0) {
    return 'S';
  }
  return 'C';
};

const buildResidue = (
  proteinId: string,
  chainId: string,
  residueNumber: number,
  sequenceIndex: number,
  x: number,
  y: number,
  z: number,
  secondaryStructure: SecondaryStructureType,
): { residue: ResidueData; atoms: Atom[]; backboneAtom: Atom } => {
  const [residueName, residueCode] = residueCycle[sequenceIndex % residueCycle.length];
  const residueId = `${proteinId}:${chainId}:${residueNumber}`;
  const atomIds = [
    `${residueId}:N`,
    `${residueId}:CA`,
    `${residueId}:C`,
  ];

  const atoms: Atom[] = [
    {
      id: atomIds[0],
      x: x - 0.45,
      y: y + 0.08,
      z: z - 0.12,
      element: 'N',
      atomName: 'N',
      residueName,
      residueCode,
      chainId,
      residueNumber,
    },
    {
      id: atomIds[1],
      x,
      y,
      z,
      element: atomElementForIndex(sequenceIndex),
      atomName: 'CA',
      residueName,
      residueCode,
      chainId,
      residueNumber,
    },
    {
      id: atomIds[2],
      x: x + 0.45,
      y: y - 0.12,
      z: z + 0.1,
      element: 'C',
      atomName: 'C',
      residueName,
      residueCode,
      chainId,
      residueNumber,
    },
  ];

  return {
    residue: {
      id: residueId,
      chainId,
      residueNumber,
      residueName,
      residueCode,
      sequenceIndex,
      atomIds,
      secondaryStructure,
    },
    atoms,
    backboneAtom: atoms[1],
  };
};

const buildChain = (
  proteinId: string,
  chainId: string,
  length: number,
  positionForResidue: (sequenceIndex: number) => [number, number, number],
  helixRange?: [number, number],
): { chain: ChainData; atoms: Atom[]; backboneAtoms: Atom[]; helices: Helix[] } => {
  const residues: ResidueData[] = [];
  const atoms: Atom[] = [];
  const backboneAtoms: Atom[] = [];
  const helices: Helix[] = [];

  for (let index = 0; index < length; index += 1) {
    const residueNumber = index + 1;
    const secondaryStructure =
      helixRange && residueNumber >= helixRange[0] && residueNumber <= helixRange[1]
        ? 'helix'
        : 'loop';
    const [x, y, z] = positionForResidue(index);
    const built = buildResidue(
      proteinId,
      chainId,
      residueNumber,
      index,
      x,
      y,
      z,
      secondaryStructure,
    );

    residues.push(built.residue);
    atoms.push(...built.atoms);
    backboneAtoms.push(built.backboneAtom);
  }

  if (helixRange) {
    helices.push({
      id: 1,
      chainId,
      startResidue: helixRange[0],
      endResidue: helixRange[1],
      type: '1',
      comment: 'Sample helix',
    });
  }

  return {
    chain: {
      id: chainId,
      polymerType: 'protein',
      residues,
      residueCount: residues.length,
      sequence: residues.map((residue) => residue.residueCode).join(''),
      sequenceSource: 'atoms',
    },
    atoms,
    backboneAtoms,
    helices,
  };
};

const buildSampleProtein = (
  id: string,
  name: string,
  description: string,
  chainBuilders: Array<() => { chain: ChainData; atoms: Atom[]; backboneAtoms: Atom[]; helices: Helix[] }>,
  variants: VariantAnnotation[] = [],
  sheets: Sheet[] = [],
): Protein => {
  const chains = chainBuilders.map((builder) => builder());

  return enrichProteinForExplorer({
    id,
    name,
    atoms: chains.flatMap((chain) => chain.atoms),
    backboneAtoms: chains.flatMap((chain) => chain.backboneAtoms),
    chains: chains.map((chain) => chain.chain),
    helices: chains.flatMap((chain) => chain.helices),
    sheets,
    metadata: {
      source: 'sample',
      title: normalizeDisplayTitle(name),
      rawTitle: name,
      displayTitle: normalizeDisplayTitle(name),
      moleculeName: normalizeDisplayTitle(name),
      description,
      organism: 'Teaching sample',
      keywords: ['sample', 'starter'],
      functionSummary: 'Curated starter structure for exploring the Protein Workbench.',
    },
    regions: [],
    variants,
    storyCards: [],
  });
};

export const sampleProteins: Protein[] = [
  buildSampleProtein(
    'sample-helix',
    'Signal Helix Starter',
    'A compact alpha-helical starter model with a single structured chain.',
    [
      () =>
        buildChain(
          'sample-helix',
          'A',
          18,
          (index) => {
            const t = index * 0.55;
            return [Math.cos(t) * 2.1, index * 0.45 - 4, Math.sin(t) * 2.1];
          },
          [3, 15],
        ),
    ],
    [
      {
        id: 'sample-helix:variant:8',
        label: 'A8V',
        chainId: 'A',
        residueNumber: 8,
        from: 'A',
        to: 'V',
        effect: 'Used as a teaching example for how a small hydrophobic swap can subtly change packing.',
        disease: 'Teaching example only',
        source: 'sample',
      },
    ],
  ),
  buildSampleProtein(
    'sample-dimer',
    'Regulatory Dimer Starter',
    'Two curated chains that make comparison and chain filtering useful without requiring a network fetch.',
    [
      () =>
        buildChain(
          'sample-dimer',
          'A',
          14,
          (index) => {
            const angle = index * 0.35;
            return [Math.cos(angle) * 2.7 - 3.2, Math.sin(index * 0.4) * 0.8, Math.sin(angle) * 1.9];
          },
          [4, 10],
        ),
      () =>
        buildChain(
          'sample-dimer',
          'B',
          12,
          (index) => {
            const angle = index * 0.45;
            return [Math.cos(angle) * 2.3 + 3.2, Math.sin(index * 0.35) * 1.1, Math.sin(angle) * 2.4];
          },
          [2, 7],
        ),
    ],
    [
      {
        id: 'sample-dimer:variant:5',
        label: 'D5N',
        chainId: 'A',
        residueNumber: 5,
        from: 'D',
        to: 'N',
        effect: 'Illustrates how a charge-changing variant can alter interfaces in a multi-chain assembly.',
        disease: 'Teaching example only',
        source: 'sample',
      },
    ],
  ),
];
