"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "gold" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "icon";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white border-brand hover:bg-forest-2 hover:border-forest-2",
  gold: "bg-gold text-white border-gold hover:bg-gold-deep hover:border-gold-deep",
  secondary: "bg-card text-ink border-line hover:border-gold/60 hover:bg-white",
  ghost: "bg-transparent text-muted border-transparent hover:bg-cream hover:text-ink",
  danger: "bg-card text-danger border-line hover:border-danger/50 hover:bg-danger/5",
};
const sizes: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1.5 text-xs rounded-lg",
  md: "px-3.5 py-2.5 text-sm rounded-[9px]",
  icon: "h-8 w-8 rounded-lg text-xs",
};

/** Also usable on `<Link>` so anchor buttons share the same look. */
export const buttonClass = (variant: ButtonVariant = "secondary", size: ButtonSize = "md", extra?: string) =>
  cn(
    "inline-flex cursor-pointer items-center justify-center gap-2 border font-medium whitespace-nowrap transition-all duration-200",
    "hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(23,53,42,.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
    "disabled:pointer-events-none disabled:opacity-55",
    variants[variant],
    sizes[size],
    extra,
  );

interface Props extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children?: React.ReactNode;
}

export function Button({ variant = "secondary", size = "md", loading, className, children, disabled, type = "button", ...rest }: Props) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.97 }}
      disabled={disabled || loading}
      className={buttonClass(variant, size, className)}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </motion.button>
  );
}
