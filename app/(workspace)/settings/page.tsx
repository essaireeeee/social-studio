import type { Metadata } from "next";
import { SettingsIndex } from "@/components/settings/SettingsIndex";

export const metadata: Metadata = {
  title: "Paramètres · HEXAGONE MMA Social Studio",
};

export default function Page() {
  return <SettingsIndex />;
}
