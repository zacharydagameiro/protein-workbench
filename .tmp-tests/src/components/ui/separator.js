import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../../lib/utils.js';
export function Separator({ className, orientation = 'horizontal', ...props }) {
    return (_jsx("div", { role: "separator", "aria-orientation": orientation, className: cn('shrink-0 bg-border', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', className), ...props }));
}
