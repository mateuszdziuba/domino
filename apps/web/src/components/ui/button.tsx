import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4",
  {
    variants: {
      variant: {
        default:
          "border border-[#5c3a15] bg-gradient-to-b from-[#b0802f] to-[#7a4b1d] font-display uppercase tracking-[0.08em] text-[#fdf3dc] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_5px_rgba(40,25,5,0.35)] hover:from-[#c08d38] hover:to-[#8a5a20]",
        destructive:
          "border border-[#6d1414] bg-gradient-to-b from-[#a32a2a] to-[#7c1717] text-[#fdf3dc] hover:from-[#b53434] hover:to-[#8a1c1c]",
        outline:
          "border border-[#a97e1f] bg-transparent font-display uppercase tracking-[0.08em] text-[#3a2c17] hover:bg-[#e8d3a0]/50",
        secondary:
          "border border-[#b69a5f] bg-[#dcc89a] text-[#3a2c17] hover:bg-[#d0b983]",
        ghost: "text-[#3a2c17] hover:bg-[#e4d3ab]/60",
        link: "text-[#7a4b1d] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-sm px-3 text-xs",
        lg: "h-10 rounded-sm px-8 text-base",
        icon: "h-9 w-9",
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
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
