"use client";

import { useActiveUser } from "@/hooks/useRepository";

/** Profil actif : nom et rôle. Le changement de profil arrive avec Paramètres > Utilisateurs. */
export function UserBadge() {
  const user = useActiveUser();
  if (!user) return null;
  const role = user.role === "admin" ? "Administrateur" : "CM";
  const initials = user.name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="flex items-center gap-2" aria-label={`Profil actif : ${user.name}, ${role}`}>
      <span
        className="flex size-7 items-center justify-center rounded-full border border-border bg-elevated text-[11px] font-semibold"
        aria-hidden="true"
      >
        {initials}
      </span>
      <span className="hidden flex-col leading-tight lg:flex" aria-hidden="true">
        <span className="text-xs font-medium">{user.name}</span>
        <span className="text-[11px] text-muted-foreground">{role}</span>
      </span>
    </span>
  );
}
