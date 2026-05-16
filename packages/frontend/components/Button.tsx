"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./icons";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
};

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-lg \
   transition-all duration-150 ease-out \
   active:scale-[0.97] \
   disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 \
   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B75C3A]/30 focus-visible:ring-offset-1 \
   cursor-pointer select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-[#B75C3A] text-white \
     hover:brightness-110 \
     active:brightness-95",
  secondary:
    "border border-[#D4D4D4] text-[#2D2D2D] bg-white \
     hover:bg-[#F5F4F2] \
     active:bg-[#EBEBEB]",
  danger:
    "text-[#C75B5B] \
     hover:bg-red-50 hover:text-[#B84C4C] \
     active:bg-red-100",
  ghost:
    "text-[#6B6B6B] \
     hover:bg-[#F5F4F2] hover:text-[#2D2D2D] \
     active:bg-[#EBEBEB]",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  disabled,
  className = "",
  ...props
}: Props) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Spinner size={16} className="animate-spin" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
