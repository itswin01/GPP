/**
 * shadcn-shaped primitives, hand-written.
 *
 * Same component API and class conventions as shadcn/ui, but implemented on
 * plain React instead of Radix. The solver UI only needs presentational
 * pieces (no portals, no focus traps), so dropping Radix removes ~12
 * transitive dependencies without changing a single call site.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

/* ----------------------------------------------------------------- Card */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 p-5", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
);

export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props} />
);

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-5 pt-0", className)} {...props} />
);

export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center p-5 pt-0", className)} {...props} />
);

/* --------------------------------------------------------------- Button */
type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-base",
  icon: "h-10 w-10",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";

/* ---------------------------------------------------------------- Input */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm",
        "placeholder:text-muted-foreground focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("text-sm font-medium leading-none", className)} {...props} />
);

/* ---------------------------------------------------------------- Badge */
type BadgeVariant = "default" | "secondary" | "outline" | "success" | "warning" | "danger";

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  default: "bg-primary/10 text-primary border-primary/20",
  secondary: "bg-secondary text-secondary-foreground border-transparent",
  outline: "border-border text-muted-foreground",
  success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  danger: "bg-red-500/10 text-red-600 border-red-500/20",
};

export const Badge = ({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
      BADGE_VARIANTS[variant],
      className,
    )}
    {...props}
  />
);

/* ------------------------------------------------------------- Progress */
export const Progress = ({
  value,
  className,
  indicatorClassName,
}: {
  value: number;
  className?: string;
  indicatorClassName?: string;
}) => (
  <div className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)}>
    <div
      className={cn("h-full rounded-full bg-primary transition-all duration-500", indicatorClassName)}
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
    />
  </div>
);

/* --------------------------------------------------------------- Switch */
export const Switch = ({
  checked,
  onCheckedChange,
  id,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  id?: string;
}) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onCheckedChange(!checked)}
    className={cn(
      "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      checked ? "bg-primary" : "bg-input",
    )}
  >
    <span
      className={cn(
        "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
        checked ? "translate-x-6" : "translate-x-1",
      )}
    />
  </button>
);

/* ------------------------------------------------------------ Separator */
export const Separator = ({ className }: { className?: string }) => (
  <div className={cn("h-px w-full bg-border", className)} />
);

/* --------------------------------------------------------------- Select */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

/* ----------------------------------------------------------- Skeleton */
export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-md bg-muted", className)} />
);
