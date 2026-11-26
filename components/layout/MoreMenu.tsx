"use client";

import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { useAiOverview } from "@/hooks/useAiOverview";
import { useNow } from "@/hooks/useNow";
import { useActiveUser } from "@/hooks/useRepository";
import { syncLabel } from "@/lib/shell/sync-label";
import { useDataStore } from "@/stores/data.store";
import { useUiStore } from "@/stores/ui.store";

const item =
  "flex min-h-11 cursor-pointer items-center justify-between gap-6 px-4 text-body text-foreground outline-none select-none data-[disabled]:cursor-default data-[highlighted]:bg-fill";

/** Menu « ⋯ » de la barre de navigation sur mobile : recherche, état du moteur et de la sauvegarde, profil. */
export function MoreMenu() {
  const { indicator } = useAiOverview();
  const sync = useDataStore((s) => s.fileSync);
  const now = useNow();
  const user = useActiveUser();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="flex size-11 cursor-pointer items-center justify-center rounded-full text-accent-text hover:bg-fill active:opacity-60"
        aria-label="Plus d'actions"
      >
        <Ellipsis className="size-5" aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-64 overflow-hidden rounded-xl bg-surface-float py-1 shadow-float squircle"
        >
          <DropdownMenu.Item
            className={item}
            onSelect={() => useUiStore.getState().setCommandOpen(true)}
          >
            Rechercher
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-separator" />
          <DropdownMenu.Item className={item} asChild>
            <Link href="/settings/ai">
              Moteur
              <span className="text-muted-foreground">{indicator.text}</span>
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={item} disabled>
            Sauvegarde
            <span className="text-subheadline text-muted-foreground">
              {syncLabel(sync, now).text}
            </span>
          </DropdownMenu.Item>
          {user ? (
            <DropdownMenu.Item className={item} asChild>
              <Link href="/settings/users">
                Profil
                <span className="text-muted-foreground">{user.name}</span>
              </Link>
            </DropdownMenu.Item>
          ) : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
