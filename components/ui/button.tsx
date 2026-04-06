"use client";

import { Button as HeroButton } from "@heroui/react";
import * as React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "tertiary";
type ButtonSize = "sm" | "md" | "lg" | "icon" | "sm-icon";

export interface ButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "color"
> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: React.ReactNode;
}

const variantMap: Record<ButtonVariant, { className: string }> = {
  primary: {
    className:
      "gradient-primary text-on-primary font-semibold hover:brightness-110 active:brightness-95",
  },
  secondary: {
    className:
      "bg-transparent text-primary hover:bg-surface-container-highest/40 active:bg-surface-container-highest/60",
  },
  ghost: {
    className:
      "bg-transparent text-on-surface-variant hover:bg-surface-container-highest/40 active:bg-surface-container-highest/60",
  },
  tertiary: {
    className:
      "bg-surface-container-highest text-on-surface hover:brightness-110 active:brightness-95",
  },
  danger: {
    className:
      "bg-error-container text-error hover:brightness-110 active:brightness-95",
  },
};

const sizeMap: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
  icon: "h-10 w-10 p-0 flex items-center justify-center",
  "sm-icon": "h-8 w-8 p-0 flex items-center justify-center",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      className = "",
      children,
      onClick,
      ...props
    },
    ref,
  ) => {
    const v = variantMap[variant];
    const s = sizeMap[size];

    return (
      <HeroButton
        ref={ref}
        className={`inline-flex items-center justify-center rounded-md font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${v.className} ${s} ${className}`}
        onPress={onClick as unknown as () => void}
        {...(props as Record<string, unknown>)}
      >
        {children}
      </HeroButton>
    );
  },
);
Button.displayName = "Button";
