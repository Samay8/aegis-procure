import Link from "next/link";
import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-[5px] font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-accent-strong text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] hover:bg-[#3b7cf0] active:bg-[#2a63cc]",
        secondary: "border border-line-strong bg-panel-2 text-ink hover:border-[#434b57] hover:bg-panel-3",
        ghost: "text-ink-2 hover:bg-panel-3 hover:text-ink",
        outline: "border border-line-strong text-ink hover:bg-panel-2",
        danger: "border border-risk/40 bg-risk/10 text-risk-ink hover:bg-risk/15",
        quiet: "bg-panel-3 text-ink hover:bg-[#29303a]",
      },
      size: {
        xs: "h-7 px-2 text-xs",
        sm: "h-8 px-3 text-[13px]",
        md: "h-9 px-3.5 text-[13px]",
        lg: "h-11 px-5 text-sm",
        icon: "h-8 w-8 p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

type Variants = VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ComponentProps<"button"> & Variants) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function ButtonLink({ className, variant, size, ...props }: ComponentProps<typeof Link> & Variants) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
