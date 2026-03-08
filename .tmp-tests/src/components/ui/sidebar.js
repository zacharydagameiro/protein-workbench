import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { PanelLeft } from 'lucide-react';
import * as React from 'react';
import { cn } from '../../lib/utils.js';
import { Button } from './button.js';
import { Slot } from '@radix-ui/react-slot';
const SidebarContext = React.createContext(null);
function useSidebar() {
    const context = React.useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider.');
    }
    return context;
}
function SidebarProvider({ defaultOpen = true, open: openProp, onOpenChange, children, }) {
    const [openState, setOpenState] = React.useState(defaultOpen);
    const open = openProp ?? openState;
    const setOpen = React.useCallback((value) => {
        const next = typeof value === 'function' ? value(open) : value;
        if (openProp === undefined) {
            setOpenState(next);
        }
        onOpenChange?.(next);
    }, [onOpenChange, open, openProp]);
    const [isMobile, setIsMobile] = React.useState(false);
    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const media = window.matchMedia('(max-width: 1023px)');
        const update = () => setIsMobile(media.matches);
        update();
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);
    return _jsx(SidebarContext.Provider, { value: { open, setOpen, isMobile }, children: children });
}
const Sidebar = React.forwardRef(({ className, side = 'left', ...props }, ref) => {
    const { open, isMobile, setOpen } = useSidebar();
    return (_jsxs(_Fragment, { children: [isMobile ? (_jsx("div", { className: cn('fixed inset-0 z-40 bg-black/50 transition-opacity', open ? 'opacity-100' : 'pointer-events-none opacity-0'), onClick: () => setOpen(false) })) : null, _jsx("aside", { ref: ref, className: cn('fixed inset-y-0 z-50 flex w-[20rem] flex-col border-r border-sidebar-border/70 bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-200 lg:static lg:translate-x-0 lg:shadow-none', side === 'left' ? 'left-0' : 'right-0 border-l border-r-0', open ? 'translate-x-0' : side === 'left' ? '-translate-x-full' : 'translate-x-full', className), ...props })] }));
});
Sidebar.displayName = 'Sidebar';
const SidebarInset = React.forwardRef(({ className, ...props }, ref) => (_jsx("div", { ref: ref, className: cn('flex h-screen min-h-0 min-w-0 flex-1 flex-col overflow-hidden', className), ...props })));
SidebarInset.displayName = 'SidebarInset';
function SidebarTrigger({ className, ...props }) {
    const { setOpen } = useSidebar();
    return (_jsxs(Button, { variant: "outline", size: "icon", className: className, onClick: () => setOpen((current) => !current), ...props, children: [_jsx(PanelLeft, { className: "h-4 w-4" }), _jsx("span", { className: "sr-only", children: "Toggle sidebar" })] }));
}
const SidebarHeader = React.forwardRef(({ className, ...props }, ref) => (_jsx("div", { ref: ref, className: cn('flex flex-col gap-3 p-3', className), ...props })));
SidebarHeader.displayName = 'SidebarHeader';
const SidebarContent = React.forwardRef(({ className, ...props }, ref) => (_jsx("div", { ref: ref, className: cn('flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-3 pt-0', className), ...props })));
SidebarContent.displayName = 'SidebarContent';
const SidebarFooter = React.forwardRef(({ className, ...props }, ref) => (_jsx("div", { ref: ref, className: cn('mt-auto border-t border-sidebar-border/70 p-3', className), ...props })));
SidebarFooter.displayName = 'SidebarFooter';
const SidebarGroup = React.forwardRef(({ className, ...props }, ref) => (_jsx("div", { ref: ref, className: cn('flex flex-col gap-2', className), ...props })));
SidebarGroup.displayName = 'SidebarGroup';
const SidebarGroupLabel = React.forwardRef(({ className, ...props }, ref) => (_jsx("div", { ref: ref, className: cn('px-2 text-xs font-medium tracking-[0.08em] text-sidebar-foreground/55', className), ...props })));
SidebarGroupLabel.displayName = 'SidebarGroupLabel';
const SidebarGroupContent = React.forwardRef(({ className, ...props }, ref) => (_jsx("div", { ref: ref, className: cn('flex flex-col gap-1', className), ...props })));
SidebarGroupContent.displayName = 'SidebarGroupContent';
const SidebarMenu = React.forwardRef(({ className, ...props }, ref) => (_jsx("div", { ref: ref, className: cn('flex flex-col gap-1', className), ...props })));
SidebarMenu.displayName = 'SidebarMenu';
const SidebarMenuItem = React.forwardRef(({ className, ...props }, ref) => (_jsx("div", { ref: ref, className: cn('group/menu-item relative', className), ...props })));
SidebarMenuItem.displayName = 'SidebarMenuItem';
const SidebarMenuButton = React.forwardRef(({ className, isActive, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (_jsx(Comp, { ref: ref, className: cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors outline-none', isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/78 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground', className), ...props }));
});
SidebarMenuButton.displayName = 'SidebarMenuButton';
const SidebarMenuAction = React.forwardRef(({ className, ...props }, ref) => (_jsx("button", { ref: ref, className: cn('absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1 text-sidebar-foreground/55 opacity-0 transition-opacity group-hover/menu-item:opacity-100 group-focus-within/menu-item:opacity-100 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', className), ...props })));
SidebarMenuAction.displayName = 'SidebarMenuAction';
function SidebarRail({ className, ...props }) {
    return _jsx("div", { className: cn('w-px bg-sidebar-border/40', className), ...props });
}
export { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuAction, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger, useSidebar, };
