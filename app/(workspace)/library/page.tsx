import type { Metadata } from "next";
import { LibraryPage } from "@/components/library/LibraryPage";

export const metadata: Metadata = {
  title: "Bibliothèque · HEXAGONE MMA Social Studio",
};

export default function Page() {
  return <LibraryPage />;
}
