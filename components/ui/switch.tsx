"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Interrupteur iOS 51 × 31 px, vert `--success` quand il est actif (section 5.5). */
export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer items-center rounded-full bg-[rgba(120,120,128,0.16)] p-[2px] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 data-[state=checked]:bg-success-fill dark:bg-[rgba(120,120,128,0.32)]",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_3px_1px_rgba(0,0,0,0.06)] transition-transform duration-200 data-[state=checked]:translate-x-5" />
    </SwitchPrimitive.Root>
  );
}
