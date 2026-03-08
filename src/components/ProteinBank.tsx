import {
  type ColumnDef,
  type ColumnFiltersState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, Check, Circle, Columns3, Filter, LoaderCircle, MoreHorizontal, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { loadProteinById, searchAndLoadProteins } from '../services/pdbService.js';
import type {
  Protein,
  ProteinBankFilterState,
  ProteinBankRow,
  ProteinBankRowAction,
  ProteinBankSortKey,
} from '../types/structure.js';
import { getProteinBankOptions } from '../utils/proteinBank.js';
import {
  proteinBankSortKeyFromSortingState,
  proteinBankSortLabel,
  proteinBankSortingStateFromSortKey,
} from '../utils/proteinBankTable.js';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table.js';

interface ProteinBankProps {
  rows: ProteinBankRow[];
  selectedId: string | null;
  filters: ProteinBankFilterState;
  sortKey: ProteinBankSortKey;
  pinnedIds: Set<string>;
  onFiltersChange: (filters: ProteinBankFilterState) => void;
  onSortKeyChange: (sortKey: ProteinBankSortKey) => void;
  onSearchResults: (proteins: Protein[]) => void;
  onOpenProtein: (protein: Protein) => void;
  onTogglePinned: (protein: Protein) => void;
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

export function ProteinBank({
  rows,
  selectedId,
  filters,
  sortKey,
  pinnedIds,
  onFiltersChange,
  onSortKeyChange,
  onSearchResults,
  onOpenProtein,
  onTogglePinned,
}: ProteinBankProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'id' | 'text'>('text');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>(() => proteinBankSortingStateFromSortKey(sortKey));
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const options = useMemo(() => getProteinBankOptions(rows), [rows]);
  const collectionOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: 'all', label: 'All collections' },
      { value: 'starter', label: 'Starter proteins' },
      { value: 'pinned', label: 'Pinned proteins' },
      { value: 'history', label: 'History proteins' },
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

  useEffect(() => {
    setSorting(proteinBankSortingStateFromSortKey(sortKey));
  }, [sortKey]);

  const runSearch = async () => {
    if (!query.trim()) {
      setError('Enter a PDB ID or a search phrase.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const proteins = mode === 'id' ? [await loadProteinById(query.trim())] : await searchAndLoadProteins(query.trim());
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
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium text-foreground">{row.original.title}</div>
            <div className="text-xs text-muted-foreground">{row.original.protein.metadata.functionSummary ?? row.original.protein.metadata.description}</div>
          </div>
        ),
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
          const actions: ProteinBankRowAction[] = [
            {
              id: 'open',
              label: 'Open in Explorer',
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
    [onOpenProtein, onTogglePinned, pinnedIds],
  );

  const table = useReactTable({
    data: rows,
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
      columnFilters,
      rowSelection,
    },
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedProteins = selectedRows.map((row) => row.original.protein);
  const selectedUnpinnedProteins = selectedProteins.filter((protein) => !pinnedIds.has(protein.id));

  return (
    <div className="space-y-5">
      <Card className="border-border/55 bg-card/92">
        <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs tracking-[0.12em] text-muted-foreground">Protein Bank</p>
            <CardTitle className="text-2xl">Dedicated structure discovery</CardTitle>
            <CardDescription>
              Search the PDB, refine the merged inventory, and open proteins into Explorer when you want to inspect them.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-border/60 bg-secondary/45 text-foreground">
              {rows.length} proteins
            </Badge>
            <Badge variant="outline" className="border-border/60 bg-secondary/45 text-foreground">
              {rows.filter((row) => row.collections.includes('search')).length} fetched
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-[auto_minmax(0,1fr)_auto]">
            <div className="flex rounded-xl border border-border/55 bg-secondary/35 p-1">
              <Button variant={mode === 'text' ? 'secondary' : 'ghost'} size="sm" onClick={() => setMode('text')}>
                Text search
              </Button>
              <Button variant={mode === 'id' ? 'secondary' : 'ghost'} size="sm" onClick={() => setMode('id')}>
                Direct PDB ID
              </Button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  placeholder={mode === 'id' ? 'Example: 1CRN or 4HHB' : 'Example: kinase, hemoglobin, membrane transport'}
                  className="h-11 rounded-xl border-border/55 bg-background/80 pl-9"
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !isLoading) {
                      void runSearch();
                    }
                  }}
                />
              </div>
              <Button className="h-11 rounded-xl" onClick={() => void runSearch()} disabled={isLoading}>
                {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {['1CRN', '4HHB', '1BNA'].map((example) => (
                <Button
                  key={example}
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => {
                    setMode('id');
                    setQuery(example);
                  }}
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!error && isLoading ? <p className="text-sm text-muted-foreground">Fetching structures and metadata…</p> : null}
        </CardContent>
      </Card>

      <div className="sticky top-4 z-10 rounded-2xl border border-border/55 bg-card/90 p-4 backdrop-blur">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Search, filter, and sort
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns3 className="h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-lg">
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
              <DropdownMenuContent align="end" className="w-48 rounded-lg">
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
          </div>
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

        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">Refine the inventory before opening structures into Explorer.</p>
          <div className="flex flex-wrap items-center gap-2">
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
        </div>
      </div>

      <Card className="overflow-hidden border-border/55 bg-card/92">
        <CardHeader className="border-b border-border/55 bg-secondary/20">
          <CardTitle className="text-lg">Protein inventory</CardTitle>
          <CardDescription>
            {selectedProteins.length > 0 ? `${selectedProteins.length} row${selectedProteins.length === 1 ? '' : 's'} selected` : 'Each row supports direct open, selection, and quick save actions.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Search or change the filters to populate the bank.</div>
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
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
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
