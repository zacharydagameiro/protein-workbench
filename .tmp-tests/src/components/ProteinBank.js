import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, } from '@tanstack/react-table';
import { ArrowUpDown, Check, Circle, Columns3, Filter, LoaderCircle, MoreHorizontal, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { loadProteinById, searchAndLoadProteins } from '../services/pdbService.js';
import { getProteinBankOptions } from '../utils/proteinBank.js';
import { proteinBankSortKeyFromSortingState, proteinBankSortLabel, proteinBankSortingStateFromSortKey, } from '../utils/proteinBankTable.js';
import { Badge } from './ui/badge.js';
import { Button } from './ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.js';
import { Combobox } from './ui/combobox.js';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger, } from './ui/dropdown-menu.js';
import { Input } from './ui/input.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table.js';
function ProteinBankHeader({ title, column, }) {
    const sortState = column.getIsSorted();
    return (_jsxs(Button, { variant: "ghost", size: "sm", className: "-ml-3 h-8 px-3 text-muted-foreground hover:text-foreground", onClick: () => column.toggleSorting(sortState === 'asc'), children: [title, _jsx(ArrowUpDown, { className: "h-3.5 w-3.5" })] }));
}
export function ProteinBank({ rows, selectedId, filters, sortKey, pinnedIds, onFiltersChange, onSortKeyChange, onSearchResults, onOpenProtein, onTogglePinned, }) {
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState('text');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sorting, setSorting] = useState(() => proteinBankSortingStateFromSortKey(sortKey));
    const [columnVisibility, setColumnVisibility] = useState({});
    const [columnFilters] = useState([]);
    const [rowSelection, setRowSelection] = useState({});
    const options = useMemo(() => getProteinBankOptions(rows), [rows]);
    const collectionOptions = useMemo(() => [
        { value: 'all', label: 'All collections' },
        { value: 'starter', label: 'Starter proteins' },
        { value: 'pinned', label: 'Pinned proteins' },
        { value: 'history', label: 'History proteins' },
        { value: 'search', label: 'Fetched results' },
    ], []);
    const sourceOptions = useMemo(() => [
        { value: 'all', label: 'All sources' },
        { value: 'sample', label: 'Teaching samples' },
        { value: 'rcsb', label: 'RCSB' },
    ], []);
    const organismOptions = useMemo(() => [{ value: 'all', label: 'All organisms' }, ...options.organisms.map((organism) => ({ value: organism, label: organism }))], [options.organisms]);
    const methodOptions = useMemo(() => [{ value: 'all', label: 'All methods' }, ...options.methods.map((method) => ({ value: method, label: method }))], [options.methods]);
    const variantOptions = useMemo(() => [
        { value: 'all', label: 'All variant states' },
        { value: 'with-variants', label: 'With variants' },
        { value: 'without-variants', label: 'Without variants' },
    ], []);
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
        }
        catch (searchError) {
            setError(searchError instanceof Error ? searchError.message : 'Search failed.');
            onSearchResults([]);
        }
        finally {
            setIsLoading(false);
        }
    };
    const columns = useMemo(() => [
        {
            id: 'select',
            enableSorting: false,
            enableHiding: false,
            header: ({ table }) => (_jsx(Button, { variant: "ghost", size: "sm", className: "-ml-3 h-8 px-3", onClick: () => table.toggleAllRowsSelected(!table.getIsAllRowsSelected()), "aria-label": "Select all rows", children: table.getIsAllRowsSelected() ? _jsx(Check, { className: "h-4 w-4" }) : _jsx(Circle, { className: "h-4 w-4" }) })),
            cell: ({ row }) => (_jsx(Button, { variant: row.getIsSelected() ? 'secondary' : 'ghost', size: "icon", className: "h-8 w-8", onClick: () => row.toggleSelected(!row.getIsSelected()), "aria-label": `${row.getIsSelected() ? 'Deselect' : 'Select'} ${row.original.title}`, children: row.getIsSelected() ? _jsx(Check, { className: "h-4 w-4" }) : _jsx(Circle, { className: "h-4 w-4" }) })),
        },
        {
            accessorKey: 'title',
            id: 'title',
            header: ({ column }) => _jsx(ProteinBankHeader, { title: "Protein", column: column }),
            sortingFn: (left, right) => left.original.title.localeCompare(right.original.title),
            cell: ({ row }) => (_jsxs("div", { className: "space-y-1", children: [_jsx("div", { className: "font-medium text-foreground", children: row.original.title }), _jsx("div", { className: "text-xs text-muted-foreground", children: row.original.protein.metadata.functionSummary ?? row.original.protein.metadata.description })] })),
        },
        {
            accessorKey: 'pdbLabel',
            id: 'pdbId',
            header: ({ column }) => _jsx(ProteinBankHeader, { title: "PDB ID", column: column }),
            cell: ({ row }) => _jsx("span", { className: "font-mono text-xs text-muted-foreground", children: row.original.pdbLabel }),
        },
        {
            accessorKey: 'collections',
            id: 'collections',
            enableSorting: false,
            header: 'Collections',
            cell: ({ row }) => (_jsx("div", { className: "flex flex-wrap gap-2", children: row.original.collections.map((collection) => (_jsx(Badge, { variant: "outline", className: "capitalize", children: collection }, `${row.original.protein.id}-${collection}`))) })),
        },
        {
            accessorFn: (row) => row.protein.metadata.source,
            id: 'source',
            header: 'Source',
            cell: ({ row }) => _jsx("span", { className: "capitalize text-muted-foreground", children: row.original.protein.metadata.source }),
        },
        {
            accessorKey: 'organism',
            id: 'organism',
            header: 'Organism',
            cell: ({ row }) => _jsx("span", { className: "text-muted-foreground", children: row.original.organism }),
        },
        {
            accessorKey: 'experimentalMethod',
            id: 'experimentalMethod',
            header: 'Method',
            cell: ({ row }) => _jsx("span", { className: "text-muted-foreground", children: row.original.experimentalMethod }),
        },
        {
            accessorKey: 'resolution',
            id: 'resolution',
            header: ({ column }) => _jsx(ProteinBankHeader, { title: "Resolution", column: column }),
            cell: ({ row }) => (_jsx("span", { className: "text-muted-foreground", children: row.original.resolution ? `${row.original.resolution.toFixed(2)} Å` : 'Unavailable' })),
        },
        {
            accessorKey: 'chainCount',
            id: 'chainCount',
            header: ({ column }) => _jsx(ProteinBankHeader, { title: "Chains", column: column }),
            cell: ({ row }) => _jsx("span", { className: "text-muted-foreground", children: row.original.chainCount }),
        },
        {
            accessorKey: 'variantCount',
            id: 'variantCount',
            header: 'Variants',
            cell: ({ row }) => _jsx("span", { className: "text-muted-foreground", children: row.original.variantCount }),
        },
        {
            id: 'actions',
            enableSorting: false,
            enableHiding: false,
            header: () => _jsx("div", { className: "text-right", children: "Actions" }),
            cell: ({ row }) => {
                const isPinned = pinnedIds.has(row.original.protein.id);
                const actions = [
                    {
                        id: 'open',
                        label: 'Open in Explorer',
                    },
                    {
                        id: 'toggle-pinned',
                        label: isPinned ? 'Remove from Favorites' : 'Pin to Favorites',
                    },
                ];
                return (_jsxs("div", { className: "flex items-center justify-end gap-2", children: [_jsx(Button, { size: "sm", onClick: () => onOpenProtein(row.original.protein), children: "Open in Explorer" }), _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsx(Button, { variant: "outline", size: "icon", "aria-label": `Actions for ${row.original.title}`, children: _jsx(MoreHorizontal, { className: "h-4 w-4" }) }) }), _jsx(DropdownMenuContent, { align: "end", className: "w-48 rounded-lg", children: actions.map((action, index) => (_jsxs("div", { children: [index > 0 ? _jsx(DropdownMenuSeparator, {}) : null, _jsx(DropdownMenuItem, { onClick: () => {
                                                    if (action.id === 'open') {
                                                        onOpenProtein(row.original.protein);
                                                        return;
                                                    }
                                                    onTogglePinned(row.original.protein);
                                                }, children: action.label })] }, action.id))) })] })] }));
            },
        },
    ], [onOpenProtein, onTogglePinned, pinnedIds]);
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
    return (_jsxs("div", { className: "space-y-5", children: [_jsxs(Card, { className: "border-border/55 bg-card/92", children: [_jsxs(CardHeader, { className: "gap-4 lg:flex-row lg:items-end lg:justify-between", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-xs tracking-[0.12em] text-muted-foreground", children: "Protein Bank" }), _jsx(CardTitle, { className: "text-2xl", children: "Dedicated structure discovery" }), _jsx(CardDescription, { children: "Search the PDB, refine the merged inventory, and open proteins into Explorer when you want to inspect them." })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs(Badge, { variant: "outline", className: "border-border/60 bg-secondary/45 text-foreground", children: [rows.length, " proteins"] }), _jsxs(Badge, { variant: "outline", className: "border-border/60 bg-secondary/45 text-foreground", children: [rows.filter((row) => row.collections.includes('search')).length, " fetched"] })] })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "grid gap-3 xl:grid-cols-[auto_minmax(0,1fr)_auto]", children: [_jsxs("div", { className: "flex rounded-xl border border-border/55 bg-secondary/35 p-1", children: [_jsx(Button, { variant: mode === 'text' ? 'secondary' : 'ghost', size: "sm", onClick: () => setMode('text'), children: "Text search" }), _jsx(Button, { variant: mode === 'id' ? 'secondary' : 'ghost', size: "sm", onClick: () => setMode('id'), children: "Direct PDB ID" })] }), _jsxs("div", { className: "flex flex-col gap-3 sm:flex-row", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" }), _jsx(Input, { value: query, placeholder: mode === 'id' ? 'Example: 1CRN or 4HHB' : 'Example: kinase, hemoglobin, membrane transport', className: "h-11 rounded-xl border-border/55 bg-background/80 pl-9", onChange: (event) => setQuery(event.target.value), onKeyDown: (event) => {
                                                            if (event.key === 'Enter' && !isLoading) {
                                                                void runSearch();
                                                            }
                                                        } })] }), _jsxs(Button, { className: "h-11 rounded-xl", onClick: () => void runSearch(), disabled: isLoading, children: [isLoading ? _jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : _jsx(Search, { className: "h-4 w-4" }), "Search"] })] }), _jsx("div", { className: "flex flex-wrap items-center gap-2", children: ['1CRN', '4HHB', '1BNA'].map((example) => (_jsx(Button, { variant: "outline", size: "sm", className: "rounded-lg", onClick: () => {
                                                setMode('id');
                                                setQuery(example);
                                            }, children: example }, example))) })] }), error ? _jsx("p", { className: "text-sm text-destructive", children: error }) : null, !error && isLoading ? _jsx("p", { className: "text-sm text-muted-foreground", children: "Fetching structures and metadata\u2026" }) : null] })] }), _jsxs("div", { className: "sticky top-4 z-10 rounded-2xl border border-border/55 bg-card/90 p-4 backdrop-blur", children: [_jsxs("div", { className: "mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-medium", children: [_jsx(Filter, { className: "h-4 w-4 text-muted-foreground" }), "Search, filter, and sort"] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", size: "sm", children: [_jsx(Columns3, { className: "h-4 w-4" }), "Columns"] }) }), _jsxs(DropdownMenuContent, { align: "end", className: "w-52 rounded-lg", children: [_jsx(DropdownMenuLabel, { children: "Visible columns" }), _jsx(DropdownMenuSeparator, {}), table
                                                        .getAllLeafColumns()
                                                        .filter((column) => column.getCanHide())
                                                        .map((column) => (_jsx(DropdownMenuCheckboxItem, { checked: column.getIsVisible(), onCheckedChange: (value) => column.toggleVisibility(Boolean(value)), className: "capitalize", children: column.id === 'experimentalMethod' ? 'method' : column.id }, column.id)))] })] }), _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", size: "sm", children: ["Sort: ", proteinBankSortLabel(sortKey)] }) }), _jsxs(DropdownMenuContent, { align: "end", className: "w-48 rounded-lg", children: [_jsx(DropdownMenuLabel, { children: "Sort inventory" }), _jsx(DropdownMenuSeparator, {}), _jsxs(DropdownMenuRadioGroup, { value: sortKey, onValueChange: (value) => {
                                                            const nextSortKey = value;
                                                            onSortKeyChange(nextSortKey);
                                                            setSorting(proteinBankSortingStateFromSortKey(nextSortKey));
                                                        }, children: [_jsx(DropdownMenuRadioItem, { value: "title", children: "Title" }), _jsx(DropdownMenuRadioItem, { value: "pdbId", children: "PDB ID" }), _jsx(DropdownMenuRadioItem, { value: "resolution", children: "Resolution" }), _jsx(DropdownMenuRadioItem, { value: "chainCount", children: "Chain count" })] })] })] })] })] }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2 xl:grid-cols-5", children: [_jsx(Combobox, { options: collectionOptions, value: filters.collection, onValueChange: (value) => onFiltersChange({ ...filters, collection: value }), placeholder: "All collections", searchPlaceholder: "Filter collections...", emptyMessage: "No collection matches.", ariaLabel: "Filter by collection" }), _jsx(Combobox, { options: sourceOptions, value: filters.source, onValueChange: (value) => onFiltersChange({ ...filters, source: value }), placeholder: "All sources", searchPlaceholder: "Filter sources...", emptyMessage: "No source matches.", ariaLabel: "Filter by source" }), _jsx(Combobox, { options: organismOptions, value: filters.organism, onValueChange: (value) => onFiltersChange({ ...filters, organism: value }), placeholder: "All organisms", searchPlaceholder: "Filter organisms...", emptyMessage: "No organism matches.", ariaLabel: "Filter by organism" }), _jsx(Combobox, { options: methodOptions, value: filters.experimentalMethod, onValueChange: (value) => onFiltersChange({ ...filters, experimentalMethod: value }), placeholder: "All methods", searchPlaceholder: "Filter methods...", emptyMessage: "No method matches.", ariaLabel: "Filter by method" }), _jsx(Combobox, { options: variantOptions, value: filters.variantPresence, onValueChange: (value) => onFiltersChange({ ...filters, variantPresence: value }), placeholder: "All variant states", searchPlaceholder: "Filter variant state...", emptyMessage: "No variant state matches.", ariaLabel: "Filter by variant state" })] }), _jsxs("div", { className: "mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between", children: [_jsx("p", { className: "text-sm text-muted-foreground", children: "Refine the inventory before opening structures into Explorer." }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx(Button, { variant: "secondary", size: "sm", onClick: () => {
                                            if (selectedProteins.length === 1) {
                                                onOpenProtein(selectedProteins[0]);
                                            }
                                        }, disabled: selectedProteins.length !== 1, children: "Open selected" }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => {
                                            selectedUnpinnedProteins.forEach((protein) => onTogglePinned(protein));
                                        }, disabled: selectedUnpinnedProteins.length === 0, children: "Pin selected" }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => setRowSelection({}), disabled: selectedProteins.length === 0, children: "Clear selection" })] })] })] }), _jsxs(Card, { className: "overflow-hidden border-border/55 bg-card/92", children: [_jsxs(CardHeader, { className: "border-b border-border/55 bg-secondary/20", children: [_jsx(CardTitle, { className: "text-lg", children: "Protein inventory" }), _jsx(CardDescription, { children: selectedProteins.length > 0 ? `${selectedProteins.length} row${selectedProteins.length === 1 ? '' : 's'} selected` : 'Each row supports direct open, selection, and quick save actions.' })] }), _jsx(CardContent, { className: "p-0", children: rows.length === 0 ? (_jsx("div", { className: "p-6 text-sm text-muted-foreground", children: "Search or change the filters to populate the bank." })) : (_jsxs(Table, { children: [_jsx(TableHeader, { className: "sticky top-0 z-10 bg-secondary/25", children: table.getHeaderGroups().map((headerGroup) => (_jsx(TableRow, { className: "hover:bg-transparent", children: headerGroup.headers.map((header) => (_jsx(TableHead, { children: header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext()) }, header.id))) }, headerGroup.id))) }), _jsx(TableBody, { children: table.getRowModel().rows.map((row) => (_jsx(TableRow, { className: selectedId === row.original.protein.id ? 'bg-primary/8' : row.getIsSelected() ? 'bg-secondary/25' : '', children: row.getVisibleCells().map((cell) => (_jsx(TableCell, { children: flexRender(cell.column.columnDef.cell, cell.getContext()) }, cell.id))) }, row.id))) })] })) })] })] }));
}
