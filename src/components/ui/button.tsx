import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-white text-black hover:bg-zinc-200 active:scale-[0.98]",
        outline:
          "border border-zinc-800 bg-black text-white hover:border-zinc-600 hover:bg-zinc-950",
        ghost:
          "text-zinc-400 hover:bg-zinc-900 hover:text-white",
        spotify:
          "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-200 hover:shadow-[0_0_24px_-4px_rgba(16,185,129,0.35)] active:scale-[0.98]",
        spotifyConnected:
          "border border-emerald-500/60 bg-emerald-500/15 text-emerald-200 cursor-default",
        youtube:
          "border border-red-500/40 bg-red-500/10 text-red-300 hover:border-red-400 hover:bg-red-500/20 hover:text-red-200 hover:shadow-[0_0_24px_-4px_rgba(239,68,68,0.35)] active:scale-[0.98]",
        youtubeConnected:
          "border border-red-500/60 bg-red-500/15 text-red-200 cursor-default",
        copy:
          "border border-zinc-800 bg-zinc-950 text-white hover:border-zinc-600 hover:bg-zinc-900 shrink-0",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
