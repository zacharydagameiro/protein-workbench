import {
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, Check, Circle, Columns3, Filter, LoaderCircle, MoreHorizontal, Pin, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { loadProteinById, searchAndLoadProteins } from '../services/pdbService.js';
import type {
  Protein,
  ProteinBankFilterState,
  ProteinBankRow,
  ProteinBankRowAction,
  ProteinBankSortKey,
} from '../types/structure.js';
import { defaultProteinBankFilters, getProteinBankOptions, sortProteinBankRows } from '../utils/proteinBank.js';
import {
  proteinBankSortKeyFromSortingState,
  proteinBankSortLabel,
  proteinBankSortingStateFromSortKey,
} from '../utils/proteinBankTable.js';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion.js';
import { Badge } from './ui/badge.js';
import { Button } from './ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.js';
import { Combobox, type ComboboxOption } from './ui/combobox.js';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu.js';
import { Input } from './ui/input.js';
import { ScrollArea } from './ui/scroll-area.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs.js';

interface ProteinBankProps {
  rows: ProteinBankRow[];
  pageMode?: 'explore' | 'inventory';
  selectedId: string | null;
  filters: ProteinBankFilterState;
  sortKey: ProteinBankSortKey;
  pinnedIds: Set<string>;
  inventoryIds: Set<string>;
  onFiltersChange: (filters: ProteinBankFilterState) => void;
  onSortKeyChange: (sortKey: ProteinBankSortKey) => void;
  onSearchResults: (proteins: Protein[]) => void;
  onOpenProtein: (protein: Protein) => void;
  onTogglePinned: (protein: Protein) => void;
  onToggleInventory: (protein: Protein) => void;
}

type DiscoverSurfaceMode = 'search' | 'browse';
type QueryMode = 'id' | 'text';

const QUERY_MODE_OPTIONS: ComboboxOption[] = [
  {
    value: 'text',
    label: 'Keyword search',
    keywords: ['phrase', 'name', 'gene', 'function'],
  },
  {
    value: 'id',
    label: 'Direct PDB ID',
    keywords: ['entry', 'identifier', 'code'],
  },
];

const QUICK_EXAMPLES = ['1CRN', '4HHB', '1BNA'];

const DISCOVERY_CATEGORIES = [
  {
    key: 'bacterial',
    title: 'Bacterial proteins',
    description: 'Structures from bacterial systems, especially enzymes, binding proteins, and microbial machinery.',
    keywords: ['bacteria', 'bacterial', 'e. coli', 'escherichia', 'bacillus', 'salmonella', 'mycobacter', 'strept'],
  },
  {
    key: 'dna-binding',
    title: 'DNA binding and repair',
    description: 'Polymerases, helicases, nucleases, repair complexes, and other DNA-focused proteins.',
    keywords: ['dna', 'deoxyribo', 'polymerase', 'helicase', 'nuclease', 'repair', 'histone', 'chromatin'],
  },
  {
    key: 'rna-biology',
    title: 'RNA biology',
    description: 'Ribosomal, RNA-binding, splicing, and RNA-processing structures.',
    keywords: ['rna', 'ribosome', 'ribosomal', 'mrna', 'trna', 'rrna', 'splice', 'rnase'],
  },
  {
    key: 'kinases',
    title: 'Kinases and signaling',
    description: 'Kinases, phosphatases, receptors, and signal transduction proteins.',
    keywords: ['kinase', 'phosphatase', 'signaling', 'signal', 'receptor', 'phosphorylation', 'mapk', 'akt'],
  },
  {
    key: 'membrane',
    title: 'Membrane proteins',
    description: 'Channels, receptors, pumps, and membrane-embedded assemblies.',
    keywords: ['membrane', 'channel', 'pump', 'gpcr', 'porin', 'transmembrane', 'receptor'],
  },
  {
    key: 'metabolism',
    title: 'Metabolism and enzymes',
    description: 'Catalytic proteins that drive synthesis, breakdown, and metabolic conversion.',
    keywords: ['enzyme', 'catal', 'synthase', 'synthetase', 'dehydrogenase', 'hydrolase', 'transferase', 'metabolism'],
  },
  {
    key: 'transport',
    title: 'Transport and trafficking',
    description: 'Importers, exporters, carriers, motors, and trafficking-related proteins.',
    keywords: ['transport', 'transporter', 'carrier', 'import', 'export', 'trafficking', 'motor', 'cargo'],
  },
  {
    key: 'immune',
    title: 'Immune and defense',
    description: 'Antibodies, cytokines, complement factors, CRISPR systems, and defense proteins.',
    keywords: ['immune', 'antibody', 'cytokine', 'complement', 'defense', 'crispr', 'cas', 'interferon'],
  },
  {
    key: 'viral',
    title: 'Viral and pathogen',
    description: 'Viral structural proteins, replication factors, and host invasion machinery.',
    keywords: ['viral', 'virus', 'capsid', 'spike', 'pathogen', 'hiv', 'influenza', 'coronavirus'],
  },
  {
    key: 'redox',
    title: 'Heme, oxygen, and redox',
    description: 'Hemoglobin-like proteins, cytochromes, oxidases, and redox-active assemblies.',
    keywords: ['heme', 'haem', 'hemoglobin', 'myoglobin', 'cytochrome', 'oxidase', 'oxygen', 'redox'],
  },
] as const;

type BrowseCategory = (typeof DISCOVERY_CATEGORIES)[number]['key'];

interface DiscoveryCategory {
  key: (typeof DISCOVERY_CATEGORIES)[number]['key'];
  title: string;
  description: string;
  keywords: readonly string[];
}

function countActiveFilters(filters: ProteinBankFilterState) {
  return [
    filters.collection !== 'all',
    filters.source !== 'all',
    filters.organism !== 'all',
    filters.experimentalMethod !== 'all',
    filters.variantPresence !== 'all',
  ].filter(Boolean).length;
}

function getBrowseSearchText(row: ProteinBankRow) {
  return [
    row.title,
    row.pdbLabel,
    row.organism,
    row.experimentalMethod,
    row.protein.metadata.source,
    row.protein.metadata.functionSummary,
    row.protein.metadata.description,
    row.protein.metadata.geneName,
    row.protein.metadata.moleculeName,
    ...(row.protein.metadata.keywords ?? []),
    ...row.collections,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function matchesDiscoveryCategory(row: ProteinBankRow, category: DiscoveryCategory) {
  const searchableText = getBrowseSearchText(row);
  return category.keywords.some((keyword) => searchableText.includes(keyword));
}

function ProteinBankHeader({
  title,
  column,
}: {
  title: string;
  column: {
    getIsSorted: () => false | 'asc' | 'desc';
    toggleSorting: (desc?: boolean) => void;
  };
}) {
  const sortState = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 px-3 text-muted-foreground hover:text-foreground"
      onClick={() => column.toggleSorting(sortState === 'asc')}
    >
      {title}
      <ArrowUpDown className="h-3.5 w-3.5" />
    </Button>
  );
}

function ExplorerListItem({
  row,
  selectedId,
  isPinned,
  isInInventory,
  onOpenProtein,
  onTogglePinned,
  onToggleInventory,
}: {
  row: ProteinBankRow;
  selectedId: string | null;
  isPinned: boolean;
  isInInventory: boolean;
  onOpenProtein: (protein: Protein) => void;
  onTogglePinned: (protein: Protein) => void;
  onToggleInventory: (protein: Protein) => void;
}) {
  const summary = row.protein.metadata.functionSummary ?? row.protein.metadata.description;

  return (
    <div
      className={`rounded-xl p-4 transition-colors ${
        selectedId === row.protein.id ? 'bg-primary/5 ring-1 ring-primary/35' : 'bg-secondary/15 hover:bg-secondary/22'
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium text-foreground">{row.title}</h4>
            <Badge variant="outline" className="font-mono text-[11px] tracking-[0.16em]">
              {row.pdbLabel}
            </Badge>
            {isPinned ? <Badge variant="secondary">Pinned</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">{summary}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="capitalize">
              {row.protein.metadata.source}
            </Badge>
            {isInInventory ? <Badge variant="outline">In inventory</Badge> : null}
            {row.organism !== 'Unavailable' ? <Badge variant="outline">{row.organism}</Badge> : null}
            {row.experimentalMethod !== 'Unavailable' ? <Badge variant="outline">{row.experimentalMethod}</Badge> : null}
            <Badge variant="outline">{row.chainCount} chains</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => onOpenProtein(row.protein)}>
            Open
          </Button>
          <Button variant={isInInventory ? 'secondary' : 'outline'} size="sm" onClick={() => onToggleInventory(row.protein)}>
            {isInInventory ? 'Remove from inventory' : 'Add to inventory'}
          </Button>
          <Button
            variant={isPinned ? 'secondary' : 'outline'}
            size="icon"
            className="rounded-full"
            title={isPinned ? 'Remove from favorites' : 'Pin to favorites'}
            aria-label={isPinned ? `Remove ${row.title} from favorites` : `Pin ${row.title} to favorites`}
            onClick={() => onTogglePinned(row.protein)}
          >
            <Pin className={`h-4 w-4 ${isPinned ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ProteinBank({
  rows,
  pageMode = 'explore',
  selectedId,
  filters,
  sortKey,
  pinnedIds,
  inventoryIds,
  onFiltersChange,
  onSortKeyChange,
  onSearchResults,
  onOpenProtein,
  onTogglePinned,
  onToggleInventory,
}: ProteinBankProps) {
  const [surfaceMode, setSurfaceMode] = useState<DiscoverSurfaceMode>('search');
  const [query, setQuery] = useState('');
  const [queryMode, setQueryMode] = useState<QueryMode>('text');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [browseCategory, setBrowseCategory] = useState<BrowseCategory>(DISCOVERY_CATEGORIES[0].key);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>(() => proteinBankSortingStateFromSortKey(sortKey));
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    collections: false,
    organism: false,
    experimentalMethod: false,
    variantCount: false,
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const options = useMemo(() => getProteinBankOptions(rows), [rows]);

  const collectionOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: 'all', label: 'All collections' },
      { value: 'starter', label: 'Starter proteins' },
      { value: 'inventory', label: 'Inventory table' },
      { value: 'pinned', label: 'Pinned proteins' },
      { value: 'search', label: 'Fetched results' },
    ],
    [],
  );

  const sourceOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: 'all', label: 'All sources' },
      { value: 'sample', label: 'Teaching samples' },
      { value: 'rcsb', label: 'RCSB' },
    ],
    [],
  );

  const organismOptions = useMemo<ComboboxOption[]>(
    () => [{ value: 'all', label: 'All organisms' }, ...options.organisms.map((organism) => ({ value: organism, label: organism }))],
    [options.organisms],
  );

  const methodOptions = useMemo<ComboboxOption[]>(
    () => [{ value: 'all', label: 'All methods' }, ...options.methods.map((method) => ({ value: method, label: method }))],
    [options.methods],
  );

  const variantOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: 'all', label: 'All variant states' },
      { value: 'with-variants', label: 'With variants' },
      { value: 'without-variants', label: 'Without variants' },
    ],
    [],
  );

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);
  const fetchedCount = useMemo(() => rows.filter((row) => row.collections.includes('search')).length, [rows]);
  const normalizedLibraryQuery = libraryQuery.trim().toLowerCase();

  const browseCategories = useMemo(
    () =>
      DISCOVERY_CATEGORIES.map((category) => ({
        key: category.key,
        title: category.title,
        description: category.description,
        count: rows.filter((row) => matchesDiscoveryCategory(row, category)).length,
      })),
    [rows],
  );

  const visibleBrowseCategories = useMemo(() => {
    if (!normalizedLibraryQuery) {
      return browseCategories;
    }

    return browseCategories.filter((category) =>
      `${category.title} ${category.description}`.toLowerCase().includes(normalizedLibraryQuery),
    );
  }, [browseCategories, normalizedLibraryQuery]);

  const activeBrowseCategory = useMemo(
    () => browseCategories.find((category) => category.key === browseCategory) ?? browseCategories[0] ?? DISCOVERY_CATEGORIES[0],
    [browseCategories, browseCategory],
  );

  const browseCategoryRows = useMemo(() => {
    const category = DISCOVERY_CATEGORIES.find((entry) => entry.key === browseCategory);
    if (!category) {
      return sortProteinBankRows(rows, sortKey);
    }

    return sortProteinBankRows(
      rows.filter((row) => matchesDiscoveryCategory(row, category)),
      sortKey,
    );
  }, [browseCategory, rows, sortKey]);

  const searchResultRows = useMemo(
    () => sortProteinBankRows(rows.filter((row) => row.collections.includes('search')), sortKey),
    [rows, sortKey],
  );

  const inventoryTableRows = useMemo(
    () => sortProteinBankRows(rows.filter((row) => row.collections.includes('inventory')), sortKey),
    [rows, sortKey],
  );

  const tableRows = inventoryTableRows;
  const hasDiscoverRefinement = activeFilterCount > 0 || normalizedLibraryQuery.length > 0;

  useEffect(() => {
    setSorting(proteinBankSortingStateFromSortKey(sortKey));
  }, [sortKey]);

  const runSearch = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setError('Enter a PDB ID or a search phrase.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const proteins = queryMode === 'id' ? [await loadProteinById(trimmedQuery)] : await searchAndLoadProteins(trimmedQuery);

      if (proteins.length === 0) {
        setError('No matching structures were found.');
      }

      onSearchResults(proteins);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Search failed.');
      onSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    onFiltersChange(defaultProteinBankFilters());
  };

  const clearBrowseRefinement = () => {
    clearFilters();
    setBrowseCategory(DISCOVERY_CATEGORIES[0].key);
    setLibraryQuery('');
  };

  const columns = useMemo<ColumnDef<ProteinBankRow>[]>(
    () => [
      {
        id: 'select',
        enableSorting: false,
        enableHiding: false,
        header: ({ table }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 px-3"
            onClick={() => table.toggleAllRowsSelected(!table.getIsAllRowsSelected())}
            aria-label="Select all rows"
          >
            {table.getIsAllRowsSelected() ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
          </Button>
        ),
        cell: ({ row }) => (
          <Button
            variant={row.getIsSelected() ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => row.toggleSelected(!row.getIsSelected())}
            aria-label={`${row.getIsSelected() ? 'Deselect' : 'Select'} ${row.original.title}`}
          >
            {row.getIsSelected() ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
          </Button>
        ),
      },
      {
        accessorKey: 'title',
        id: 'title',
        header: ({ column }) => <ProteinBankHeader title="Protein" column={column} />,
        sortingFn: (left, right) => left.original.title.localeCompare(right.original.title),
        cell: ({ row }) => {
          const summary = row.original.protein.metadata.functionSummary ?? row.original.protein.metadata.description;

          return (
            <div className="max-w-[14rem] min-w-0 space-y-1 sm:max-w-[18rem] xl:max-w-[26rem]">
              <div className="truncate font-medium text-foreground" title={row.original.title}>
                {row.original.title}
              </div>
              <div className="truncate text-xs text-muted-foreground" title={summary}>
                {summary}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'pdbLabel',
        id: 'pdbId',
        header: ({ column }) => <ProteinBankHeader title="PDB ID" column={column} />,
        cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.pdbLabel}</span>,
      },
      {
        accessorKey: 'collections',
        id: 'collections',
        enableSorting: false,
        header: 'Collections',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            {row.original.collections.map((collection) => (
              <Badge key={`${row.original.protein.id}-${collection}`} variant="outline" className="capitalize">
                {collection}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        accessorFn: (row) => row.protein.metadata.source,
        id: 'source',
        header: 'Source',
        cell: ({ row }) => <span className="capitalize text-muted-foreground">{row.original.protein.metadata.source}</span>,
      },
      {
        accessorKey: 'organism',
        id: 'organism',
        header: 'Organism',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.organism}</span>,
      },
      {
        accessorKey: 'experimentalMethod',
        id: 'experimentalMethod',
        header: 'Method',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.experimentalMethod}</span>,
      },
      {
        accessorKey: 'resolution',
        id: 'resolution',
        header: ({ column }) => <ProteinBankHeader title="Resolution" column={column} />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.resolution ? `${row.original.resolution.toFixed(2)} Å` : 'Unavailable'}</span>
        ),
      },
      {
        accessorKey: 'chainCount',
        id: 'chainCount',
        header: ({ column }) => <ProteinBankHeader title="Chains" column={column} />,
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.chainCount}</span>,
      },
      {
        accessorKey: 'variantCount',
        id: 'variantCount',
        header: 'Variants',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.variantCount}</span>,
      },
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false,
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const isPinned = pinnedIds.has(row.original.protein.id);
          const isInInventory = inventoryIds.has(row.original.protein.id);
          const actions: ProteinBankRowAction[] = [
            {
              id: 'open',
              label: 'Open in Explorer',
            },
            {
              id: 'add-to-inventory',
              label: isInInventory ? 'Remove from Inventory' : 'Add to Inventory',
            },
            {
              id: 'toggle-pinned',
              label: isPinned ? 'Remove from Favorites' : 'Pin to Favorites',
            },
          ];

          return (
            <div className="flex items-center justify-end gap-2">
              <Button size="sm" onClick={() => onOpenProtein(row.original.protein)}>
                Open in Explorer
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label={`Actions for ${row.original.title}`}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-lg">
                  {actions.map((action, index) => (
                    <div key={action.id}>
                      {index > 0 ? <DropdownMenuSeparator /> : null}
                      <DropdownMenuItem
                        onClick={() => {
                          if (action.id === 'open') {
                            onOpenProtein(row.original.protein);
                            return;
                          }

                          if (action.id === 'add-to-inventory') {
                            onToggleInventory(row.original.protein);
                            return;
                          }

                          onTogglePinned(row.original.protein);
                        }}
                      >
                        {action.label}
                      </DropdownMenuItem>
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [inventoryIds, onOpenProtein, onToggleInventory, onTogglePinned, pinnedIds],
  );

  const table = useReactTable({
    data: tableRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.protein.id,
    onSortingChange: (updater) => {
      setSorting((current) => {
        const next = typeof updater === 'function' ? updater(current) : updater;
        onSortKeyChange(proteinBankSortKeyFromSortingState(next));
        return next;
      });
    },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
    },
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedProteins = selectedRows.map((row) => row.original.protein);
  const selectedUnpinnedProteins = selectedProteins.filter((protein) => !pinnedIds.has(protein.id));
  const showDiscoverTools = pageMode === 'explore';

  return (
    <div className="space-y-5">
      {showDiscoverTools ? (
        <Card className="border-border/55 bg-card/92">
          <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs tracking-[0.12em] text-muted-foreground">Protein Bank</p>
              <CardTitle className="text-2xl">Discover structures without the clutter</CardTitle>
              <CardDescription>
                Switch between targeted lookup and browse mode, then open anything into Explorer when you are ready to inspect it.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-border/60 bg-secondary/45 text-foreground">
                {rows.length} available
              </Badge>
              <Badge variant="outline" className="border-border/60 bg-secondary/45 text-foreground">
                {fetchedCount} fetched
              </Badge>
              {activeFilterCount > 0 ? (
                <Badge variant="outline" className="border-border/60 bg-secondary/45 text-foreground">
                  {activeFilterCount} filters active
                </Badge>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <Tabs value={surfaceMode} onValueChange={(value) => setSurfaceMode(value as DiscoverSurfaceMode)}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <TabsList className="h-auto rounded-2xl bg-secondary/35 p-1">
                <TabsTrigger value="search" className="rounded-xl px-4 py-2">
                  Search
                </TabsTrigger>
                <TabsTrigger value="browse" className="rounded-xl px-4 py-2">
                  Browse
                </TabsTrigger>
              </TabsList>

              {hasDiscoverRefinement ? (
                <Button variant="ghost" size="sm" onClick={clearBrowseRefinement}>
                  Clear refinements
                </Button>
              ) : null}
            </div>

            <TabsContent value="search" className="space-y-4">
              <div className="space-y-4 md:px-1">
                <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_auto]">
                  <Combobox
                    options={QUERY_MODE_OPTIONS}
                    value={queryMode}
                    onValueChange={(value) => setQueryMode(value as QueryMode)}
                    placeholder="Choose search mode"
                    searchPlaceholder="Find a search mode..."
                    ariaLabel="Choose search mode"
                    triggerClassName="h-11"
                  />

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={query}
                      placeholder={
                        queryMode === 'id'
                          ? 'Enter a PDB ID, for example 1CRN or 4HHB'
                          : 'Search by protein name, function, gene, or keyword'
                      }
                      className="h-11 rounded-xl border-border/55 bg-background/85 pl-9"
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !isLoading) {
                          void runSearch();
                        }
                      }}
                    />
                  </div>

                  <Button size="lg" className="rounded-xl px-6" onClick={() => void runSearch()} disabled={isLoading}>
                    {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search structures
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Quick starts</span>
                  {QUICK_EXAMPLES.map((example) => (
                    <Button
                      key={example}
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => {
                        setQueryMode('id');
                        setQuery(example);
                      }}
                    >
                      {example}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Search results</h3>
                    <p className="text-sm text-muted-foreground">
                      {searchResultRows.length > 0
                        ? 'Open a result directly or pin it for later.'
                        : 'Results from your latest fetch will appear here.'}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                    {searchResultRows.length} results
                  </Badge>
                </div>

                <ScrollArea className="h-[320px]">
                  <div className="space-y-3 p-1">
                    {searchResultRows.length === 0 ? (
                      <div className="rounded-xl bg-background/55 p-4 text-sm text-muted-foreground">
                        Search for a structure to populate this list.
                      </div>
                    ) : (
                        searchResultRows.map((row) => (
                          <ExplorerListItem
                            key={`search-result-${row.protein.id}`}
                            row={row}
                            selectedId={selectedId}
                            isPinned={pinnedIds.has(row.protein.id)}
                            isInInventory={inventoryIds.has(row.protein.id)}
                            onOpenProtein={onOpenProtein}
                            onTogglePinned={onTogglePinned}
                            onToggleInventory={onToggleInventory}
                          />
                        ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="browse" className="space-y-4">
              <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={libraryQuery}
                      placeholder="Search categories"
                      className="h-11 rounded-xl border-border/55 bg-background/85 pl-9"
                      onChange={(event) => setLibraryQuery(event.target.value)}
                    />
                  </div>

                  <div className="rounded-2xl border border-border/55 bg-secondary/15 p-2">
                    <ScrollArea className="h-[420px]">
                      <div className="space-y-1">
                        {visibleBrowseCategories.length === 0 ? (
                          <div className="rounded-xl px-3 py-4 text-sm text-muted-foreground">No categories match that search.</div>
                        ) : (
                          visibleBrowseCategories.map((category) => {
                            const isActive = category.key === browseCategory;

                            return (
                              <button
                                key={category.key}
                                type="button"
                                className={`flex w-full items-start justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                                  isActive ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
                                }`}
                                onClick={() => setBrowseCategory(category.key)}
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium">{category.title}</p>
                                  <p className="mt-1 line-clamp-2 text-xs">{category.description}</p>
                                </div>
                                <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-xs font-medium text-foreground">
                                  {category.count}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-foreground">{activeBrowseCategory.title}</h3>
                      <p className="text-sm text-muted-foreground">{activeBrowseCategory.description}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                        {browseCategoryRows.length} visible
                      </Badge>
                      <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                        Sorted by {proteinBankSortLabel(sortKey)}
                      </Badge>
                    </div>
                  </div>

                  <ScrollArea className="h-[420px]">
                    <div className="space-y-3 p-4">
                      {browseCategoryRows.length === 0 ? (
                        <div className="rounded-xl bg-background/55 p-4 text-sm text-muted-foreground">
                          Nothing in this category matches the current filters.
                        </div>
                      ) : (
                        browseCategoryRows.map((row) => (
                          <ExplorerListItem
                            key={`${browseCategory}-${row.protein.id}`}
                            row={row}
                            selectedId={selectedId}
                            isPinned={pinnedIds.has(row.protein.id)}
                            isInInventory={inventoryIds.has(row.protein.id)}
                            onOpenProtein={onOpenProtein}
                            onTogglePinned={onTogglePinned}
                            onToggleInventory={onToggleInventory}
                          />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
            </Tabs>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {!error && isLoading ? <p className="text-sm text-muted-foreground">Fetching structures and metadata…</p> : null}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/55 bg-card/92">
          <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs tracking-[0.12em] text-muted-foreground">Inventory</p>
              <CardTitle className="text-2xl">Saved structures</CardTitle>
              <CardDescription>Only proteins you explicitly add to inventory are collected here.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-border/60 bg-secondary/45 text-foreground">
                {inventoryTableRows.length} saved
              </Badge>
              {activeFilterCount > 0 ? (
                <Badge variant="outline" className="border-border/60 bg-secondary/45 text-foreground">
                  {activeFilterCount} filters active
                </Badge>
              ) : null}
            </div>
          </CardHeader>
        </Card>
      )}

      <Card className="border-border/55 bg-card/92">
        <CardContent className="p-0">
          <Accordion type="single" collapsible className="rounded-2xl px-4">
            <AccordionItem value="controls" className="border-none">
              <AccordionTrigger className="py-4 no-underline hover:no-underline">
                <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    Filters and table controls
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                      {tableRows.length} in view
                    </Badge>
                    {activeFilterCount > 0 ? (
                      <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                        {activeFilterCount} filters
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="space-y-4 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Columns3 className="h-4 w-4" />
                        Columns
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52 rounded-lg">
                      <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {table
                        .getAllLeafColumns()
                        .filter((column) => column.getCanHide())
                        .map((column) => (
                          <DropdownMenuCheckboxItem
                            key={column.id}
                            checked={column.getIsVisible()}
                            onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
                            className="capitalize"
                          >
                            {column.id === 'experimentalMethod' ? 'method' : column.id}
                          </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Sort: {proteinBankSortLabel(sortKey)}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 rounded-lg">
                      <DropdownMenuLabel>Sort inventory</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup
                        value={sortKey}
                        onValueChange={(value) => {
                          const nextSortKey = value as ProteinBankSortKey;
                          onSortKeyChange(nextSortKey);
                          setSorting(proteinBankSortingStateFromSortKey(nextSortKey));
                        }}
                      >
                        <DropdownMenuRadioItem value="title">Title</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="pdbId">PDB ID</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="resolution">Resolution</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="chainCount">Chain count</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {activeFilterCount > 0 ? (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Reset filters
                    </Button>
                  ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <Combobox
                    options={collectionOptions}
                    value={filters.collection}
                    onValueChange={(value) => onFiltersChange({ ...filters, collection: value as ProteinBankFilterState['collection'] })}
                    placeholder="All collections"
                    searchPlaceholder="Filter collections..."
                    emptyMessage="No collection matches."
                    ariaLabel="Filter by collection"
                  />

                  <Combobox
                    options={sourceOptions}
                    value={filters.source}
                    onValueChange={(value) => onFiltersChange({ ...filters, source: value as ProteinBankFilterState['source'] })}
                    placeholder="All sources"
                    searchPlaceholder="Filter sources..."
                    emptyMessage="No source matches."
                    ariaLabel="Filter by source"
                  />

                  <Combobox
                    options={organismOptions}
                    value={filters.organism}
                    onValueChange={(value) => onFiltersChange({ ...filters, organism: value })}
                    placeholder="All organisms"
                    searchPlaceholder="Filter organisms..."
                    emptyMessage="No organism matches."
                    ariaLabel="Filter by organism"
                  />

                  <Combobox
                    options={methodOptions}
                    value={filters.experimentalMethod}
                    onValueChange={(value) => onFiltersChange({ ...filters, experimentalMethod: value })}
                    placeholder="All methods"
                    searchPlaceholder="Filter methods..."
                    emptyMessage="No method matches."
                    ariaLabel="Filter by method"
                  />

                  <Combobox
                    options={variantOptions}
                    value={filters.variantPresence}
                    onValueChange={(value) => onFiltersChange({ ...filters, variantPresence: value as ProteinBankFilterState['variantPresence'] })}
                    placeholder="All variant states"
                    searchPlaceholder="Filter variant state..."
                    emptyMessage="No variant state matches."
                    ariaLabel="Filter by variant state"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/55 bg-card/92">
        <CardHeader className="gap-4 border-b border-border/55 bg-secondary/20 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Inventory table</CardTitle>
            <CardDescription>
              {selectedProteins.length > 0
                ? `${selectedProteins.length} row${selectedProteins.length === 1 ? '' : 's'} selected`
                : 'Only proteins explicitly added to inventory appear here.'}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
              {tableRows.length} rows
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (selectedProteins.length === 1) {
                  onOpenProtein(selectedProteins[0]);
                }
              }}
              disabled={selectedProteins.length !== 1}
            >
              Open selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                selectedUnpinnedProteins.forEach((protein) => onTogglePinned(protein));
              }}
              disabled={selectedUnpinnedProteins.length === 0}
            >
              Pin selected
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRowSelection({})} disabled={selectedProteins.length === 0}>
              Clear selection
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {tableRows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Add proteins to inventory from search or browse to populate this table.</div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-secondary/25">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className={selectedId === row.original.protein.id ? 'bg-primary/8' : row.getIsSelected() ? 'bg-secondary/25' : ''}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
