import { Command, Compass, MoreHorizontal, Search, SunMoon, Trash2 } from 'lucide-react';
import type { Protein, WorkspaceTab } from '../types/structure.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu.js';
import { ScrollArea } from './ui/scroll-area.js';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from './ui/sidebar.js';

interface AppSidebarProps {
  workspace: WorkspaceTab;
  pinnedProteins: Protein[];
  inventoryProteins: Protein[];
  historyProteins: Protein[];
  selectedSidebarEntryId: string | null;
  onSelectProtein: (protein: Protein, entryId: string) => void;
  onTogglePinned: (protein: Protein) => void;
  onToggleInventory: (protein: Protein) => void;
  onRenameProtein: (
    protein: Protein,
    nextName: string,
    options: { saveToFavorites: boolean; saveToInventory: boolean; updateHistory: boolean },
  ) => void;
  onRemoveHistory: (proteinId: string) => void;
  onSearch: () => void;
  onExplore: () => void;
  onInventory: () => void;
  onClearHistory: () => void;
  onToggleTheme: () => void;
}

function ProteinShortcutRow({
  entryId,
  section,
  protein,
  isFavorite,
  isInInventory,
  selectedSidebarEntryId,
  onSelect,
  onTogglePinned,
  onToggleInventory,
  onRenameProtein,
  onRemoveHistory,
}: {
  entryId: string;
  section: 'favorite' | 'history' | 'inventory';
  protein: Protein;
  isFavorite: boolean;
  isInInventory: boolean;
  selectedSidebarEntryId: string | null;
  onSelect: (protein: Protein, entryId: string) => void;
  onTogglePinned: (protein: Protein) => void;
  onToggleInventory: (protein: Protein) => void;
  onRenameProtein: (
    protein: Protein,
    nextName: string,
    options: { saveToFavorites: boolean; saveToInventory: boolean; updateHistory: boolean },
  ) => void;
  onRemoveHistory: (proteinId: string) => void;
}) {
  const historyActionLabel = section === 'history' ? 'Remove from Recent' : null;

  return (
    <SidebarMenuItem className="w-full max-w-full">
      <SidebarMenuButton
        isActive={selectedSidebarEntryId === entryId}
        className="w-full max-w-full min-w-0 overflow-hidden pr-12"
        onClick={() => onSelect(protein, entryId)}
        title={`${protein.name ?? protein.metadata.displayTitle} (${protein.metadata.pdbId ?? protein.id.toUpperCase()})`}
      >
        <span className="text-base leading-none">🧬</span>
        <span className="block max-w-[12.5rem] min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
          {protein.name ?? protein.metadata.displayTitle}
        </span>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            aria-label={`More actions for ${protein.name ?? protein.metadata.displayTitle}`}
            className="right-1 opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right" className="w-48 rounded-lg">
          <DropdownMenuItem onClick={() => onSelect(protein, entryId)}>Open in Explorer</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onTogglePinned(protein)}>
            {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onToggleInventory(protein)}>
            {isInInventory ? 'Remove from Inventory' : 'Add to Inventory'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const nextName = window.prompt('Rename protein', protein.name ?? protein.metadata.displayTitle);
              if (!nextName || !nextName.trim()) {
                return;
              }

              onRenameProtein(protein, nextName, {
                saveToFavorites: isFavorite,
                saveToInventory: isInInventory,
                updateHistory: section === 'history',
              });
            }}
          >
            Rename
          </DropdownMenuItem>
          {historyActionLabel ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onRemoveHistory(protein.id)}>{historyActionLabel}</DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

