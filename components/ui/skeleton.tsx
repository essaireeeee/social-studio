import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Bloc de chargement : pulsation douce, coupée si le mouvement est réduit. */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-skeleton rounded-lg bg-fill motion-reduce:animate-none", className)}
      {...props}
    />
  );
}
