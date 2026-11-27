import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AboutPage } from "@/components/french/screens/AboutPage";
import { DictionaryPage } from "@/components/french/screens/DictionaryPage";
import { FrenchSettingsPage } from "@/components/french/screens/FrenchSettingsPage";
import { RulesPage } from "@/components/french/screens/RulesPage";
import { TrainingPage } from "@/components/french/screens/TrainingPage";
import { WeakPointsPage } from "@/components/french/screens/WeakPointsPage";
import { FRENCH_SECTIONS } from "@/lib/shell/navigation";

/** Sous-pages de l'Atelier Français (section 6.5). Une section inconnue renvoie un vrai 404. */
const SCREENS = {
  stats: WeakPointsPage,
  training: TrainingPage,
  rules: RulesPage,
  dictionary: DictionaryPage,
  settings: FrenchSettingsPage,
  about: AboutPage,
} as const;

export const instant = false;

type Section = keyof typeof SCREENS;
const isSection = (value: string): value is Section => value in SCREENS;

export function generateStaticParams() {
  return Object.keys(SCREENS).map((section) => ({ section }));
}

export async function generateMetadata({
  params,
}: PageProps<"/french/[section]">): Promise<Metadata> {
  const { section } = await params;
  const label = FRENCH_SECTIONS.find((s) => s.id === section)?.label;
  return { title: `${label ? `${label} · ` : ""}Atelier Français · HEXAGONE MMA Social Studio` };
}

export default async function Page({ params }: PageProps<"/french/[section]">) {
  const { section } = await params;
  if (!isSection(section)) notFound();
  const Screen = SCREENS[section];
  return <Screen />;
}
