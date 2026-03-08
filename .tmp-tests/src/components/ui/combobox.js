import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check, ChevronsUpDown } from 'lucide-react';
import * as React from 'react';
import { cn } from '../../lib/utils.js';
import { Button } from './button.js';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from './command.js';
import { Popover, PopoverContent, PopoverTrigger } from './popover.js';
export function Combobox({ options, value, onValueChange, placeholder, searchPlaceholder = 'Search options...', emptyMessage = 'No matches found.', disabled = false, className, triggerClassName, contentClassName, ariaLabel, }) {
    const [open, setOpen] = React.useState(false);
    const selectedOption = options.find((option) => option.value === value) ?? null;
    return (_jsxs(Popover, { open: open, onOpenChange: setOpen, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { type: "button", variant: "outline", role: "combobox", "aria-expanded": open, "aria-label": ariaLabel ?? placeholder, disabled: disabled, className: cn('w-full justify-between rounded-xl', triggerClassName), children: [_jsx("span", { className: "truncate", children: selectedOption?.label ?? placeholder }), _jsx(ChevronsUpDown, { className: "h-4 w-4 shrink-0 text-muted-foreground" })] }) }), _jsx(PopoverContent, { className: cn('p-0', contentClassName), align: "start", children: _jsxs(Command, { className: className, children: [_jsx(CommandInput, { placeholder: searchPlaceholder }), _jsxs(CommandList, { children: [_jsx(CommandEmpty, { children: emptyMessage }), options.map((option) => (_jsxs(CommandItem, { value: option.value, keywords: [option.label, ...(option.keywords ?? [])], disabled: option.disabled, onSelect: () => {
                                        onValueChange(option.value);
                                        setOpen(false);
                                    }, children: [_jsx(Check, { className: cn('h-4 w-4', value === option.value ? 'opacity-100' : 'opacity-0') }), _jsx("span", { children: option.label })] }, option.value)))] })] }) })] }));
}
