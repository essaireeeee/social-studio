"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Onglets accessibles au clavier, présentés comme un contrôle segmenté iOS. */
export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-[9px] bg-fill p-0.5 squircle",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex h-7 shrink-0 cursor-pointer items-center gap-2 rounded-[7px] px-3 text-13 font-medium whitespace-nowrap text-muted-foreground accent-transition hover:text-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-surface data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-[0_3px_8px_rgba(0,0,0,0.12)] dark:data-[state=active]:bg-surface-3 pointer-coarse:h-10",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("mt-4", className)} {...props} />;
}
