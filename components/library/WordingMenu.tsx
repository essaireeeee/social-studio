"use client";

import { Copy, CopyPlus, Ellipsis, Eye, PenLine, Sparkles, Trash2 } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Wording } from "@/types/domain";

export type WordingAction = "consult" | "edit" | "duplicate" | "copy" | "reference" | "delete";

const itemClass =
  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-subtle [&_svg]:size-4 [&_svg]:text-muted-foreground";

function Item({
  icon,
  children,
  onSelect,
  danger,
}: {
  icon: ReactNode;
  children: ReactNode;
  onSelect: () => void;
  danger?: boolean;
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={danger ? `${itemClass} text-danger` : itemClass}
    >
      {icon}
      {children}
    </DropdownMenu.Item>
  );
}

/** Actions d'une publication (section 14.1). */
export function WordingMenu({
  wording,
  onAction,
}: {
  wording: Wording;
  onAction: (action: WordingAction, wording: Wording) => void;
}) {
  const run = (action: WordingAction) => () => onAction(action, wording);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button size="icon" variant="ghost" aria-label="Actions de la publication">
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="z-50 min-w-52 rounded-md border border-border bg-elevated p-1 text-13 shadow-lg"
        >
          <Item icon={<Eye aria-hidden="true" />} onSelect={run("consult")}>
            Consulter
          </Item>
          <Item icon={<PenLine aria-hidden="true" />} onSelect={run("edit")}>
            Modifier
          </Item>
          <Item icon={<CopyPlus aria-hidden="true" />} onSelect={run("duplicate")}>
            Dupliquer
          </Item>
          <Item icon={<Copy aria-hidden="true" />} onSelect={run("copy")}>
            Copier le texte
          </Item>
          <DropdownMenu.CheckboxItem
            checked={wording.isReference}
            disabled={wording.isDemo && !wording.isReference}
            onSelect={run("reference")}
            className={itemClass}
          >
            <Sparkles aria-hidden="true" />
            Référence de style
            <span className="ml-auto text-xs text-muted-foreground">
              {wording.isReference ? "Oui" : "Non"}
            </span>
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <Item icon={<Trash2 aria-hidden="true" />} onSelect={run("delete")} danger>
            Supprimer…
          </Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
