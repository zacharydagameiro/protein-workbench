import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Home, Search, Sparkles, SunMoon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut, } from './ui/command.js';
export function AppCommandPalette({ open, pinnedProteins, historyProteins, onOpenChange, onGoHome, onGoProteinBank, onToggleTheme, onOpenProtein, onOpenPdbId, }) {
    const [query, setQuery] = useState('');
    useEffect(() => {
        if (!open) {
            setQuery('');
        }
    }, [open]);
    const trimmedQuery = query.trim();
    const directPdbLabel = trimmedQuery.toUpperCase();
    const recentProteins = useMemo(() => historyProteins.slice(0, 8), [historyProteins]);
    const favoriteProteins = useMemo(() => pinnedProteins.slice(0, 8), [pinnedProteins]);
    const runAction = (callback) => {
        onOpenChange(false);
        void callback();
    };
    return (_jsxs(CommandDialog, { open: open, onOpenChange: onOpenChange, title: "Ask AI", description: "Quick actions, protein shortcuts, and direct PDB loading.", children: [_jsx(CommandInput, { placeholder: "Jump to a view, open a protein, or type a PDB ID\u2026", value: query, onValueChange: setQuery }), _jsxs(CommandList, { children: [_jsx(CommandEmpty, { children: "No matching actions or proteins." }), _jsxs(CommandGroup, { heading: "Navigation", children: [_jsxs(CommandItem, { value: "search protein bank viewer", onSelect: () => runAction(onGoProteinBank), children: [_jsx(Search, { className: "h-4 w-4" }), _jsx("span", { children: "Open Protein Bank Viewer" }), _jsx(CommandShortcut, { children: "Search" })] }), _jsxs(CommandItem, { value: "home explorer", onSelect: () => runAction(onGoHome), children: [_jsx(Home, { className: "h-4 w-4" }), _jsx("span", { children: "Open Home" })] }), _jsxs(CommandItem, { value: "toggle theme", onSelect: () => runAction(onToggleTheme), children: [_jsx(SunMoon, { className: "h-4 w-4" }), _jsx("span", { children: "Toggle theme" })] })] }), trimmedQuery ? (_jsxs(_Fragment, { children: [_jsx(CommandSeparator, {}), _jsx(CommandGroup, { heading: "Direct PDB", children: _jsxs(CommandItem, { value: `direct pdb ${directPdbLabel}`, onSelect: () => runAction(() => onOpenPdbId(directPdbLabel)), children: [_jsx(Sparkles, { className: "h-4 w-4" }), _jsxs("span", { children: ["Load PDB ID ", directPdbLabel] })] }) })] })) : null, favoriteProteins.length > 0 ? (_jsxs(_Fragment, { children: [_jsx(CommandSeparator, {}), _jsx(CommandGroup, { heading: "Favorites", children: favoriteProteins.map((protein) => (_jsxs(CommandItem, { value: `favorite ${protein.name ?? protein.metadata.displayTitle} ${protein.metadata.pdbId ?? protein.id}`, onSelect: () => runAction(() => onOpenProtein(protein)), children: [_jsx("span", { className: "text-base leading-none", children: "\u2605" }), _jsx("span", { children: protein.name ?? protein.metadata.displayTitle })] }, `favorite-${protein.id}`))) })] })) : null, recentProteins.length > 0 ? (_jsxs(_Fragment, { children: [_jsx(CommandSeparator, {}), _jsx(CommandGroup, { heading: "History", children: recentProteins.map((protein) => (_jsxs(CommandItem, { value: `history ${protein.name ?? protein.metadata.displayTitle} ${protein.metadata.pdbId ?? protein.id}`, onSelect: () => runAction(() => onOpenProtein(protein)), children: [_jsx("span", { className: "text-base leading-none", children: "\uD83E\uDDEC" }), _jsx("span", { children: protein.name ?? protein.metadata.displayTitle })] }, `history-${protein.id}`))) })] })) : null] })] }));
}
