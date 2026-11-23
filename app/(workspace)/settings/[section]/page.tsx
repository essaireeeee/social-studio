import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AiSettingsPage } from "@/components/settings/AiSettingsPage";

/**
 * Paramètres par section. Phase 6 : « Intelligence artificielle » (`ai`).
 * Préférences, données et utilisateurs arrivent en Phase 11 : d'ici là, ces adresses
 * renvoient une page introuvable plutôt qu'un écran vide.
 */
const SECTIONS = {
  ai: { title: "Intelligence artificielle", Component: AiSettingsPage },
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
