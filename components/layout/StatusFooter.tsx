"use client";

import Link from "next/link";
import { EngineIndicator } from "./EngineIndicator";
import { SyncIndicator } from "./SyncIndicator";
import { UserBadge } from "./UserBadge";

/** Pied de la sidebar : moteur actif, sauvegarde du fichier local, profil actif. */
export function StatusFooter() {
  return (
    <div className="flex flex-col gap-2 border-t-[0.5px] border-separator px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="flex flex-wrap items-center gap-1.5">
        <EngineIndicator />
        <SyncIndicator />
      </div>
      <Link
        href="/settings/users"
        className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-fill/60"
        title="Changer de profil"
      >
        <UserBadge />
      </Link>
    </div>
  );
}