export function AppSidebar({
  workspace,
  pinnedProteins,
  inventoryProteins,
  historyProteins,
  selectedSidebarEntryId,
  onSelectProtein,
  onTogglePinned,
  onToggleInventory,
  onRenameProtein,
  onRemoveHistory,
  onSearch,
  onExplore,
  onInventory,
  onClearHistory,
  onToggleTheme,
}: AppSidebarProps) {
  const { isMobile, setOpen } = useSidebar();

  const closeIfMobile = () => {
    if (isMobile) {
      setOpen(false);
    }
  };

  const handleSelectProtein = (protein: Protein, entryId: string) => {
    onSelectProtein(protein, entryId);
    closeIfMobile();
  };

  const favoriteIds = new Set(pinnedProteins.map((protein) => protein.id));
  const inventoryIds = new Set(inventoryProteins.map((protein) => protein.id));

  const runNav = (callback: () => void) => {
    callback();
    closeIfMobile();
  };

  return (
    <Sidebar className="border-r border-sidebar-border/60 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--sidebar)_92%,black_8%)_0%,color-mix(in_oklab,var(--sidebar)_100%,black_0%)_100%)]">
      <SidebarHeader className="gap-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="rounded-xl px-1.5 py-1.5 hover:bg-transparent">
              <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                <Command className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-sidebar-foreground">Protein Workbench</div>
                <div className="truncate text-xs text-sidebar-foreground/55">Explorer dashboard</div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarGroup className="rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/30 p-2">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => runNav(onSearch)}>
                  <Search className="h-4 w-4" />
                  <span>Search</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => runNav(onExplore)} isActive={workspace === 'protein-bank'}>
                  <Compass className="h-4 w-4" />
                  <span>Explore</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => runNav(onInventory)} isActive={workspace === 'inventory'}>
                  <Compass className="h-4 w-4" />
                  <span>Inventory</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="h-full pr-1">
          <div className="space-y-6 pb-4">
            <SidebarGroup>
              <SidebarGroupLabel>Favorites</SidebarGroupLabel>
              <SidebarGroupContent>
                {pinnedProteins.length === 0 ? (
                  <div className="px-2 text-sm leading-6 text-sidebar-foreground/55">
                    Pin proteins from Protein Bank to keep them here.
                  </div>
                ) : (
                  <SidebarMenu>
                    {pinnedProteins.map((protein) => (
                      <ProteinShortcutRow
                        key={`favorite-${protein.id}`}
                        entryId={`favorite:${protein.id}`}
                        section="favorite"
                        protein={protein}
                        isFavorite={favoriteIds.has(protein.id)}
                        isInInventory={inventoryIds.has(protein.id)}
                        selectedSidebarEntryId={selectedSidebarEntryId}
                        onSelect={handleSelectProtein}
                        onTogglePinned={onTogglePinned}
                        onToggleInventory={onToggleInventory}
                        onRenameProtein={onRenameProtein}
                        onRemoveHistory={onRemoveHistory}
                      />
                    ))}
                  </SidebarMenu>
                )}
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Recent</SidebarGroupLabel>
              <SidebarGroupContent>
                {historyProteins.length === 0 ? (
                  <div className="px-2 text-sm leading-6 text-sidebar-foreground/55">Viewed proteins will appear here.</div>
                ) : (
                  <SidebarMenu>
                    {historyProteins.map((protein) => (
                      <ProteinShortcutRow
                        key={`history-${protein.id}`}
                        entryId={`history:${protein.id}`}
                        section="history"
                        protein={protein}
                        isFavorite={favoriteIds.has(protein.id)}
                        isInInventory={inventoryIds.has(protein.id)}
                        selectedSidebarEntryId={selectedSidebarEntryId}
                        onSelect={handleSelectProtein}
                        onTogglePinned={onTogglePinned}
                        onToggleInventory={onToggleInventory}
                        onRenameProtein={onRenameProtein}
                        onRemoveHistory={onRemoveHistory}
                      />
                    ))}
                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => runNav(onClearHistory)} className="text-sidebar-foreground/68">
                        <Trash2 className="h-4 w-4" />
                        <span>Clear history</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                )}
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Inventory</SidebarGroupLabel>
              <SidebarGroupContent>
                {inventoryProteins.length === 0 ? (
                  <div className="px-2 text-sm leading-6 text-sidebar-foreground/55">Saved inventory proteins will appear here.</div>
                ) : (
                  <SidebarMenu>
                    {inventoryProteins.map((protein) => (
                      <ProteinShortcutRow
                        key={`inventory-${protein.id}`}
                        entryId={`inventory:${protein.id}`}
                        section="inventory"
                        protein={protein}
                        isFavorite={favoriteIds.has(protein.id)}
                        isInInventory={inventoryIds.has(protein.id)}
                        selectedSidebarEntryId={selectedSidebarEntryId}
                        onSelect={handleSelectProtein}
                        onTogglePinned={onTogglePinned}
                        onToggleInventory={onToggleInventory}
                        onRenameProtein={onRenameProtein}
                        onRemoveHistory={onRemoveHistory}
                      />
                    ))}
                  </SidebarMenu>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onToggleTheme}>
              <SunMoon className="h-4 w-4" />
              <span>Toggle theme</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
