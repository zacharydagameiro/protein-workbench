import {initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import type {UserRecord} from "firebase-admin/auth";
import {auth} from "firebase-functions/v1";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

initializeApp();

const db = getFirestore();

interface UserProteinPayload {
  proteinId?: string;
  pdbId?: string;
  pdbIdUpper?: string;
  name?: string;
}

interface HelixRecord {
  id: number;
  chainId: string;
  startResidue: number;
  endResidue: number;
  type: string;
  comment?: string;
}

interface SheetStrandRecord {
  chainId: string;
  startResidue: number;
  endResidue: number;
  sense?: number;
}

interface SheetRecord {
  id: number;
  numStrands: number;
  strands: SheetStrandRecord[];
}

interface ResidueRecord {
  id: string;
  chainId: string;
  residueNumber: number;
  insertionCode?: string;
  residueName: string;
  residueCode: string;
  sequenceIndex: number;
  atomIds: string[];
  secondaryStructure: "helix" | "sheet" | "loop";
}

interface ChainRecord {
  id: string;
  polymerType: "protein";
  residues: ResidueRecord[];
  residueCount: number;
  sequence: string;
  sequenceSource: "atoms" | "seqres";
}

interface RcsbEntryResponse {
  struct?: {
    title?: string;
  };
  exptl?: Array<{
    method?: string;
  }>;
  rcsb_entry_info?: {
    resolution_combined?: number[];
  };
  struct_keywords?: {
    pdbx_keywords?: string;
    text?: string;
  };
}

interface RcsbPolymerEntityResponse {
  rcsb_polymer_entity_container_identifiers?: {
    uniprot_ids?: string[];
  };
  rcsb_polymer_entity?: {
    pdbx_description?: string;
  };
  rcsb_entity_source_organism?: Array<{
    ncbi_scientific_name?: string;
  }>;
}

interface CanonicalProteinData {
  proteinId: string;
  pdbId: string;
  pdbIdUpper: string;
  title: string;
  rawTitle: string;
  displayTitle: string;
  moleculeName?: string;
  description: string;
  organism?: string;
  experimentalMethod?: string;
  resolution: number | null;
  keywords: string[];
  functionSummary?: string;
  geneName?: string;
  uniprotId?: string;
  searchTerms: string[];
  chains: ChainRecord[];
  helices: HelixRecord[];
  sheets: SheetRecord[];
}

interface ParsedAtom {
  id: string;
  atomName: string;
  residueName: string;
  residueCode: string;
  chainId: string;
  residueNumber: number;
  insertionCode?: string;
}

const residueCodeMap: Record<string, string> = {
  ALA: "A",
  ARG: "R",
  ASN: "N",
  ASP: "D",
  CYS: "C",
  GLN: "Q",
  GLU: "E",
  GLY: "G",
  HIS: "H",
  ILE: "I",
  LEU: "L",
  LYS: "K",
  MET: "M",
  PHE: "F",
  PRO: "P",
  SER: "S",
  THR: "T",
  TRP: "W",
  TYR: "Y",
  VAL: "V",
};

const isTrackedCollection = (collectionName: string): collectionName is "favorites" | "inventory" =>
  collectionName === "favorites" || collectionName === "inventory";

const getUserType = (providers: string[] | undefined): string => {
  if (!providers || providers.length === 0) {
    return "unknown";
  }

  if (providers.includes("anonymous")) {
    return "anonymous";
  }

  if (providers.includes("google.com")) {
    return "google";
  }

  return providers[0];
};

const toResidueCode = (residueName: string): string => residueCodeMap[residueName.toUpperCase()] ?? "X";

const residueKey = (chainId: string, residueNumber: number, insertionCode: string): string =>
  `${chainId}:${residueNumber}:${insertionCode}`;

const compareInsertionCode = (left?: string, right?: string): number => (left ?? "").localeCompare(right ?? "");

const byResiduePosition = <T extends { residueNumber: number; insertionCode?: string }>(left: T, right: T): number => {
  if (left.residueNumber !== right.residueNumber) {
    return left.residueNumber - right.residueNumber;
  }

  return compareInsertionCode(left.insertionCode, right.insertionCode);
};

const parseTitle = (pdbContent: string, pdbId: string): string => {
  const lines = pdbContent
    .split("\n")
    .filter((line) => line.startsWith("TITLE"))
    .map((line) => line.slice(10).trim())
    .filter(Boolean);

  return lines.join(" ") || `PDB structure ${pdbId.toUpperCase()}`;
};

const parsePDBAtoms = (pdbContent: string): ParsedAtom[] => {
  const atoms: ParsedAtom[] = [];

  for (const line of pdbContent.split("\n")) {
    if (!line.startsWith("ATOM  ") && !line.startsWith("HETATM")) {
      continue;
    }

    const atomNumber = Number.parseInt(line.slice(6, 11).trim(), 10);
    const atomName = line.slice(12, 16).trim();
    const residueName = line.slice(17, 20).trim();
    const chainId = line.slice(21, 22).trim() || "A";
    const residueNumber = Number.parseInt(line.slice(22, 26).trim(), 10);
    const insertionCode = line.slice(26, 27).trim();

    if (Number.isNaN(atomNumber) || Number.isNaN(residueNumber)) {
      continue;
    }

    atoms.push({
      id: `${chainId}:${residueNumber}:${insertionCode}:${atomNumber}`,
      atomName,
      residueName,
      residueCode: toResidueCode(residueName),
      chainId,
      residueNumber,
      insertionCode: insertionCode || undefined,
    });
  }

  return atoms;
};

const parseSecondaryStructure = (pdbContent: string): {helices: HelixRecord[]; sheets: SheetRecord[]} => {
  const helices: HelixRecord[] = [];
  const sheetMap = new Map<number, SheetRecord>();

  for (const line of pdbContent.split("\n")) {
    if (line.startsWith("HELIX")) {
      const helixId = Number.parseInt(line.slice(7, 10).trim(), 10) || helices.length + 1;
      helices.push({
        id: helixId,
        chainId: line.slice(19, 20).trim() || "A",
        startResidue: Number.parseInt(line.slice(21, 25).trim(), 10) || 0,
        endResidue: Number.parseInt(line.slice(33, 37).trim(), 10) || 0,
        type: line.slice(38, 40).trim() || "1",
        comment: line.slice(40, 70).trim() || undefined,
      });
      continue;
    }

    if (line.startsWith("SHEET")) {
      const sheetId = Number.parseInt(line.slice(7, 10).trim(), 10) || 1;
      const strand: SheetStrandRecord = {
        chainId: line.slice(21, 22).trim() || "A",
        startResidue: Number.parseInt(line.slice(22, 26).trim(), 10) || 0,
        endResidue: Number.parseInt(line.slice(33, 37).trim(), 10) || 0,
        sense: Number.parseInt(line.slice(38, 40).trim(), 10) || undefined,
      };

      const sheet = sheetMap.get(sheetId) ?? {
        id: sheetId,
        numStrands: Number.parseInt(line.slice(14, 16).trim(), 10) || 1,
        strands: [],
      };

      sheet.strands.push(strand);
      sheetMap.set(sheetId, sheet);
    }
  }

  return {
    helices,
    sheets: [...sheetMap.values()],
  };
};

const parseSEQRES = (pdbContent: string): Map<string, string> => {
  const residuesByChain = new Map<string, string[]>();

  for (const line of pdbContent.split("\n")) {
    if (!line.startsWith("SEQRES")) {
      continue;
    }

    const chainId = line.slice(11, 12).trim() || "A";
    const residues = line
      .slice(19, 70)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(toResidueCode);

    const next = residuesByChain.get(chainId) ?? [];
    next.push(...residues);
    residuesByChain.set(chainId, next);
  }

  return new Map([...residuesByChain.entries()].map(([chainId, residues]) => [chainId, residues.join("")]));
};

const residueSecondaryStructure = (
  chainId: string,
  residueNumber: number,
  helices: HelixRecord[],
  sheets: SheetRecord[],
): "helix" | "sheet" | "loop" => {
  if (helices.some((helix) => helix.chainId === chainId && residueNumber >= helix.startResidue && residueNumber <= helix.endResidue)) {
    return "helix";
  }

  if (
    sheets.some((sheet) =>
      sheet.strands.some(
        (strand) => strand.chainId === chainId && residueNumber >= strand.startResidue && residueNumber <= strand.endResidue,
      ),
    )
  ) {
    return "sheet";
  }

  return "loop";
};

const buildChains = (
  atoms: ParsedAtom[],
  helices: HelixRecord[],
  sheets: SheetRecord[],
  seqresByChain: Map<string, string>,
): ChainRecord[] => {
  const residuesByChain = new Map<string, Map<string, ResidueRecord>>();

  for (const atom of atoms) {
    const chainResidues = residuesByChain.get(atom.chainId) ?? new Map<string, ResidueRecord>();
    const key = residueKey(atom.chainId, atom.residueNumber, atom.insertionCode ?? "");
    const existing = chainResidues.get(key);

    if (existing) {
      existing.atomIds.push(atom.id);
    } else {
      chainResidues.set(key, {
        id: `${atom.chainId}:${atom.residueNumber}:${atom.insertionCode ?? ""}`,
        chainId: atom.chainId,
        residueNumber: atom.residueNumber,
        insertionCode: atom.insertionCode,
        residueName: atom.residueName,
        residueCode: atom.residueCode,
        sequenceIndex: 0,
        atomIds: [atom.id],
        secondaryStructure: residueSecondaryStructure(atom.chainId, atom.residueNumber, helices, sheets),
      });
    }

    residuesByChain.set(atom.chainId, chainResidues);
  }

  return [...residuesByChain.entries()]
    .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
    .map(([chainId, residueMap]) => {
      const residues = [...residueMap.values()].sort(byResiduePosition).map((residue, index) => ({
        ...residue,
        sequenceIndex: index,
      }));

      return {
        id: chainId,
        polymerType: "protein",
        residues,
        residueCount: residues.length,
        sequence: seqresByChain.get(chainId) ?? residues.map((residue) => residue.residueCode).join(""),
        sequenceSource: seqresByChain.has(chainId) ? "seqres" : "atoms",
      };
    });
};

const fetchJson = async <T>(url: string): Promise<T | null> => {
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
};

const fetchCanonicalProteinData = async (pdbId: string, proteinId: string): Promise<CanonicalProteinData> => {
  const normalizedId = pdbId.trim().toUpperCase();
  const pdbResponse = await fetch(`https://files.rcsb.org/download/${normalizedId}.pdb`);

  if (!pdbResponse.ok) {
    throw new Error(`Failed to fetch PDB content for ${normalizedId}.`);
  }

  const pdbContent = await pdbResponse.text();
  const {helices, sheets} = parseSecondaryStructure(pdbContent);
  const chains = buildChains(parsePDBAtoms(pdbContent), helices, sheets, parseSEQRES(pdbContent));
  const parsedTitle = parseTitle(pdbContent, normalizedId);

  const [entry, polymerEntities] = await Promise.all([
    fetchJson<RcsbEntryResponse>(`https://data.rcsb.org/rest/v1/core/entry/${normalizedId}`),
    fetchJson<RcsbPolymerEntityResponse[]>(`https://data.rcsb.org/rest/v1/core/entry/${normalizedId}/polymer_entities`),
  ]);

  const firstEntity = polymerEntities?.[0];
  const polymerDescription =
    firstEntity?.rcsb_polymer_entity?.pdbx_description ??
    polymerEntities?.find((entity) => entity.rcsb_polymer_entity?.pdbx_description)?.rcsb_polymer_entity?.pdbx_description;
  const organism =
    firstEntity?.rcsb_entity_source_organism?.[0]?.ncbi_scientific_name ??
    polymerEntities?.find((entity) => entity.rcsb_entity_source_organism?.[0]?.ncbi_scientific_name)
      ?.rcsb_entity_source_organism?.[0]?.ncbi_scientific_name;
  const uniprotId = firstEntity?.rcsb_polymer_entity_container_identifiers?.uniprot_ids?.[0];
  const rawTitle = entry?.struct?.title ?? parsedTitle;
  const displayTitle = polymerDescription ?? rawTitle;
  const keywords = [entry?.struct_keywords?.pdbx_keywords, entry?.struct_keywords?.text].filter(Boolean) as string[];
  const searchTerms = [...new Set(
    [
      normalizedId,
      proteinId,
      rawTitle,
      displayTitle,
      polymerDescription,
      organism,
      uniprotId,
      ...keywords,
      ...chains.map((chain) => chain.id),
    ]
      .flatMap((value) =>
        String(value ?? "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .split(" ")
          .filter(Boolean),
      ),
  )];

  return {
    proteinId,
    pdbId: normalizedId,
    pdbIdUpper: normalizedId,
    title: displayTitle,
    rawTitle,
    displayTitle,
    moleculeName: polymerDescription,
    description: rawTitle,
    organism,
    experimentalMethod: entry?.exptl?.map((item) => item.method).filter(Boolean).join(", ") || undefined,
    resolution: entry?.rcsb_entry_info?.resolution_combined?.[0] ?? null,
    keywords,
    uniprotId,
    searchTerms,
    chains,
    helices,
    sheets,
  };
};

export const createUserDocument = auth.user().onCreate(async (user: UserRecord) => {
  const providerIds = user.providerData
    .map((provider: UserRecord["providerData"][number]) => provider.providerId)
    .filter((providerId): providerId is string => Boolean(providerId));

  const type = user.providerData.length === 0 && user.email == null ? "anonymous" : getUserType(providerIds);

  await db.collection("users").doc(user.uid).set(
    {
      uid: user.uid,
      type,
      metadata: {
        type,
        providerIds,
        isAnonymous: type === "anonymous",
      },
      createdAt: FieldValue.serverTimestamp(),
      lastSeenAt: FieldValue.serverTimestamp(),
    },
    {merge: true},
  );

  logger.info("Created user document from auth event", {
    uid: user.uid,
    type,
  });
});

export const deleteUserDocument = auth.user().onDelete(async (user: UserRecord) => {
  await db.recursiveDelete(db.doc(`users/${user.uid}`));

  logger.info("Deleted user document tree from auth delete event", {
    uid: user.uid,
  });
});

export const syncProteinFromUserLibrary = onDocumentCreated(
  "users/{uid}/{collectionName}/{proteinId}",
  async (event) => {
    const {uid, collectionName, proteinId} = event.params;

    if (!isTrackedCollection(collectionName)) {
      return;
    }

    const snapshot = event.data;
    if (!snapshot) {
      return;
    }

    const payload = snapshot.data() as UserProteinPayload;
    const canonicalId = (payload.pdbIdUpper ?? payload.pdbId ?? proteinId).trim().toUpperCase();
    const nextProteinId = payload.proteinId ?? proteinId;
    const proteinRef = db.collection("proteins").doc(canonicalId);
    const proteinSnapshot = await proteinRef.get();

    try {
      const canonicalProtein = await fetchCanonicalProteinData(canonicalId, nextProteinId);

      await proteinRef.set(
        {
          ...canonicalProtein,
          createdFromUserId: uid,
          createdFromCollection: collectionName,
          updatedAt: FieldValue.serverTimestamp(),
          sourceUsers: FieldValue.arrayUnion(uid),
          ...(proteinSnapshot.exists ? {} : {createdAt: FieldValue.serverTimestamp()}),
        },
        {merge: true},
      );
    } catch (error) {
      logger.error("Failed to enrich canonical protein during library sync", {
        uid,
        collectionName,
        proteinId: canonicalId,
        error: error instanceof Error ? error.message : String(error),
      });

      await proteinRef.set(
        {
          proteinId: nextProteinId,
          pdbId: canonicalId,
          pdbIdUpper: canonicalId,
          updatedAt: FieldValue.serverTimestamp(),
          sourceUsers: FieldValue.arrayUnion(uid),
          ...(proteinSnapshot.exists ? {} : {createdAt: FieldValue.serverTimestamp()}),
        },
        {merge: true},
      );
    }

    await db.collection("users").doc(uid).set(
      {
        lastLibrarySyncAt: FieldValue.serverTimestamp(),
      },
      {merge: true},
    );

    logger.info("Synced protein from user library", {
      uid,
      collectionName,
      proteinId: canonicalId,
      createdProtein: !proteinSnapshot.exists,
    });
  },
);
