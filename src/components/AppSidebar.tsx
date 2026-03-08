import { Command, Compass, MoreHorizontal, Search, Sparkles, SunMoon, Trash2 } from 'lucide-react';
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
  historyProteins: Protein[];
  selectedId: string | null;
  onSelectProtein: (protein: Protein) => void;
  onTogglePinned: (protein: Protein) => void;
  onRemoveHistory: (proteinId: string) => void;
  onSearch: () => void;
  onAskAI: () => void;
  onProteinBankViewer: () => void;
  onClearHistory: () => void;
  onToggleTheme: () => void;
}

function ProteinShortcutRow({
  protein,
  selectedId,
  onSelect,
  actionLabel,
  onAction,
}: {
  protein: Protein;
  selectedId: string | null;
  onSelect: (protein: Protein) => void;
  actionLabel: string;
  onAction: (protein: Protein) => void;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={selectedId === protein.id}
        onClick={() => onSelect(protein)}
        title={`${protein.name ?? protein.metadata.displayTitle} (${protein.metadata.pdbId ?? protein.id.toUpperCase()})`}
      >
        <span className="text-base leading-none">🧬</span>
        <span className="truncate">{protein.name ?? protein.metadata.displayTitle}</span>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction aria-label={actionLabel}>
            <MoreHorizontal className="h-4 w-4" />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right" className="w-48 rounded-lg">
          <DropdownMenuItem onClick={() => onSelect(protein)}>Open in Explorer</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onAction(protein)}>{actionLabel}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

export function AppSidebar({
  workspace,
  pinnedProteins,
  historyProteins,
  selectedId,
  onSelectProtein,
  onTogglePinned,
  onRemoveHistory,
  onSearch,
  onAskAI,
  onProteinBankViewer,
  onClearHistory,
  onToggleTheme,
}: AppSidebarProps) {
  const { isMobile, setOpen } = useSidebar();

  const closeIfMobile = () => {
    if (isMobile) {
      setOpen(false);
    }
  };

  const handleSelectProtein = (protein: Protein) => {
    onSelectProtein(protein);
    closeIfMobile();
  };

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
                <SidebarMenuButton onClick={() => runNav(onAskAI)}>
                  <Sparkles className="h-4 w-4" />
                  <span>Ask AI</span>
                  <span className="ml-auto text-[10px] tracking-[0.12em] text-sidebar-foreground/45">Cmd+K</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => runNav(onProteinBankViewer)} isActive={workspace === 'protein-bank'}>
                  <Compass className="h-4 w-4" />
                  <span>Protein Bank Viewer</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="rounded-2xl border border-sidebar-border/60 bg-sidebar-accent/18 px-3 py-2 text-sm leading-6 text-sidebar-foreground/65">
          Pinned proteins and history stay available while you move between views.
        </div>
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
                        protein={protein}
                        selectedId={selectedId}
                        onSelect={handleSelectProtein}
                        actionLabel="Remove from Favorites"
                        onAction={onTogglePinned}
                      />
                    ))}
                  </SidebarMenu>
                )}
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>History</SidebarGroupLabel>
              <SidebarGroupContent>
                {historyProteins.length === 0 ? (
                  <div className="px-2 text-sm leading-6 text-sidebar-foreground/55">Viewed proteins will appear here.</div>
                ) : (
                  <SidebarMenu>
                    {historyProteins.map((protein) => (
                      <ProteinShortcutRow
                        key={`history-${protein.id}`}
                        protein={protein}
                        selectedId={selectedId}
                        onSelect={handleSelectProtein}
                        actionLabel="Remove from History"
                        onAction={(entry) => onRemoveHistory(entry.id)}
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
