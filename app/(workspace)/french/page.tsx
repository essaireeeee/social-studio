import type { Metadata } from "next";
import { FrenchHome } from "@/components/french/screens/FrenchHome";

export const metadata: Metadata = { title: "Atelier Français · HEXAGONE MMA Social Studio" };

export default function Page() {
  return <FrenchHome />;
}
