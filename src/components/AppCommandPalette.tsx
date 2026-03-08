import { Home, Search, Sparkles, SunMoon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Protein } from '../types/structure.js';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './ui/command.js';

interface AppCommandPaletteProps {
  open: boolean;
  pinnedProteins: Protein[];
  historyProteins: Protein[];
  onOpenChange: (open: boolean) => void;
  onGoHome: () => void;
  onGoProteinBank: () => void;
  onToggleTheme: () => void;
  onOpenProtein: (protein: Protein) => void;
  onOpenPdbId: (pdbId: string) => Promise<void> | void;
}

export function AppCommandPalette({
  open,
  pinnedProteins,
  historyProteins,
  onOpenChange,
  onGoHome,
  onGoProteinBank,
  onToggleTheme,
  onOpenProtein,
  onOpenPdbId,
}: AppCommandPaletteProps) {
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

  const runAction = (callback: () => void | Promise<void>) => {
    onOpenChange(false);
    void callback();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Ask AI" description="Quick actions, protein shortcuts, and direct PDB loading.">
      <CommandInput placeholder="Jump to a view, open a protein, or type a PDB ID…" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No matching actions or proteins.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem value="search protein bank viewer" onSelect={() => runAction(onGoProteinBank)}>
            <Search className="h-4 w-4" />
            <span>Open Protein Bank Viewer</span>
            <CommandShortcut>Search</CommandShortcut>
          </CommandItem>
          <CommandItem value="home explorer" onSelect={() => runAction(onGoHome)}>
            <Home className="h-4 w-4" />
            <span>Open Home</span>
          </CommandItem>
          <CommandItem value="toggle theme" onSelect={() => runAction(onToggleTheme)}>
            <SunMoon className="h-4 w-4" />
            <span>Toggle theme</span>
          </CommandItem>
        </CommandGroup>

        {trimmedQuery ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Direct PDB">
              <CommandItem value={`direct pdb ${directPdbLabel}`} onSelect={() => runAction(() => onOpenPdbId(directPdbLabel))}>
                <Sparkles className="h-4 w-4" />
                <span>Load PDB ID {directPdbLabel}</span>
              </CommandItem>
            </CommandGroup>
          </>
        ) : null}

        {favoriteProteins.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Favorites">
              {favoriteProteins.map((protein) => (
                <CommandItem
                  key={`favorite-${protein.id}`}
                  value={`favorite ${protein.name ?? protein.metadata.displayTitle} ${protein.metadata.pdbId ?? protein.id}`}
                  onSelect={() => runAction(() => onOpenProtein(protein))}
                >
                  <span className="text-base leading-none">★</span>
                  <span>{protein.name ?? protein.metadata.displayTitle}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        {recentProteins.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="History">
              {recentProteins.map((protein) => (
                <CommandItem
                  key={`history-${protein.id}`}
                  value={`history ${protein.name ?? protein.metadata.displayTitle} ${protein.metadata.pdbId ?? protein.id}`}
                  onSelect={() => runAction(() => onOpenProtein(protein))}
                >
                  <span className="text-base leading-none">🧬</span>
                  <span>{protein.name ?? protein.metadata.displayTitle}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
