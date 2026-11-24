import type { Metadata } from "next";
import { FightersPage } from "@/components/fighters/FightersPage";

export const metadata: Metadata = {
  title: "Combattants · HEXAGONE MMA Social Studio",
};

export default function Page() {
  return <FightersPage />;
}
