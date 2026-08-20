import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-fg/15 bg-fg/10 transition-colors",
        "data-[state=checked]:bg-fg data-[state=checked]:border-fg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "block size-5 rounded-full bg-fg shadow-sm transition-transform translate-x-1",
          "data-[state=checked]:translate-x-6 data-[state=checked]:bg-bg",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
