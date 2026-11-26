import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** État vide (section 5.5) : icône 48 px, titre Title 3, une phrase, un bouton. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      <Icon className="size-12 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
      <h2 className="text-title-3 text-foreground">{title}</h2>
      <p className="max-w-sm text-subheadline text-muted-foreground">{description}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
