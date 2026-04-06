import * as React from "react";

export type BadgeVariant =
  | "default"
  | "running"
  | "stopped"
  | "paused"
  | "created"
  | "error"
  | "warning"
  | "info";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  status?: BadgeVariant; // Adding this for backward compatibility with older components
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-surface-container-highest text-on-surface",
  running:
    "bg-primary/10 text-primary ring-2 ring-primary/30 shadow-[0_0_8px_2px_rgba(123,208,255,0.15)]",
  stopped: "bg-error-container/80 text-error",
  paused: "bg-surface-container-highest text-on-surface-variant",
  created: "bg-surface-container-high text-on-surface-variant",
  error:
    "bg-error-container/80 text-error ring-2 ring-error/30 shadow-[0_0_8px_2px_rgba(255,180,171,0.15)]",
  warning: "bg-tertiary/10 text-tertiary",
  info: "bg-primary/10 text-primary",
};

export function Badge({
  variant = "default",
  status,
  className = "",
  children,
  ...props
}: BadgeProps) {
  // Use status if provided (backward compatibility), else variant
  const activeVariant = status || variant;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.625rem] sm:text-xs font-semibold uppercase transition-colors ${variantClasses[activeVariant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
