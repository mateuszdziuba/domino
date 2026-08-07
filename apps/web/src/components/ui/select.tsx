import * as React from "react";
import { cn } from "../../lib/utils";

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-sm border border-[#b99f6b] bg-[#fbf3dd] px-3 py-1 text-sm text-[#2e2113] shadow-[inset_0_1px_3px_rgba(90,60,20,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a97e1f] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export { Select };
