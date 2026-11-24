import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AiSettingsPage } from "@/components/settings/AiSettingsPage";
import { DataPage } from "@/components/settings/data/DataPage";
import { PreferencesPage } from "@/components/settings/preferences/PreferencesPage";
import { UsersPage } from "@/components/settings/users/UsersPage";

/** Paramètres par section (sections 11.5 et 16.3). Une section inconnue renvoie un vrai 404. */
const SECTIONS = {
  ai: { title: "Intelligence artificielle", Component: AiSettingsPage },
  preferences: { title: "Préférences", Component: PreferencesPage },
  data: { title: "Gestion des données", Component: DataPage },
  users: { title: "Utilisateurs", Component: UsersPage },
} as const;

/**
 * Navigation bloquante assumée : la section vient de l'URL et une section inconnue doit
 * renvoyer un vrai 404, ce qu'un rendu en flux derrière `<Suspense>` ne garantit pas.
 */
export const instant = false;

type Section = keyof typeof SECTIONS;
const isSection = (value: string): value is Section => value in SECTIONS;

export function generateStaticParams() {
  return Object.keys(SECTIONS).map((section) => ({ section }));
}

export async function generateMetadata({
  params,
}: PageProps<"/settings/[section]">): Promise<Metadata> {
  const { section } = await params;
  return {
    title: isSection(section)
      ? `${SECTIONS[section].title} · Paramètres · HEXAGONE MMA Social Studio`
      : "Paramètres · HEXAGONE MMA Social Studio",
  };
}

export default async function Page({ params }: PageProps<"/settings/[section]">) {
  const { section } = await params;
  if (!isSection(section)) notFound();
  const { Component } = SECTIONS[section];
  return <Component />;
}
