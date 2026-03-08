import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
import { cn } from '../../lib/utils.js';
const Select = React.forwardRef(({ className, children, ...props }, ref) => (_jsx("select", { ref: ref, className: cn('flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', className), ...props, children: children })));
Select.displayName = 'Select';
export { Select };
