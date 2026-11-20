import type { Metadata } from "next";
import { EditorialPage } from "@/components/editorial/EditorialPage";

export const metadata: Metadata = {
  title: "ADN éditorial · HEXAGONE MMA Social Studio",
};

export default function Page() {
  return <EditorialPage />;
}
