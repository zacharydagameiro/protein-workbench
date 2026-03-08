import type { ChainData, Helix, Sheet } from './structure.js';

export interface FirestoreProteinRecord {
  id: string;
  pdbId?: string;
  pdbIdUpper?: string;
  title?: string;
  rawTitle?: string;
  displayTitle?: string;
  moleculeName?: string;
  description?: string;
  organism?: string;
  experimentalMethod?: string;
  resolution?: number | null;
  keywords?: string[];
  functionSummary?: string;
  geneName?: string;
  uniprotId?: string;
  aliases?: string[];
  categoryTags?: string[];
  searchTerms?: string[];
  chains?: ChainData[];
  helices?: Helix[];
  sheets?: Sheet[];
}
