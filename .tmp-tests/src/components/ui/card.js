import { jsx as _jsx } from "react/jsx-runtime";
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';
const cardVariants = cva('rounded-xl border border-border bg-card text-card-foreground shadow-sm', {
    variants: {
        size: {
            default: '',
            sm: 'rounded-lg',
        },
    },
    defaultVariants: {
        size: 'default',
    },
});
export function Card({ className, size, ...props }) {
    return _jsx("div", { className: cn(cardVariants({ size }), className), ...props });
}
export function CardHeader({ className, ...props }) {
    return _jsx("div", { className: cn('grid auto-rows-min grid-cols-[1fr_auto] items-start gap-1.5 p-6', className), ...props });
}
export function CardTitle({ className, ...props }) {
    return _jsx("h3", { className: cn('font-semibold leading-none tracking-tight', className), ...props });
}
export function CardDescription({ className, ...props }) {
    return _jsx("p", { className: cn('text-sm text-muted-foreground', className), ...props });
}
export function CardAction({ className, ...props }) {
    return _jsx("div", { className: cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className), ...props });
}
export function CardContent({ className, ...props }) {
    return _jsx("div", { className: cn('p-6 pt-0', className), ...props });
}
export function CardFooter({ className, ...props }) {
    return _jsx("div", { className: cn('flex items-center p-6 pt-0', className), ...props });
}
