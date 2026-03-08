export type AtomElement = 'C' | 'N' | 'O' | 'S' | 'H' | 'P' | 'OTHER';

export type PolymerType = 'protein' | 'unknown';

export type SecondaryStructureType = 'helix' | 'sheet' | 'loop' | 'unassigned';

export type StructureLevel = 'primary' | 'secondary' | 'tertiary' | 'quaternary';

export type InspectorTab = 'general' | 'structure' | 'sequence' | 'variants';

export type SequenceTrackDensity = 'overview' | 'residues';

export interface SequenceHighlightRange {
  chainId: string;
  startResidue: number;
  endResidue: number;
  source: 'region' | 'variant' | 'selection';
}

export interface SequencePanelState {
  activeChainId: string;
  density: SequenceTrackDensity;
  focusedResidueId: string | null;
  highlightedRange?: SequenceHighlightRange | null;
}

export type ViewerMode = 'atoms' | 'backbone' | 'cartoon';

export type ViewerUnitSystem = 'angstrom' | 'nanometer';

export interface ViewerSceneSettings {
  unitSystem: ViewerUnitSystem;
  showGrid: boolean;
  showFog: boolean;
  lightingPreset: 'scientific';
}

export type WorkspaceTab = 'explorer' | 'protein-bank';

export type ProteinBankCollection = 'starter' | 'pinned' | 'history' | 'search';

export type ProteinBankCollectionFilter = 'all' | ProteinBankCollection;

export type ProteinBankSourceFilter = 'all' | StructureMetadata['source'];

export type ProteinBankVariantFilter = 'all' | 'with-variants' | 'without-variants';

export type ProteinBankSortKey = 'title' | 'pdbId' | 'resolution' | 'chainCount';

export type ProteinBankTableColumnId =
  | 'select'
  | 'title'
  | 'pdbId'
  | 'collections'
  | 'source'
  | 'organism'
  | 'experimentalMethod'
  | 'resolution'
  | 'chainCount'
  | 'variantCount'
  | 'actions';

export interface ProteinBankRowAction {
  id: 'open' | 'toggle-pinned';
  label: string;
}

export interface Atom {
  id: string;
  x: number;
  y: number;
  z: number;
  element: AtomElement;
  atomName?: string;
  residueName?: string;
  residueCode?: string;
  chainId?: string;
  residueNumber?: number;
  insertionCode?: string;
}

export interface Helix {
  id: number;
  chainId: string;
  startResidue: number;
  endResidue: number;
  type: string;
  comment?: string;
}

export interface SheetStrand {
  chainId: string;
  startResidue: number;
  endResidue: number;
  sense?: number;
}

export interface Sheet {
  id: number;
  numStrands: number;
  strands: SheetStrand[];
}

export interface ResidueData {
  id: string;
  chainId: string;
  residueNumber: number;
  insertionCode?: string;
  residueName: string;
  residueCode: string;
  sequenceIndex: number;
  atomIds: string[];
  secondaryStructure: SecondaryStructureType;
}

export interface ChainData {
  id: string;
  polymerType: PolymerType;
  residues: ResidueData[];
  residueCount: number;
  sequence: string;
  sequenceSource: 'atoms' | 'seqres';
}

export interface ViewerSelection {
  residueId: string;
  chainId: string;
  residueNumber: number;
  residueName: string;
}

export interface RegionAnnotation {
  id: string;
  label: string;
  chainId: string;
  startResidue: number;
  endResidue: number;
  kind: 'chain' | 'helix' | 'sheet' | 'loop' | 'domain' | 'motif' | 'site';
  source: 'derived' | 'curated' | 'uniprot';
  description?: string;
  structureLevel?: StructureLevel;
}

export interface VariantAnnotation {
  id: string;
  label: string;
  chainId: string;
  residueNumber: number;
  from?: string;
  to?: string;
  effect: string;
  disease?: string;
  source: 'sample' | 'uniprot';
  sourceUrl?: string;
}

export type ViewerTarget =
  | {
      kind: 'residue';
      residue: ViewerSelection;
    }
  | {
      kind: 'region';
      region: RegionAnnotation;
    }
  | {
      kind: 'variant';
      variant: VariantAnnotation;
    }
  | {
      kind: 'chain';
      chainId: string;
    }
  | {
      kind: 'structure-level';
      level: StructureLevel;
    };

export interface StoryCard {
  id: string;
  title: string;
  body: string;
  kind: 'identity' | 'structure' | 'region' | 'translation' | 'variant';
  target?: ViewerTarget;
}

export interface TeachingCodonEntry {
  aminoAcid: string;
  fullName: string;
  codons: string[];
  dnaTriplets: string[];
  rnaTriplets: string[];
}

export interface RecentItem {
  id: string;
  label: string;
  subtitle: string;
  pdbLabel: string;
}

export interface StructureMetadata {
  source: 'sample' | 'rcsb';
  title: string;
  rawTitle: string;
  displayTitle: string;
  moleculeName?: string;
  description: string;
  pdbId?: string;
  uniprotId?: string;
  organism?: string;
  experimentalMethod?: string;
  resolution?: number | null;
  keywords?: string[];
  functionSummary?: string;
  geneName?: string;
}

export interface ProteinBankFilterState {
  collection: ProteinBankCollectionFilter;
  source: ProteinBankSourceFilter;
  organism: string;
  experimentalMethod: string;
  variantPresence: ProteinBankVariantFilter;
}

export interface Protein {
  id: string;
  name: string;
  atoms: Atom[];
  backboneAtoms: Atom[];
  chains: ChainData[];
  helices: Helix[];
  sheets: Sheet[];
  metadata: StructureMetadata;
  regions: RegionAnnotation[];
  variants: VariantAnnotation[];
  storyCards: StoryCard[];
}

export interface ProteinBankRow {
  protein: Protein;
  collections: ProteinBankCollection[];
  title: string;
  pdbLabel: string;
  organism: string;
  experimentalMethod: string;
  resolution: number | null;
  chainCount: number;
  variantCount: number;
}
