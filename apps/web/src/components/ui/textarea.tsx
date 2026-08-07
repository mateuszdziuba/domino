import * as React from "react";
import { cn } from "../../lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-sm border border-[#b99f6b] bg-[#fbf3dd] px-3 py-2 text-sm text-[#2e2113] shadow-[inset_0_1px_3px_rgba(90,60,20,0.12)] placeholder:text-[#a08b5c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a97e1f] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
