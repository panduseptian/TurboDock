"use client";

import * as React from "react";

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-surface/80 backdrop-blur-sm animate-in fade-in"
        onClick={() => onOpenChange?.(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onOpenChange?.(false);
        }}
        role="presentation"
      />
      {/* Content wrapper */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-50 w-full max-w-lg"
      >
        {children}
      </div>
    </div>
  );
}

export function DialogContent({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`glass rounded-xl shadow-ambient p-0 animate-in zoom-in-95 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogHeader({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-6 pt-6 pb-2 ${className}`} {...props} />;
}

export function DialogTitle({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={`headline-sm text-on-surface ${className}`} {...props} />
  );
}

export function DialogDescription({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`body-sm text-on-surface-variant mt-1 ${className}`}
      {...props}
    />
  );
}

export function DialogFooter({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`px-6 pb-6 pt-4 flex items-center justify-end gap-3 ${className}`}
      {...props}
    />
  );
}
