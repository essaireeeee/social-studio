import type { Metadata } from "next";
import { HistoryPage } from "@/components/history/HistoryPage";

export const metadata: Metadata = { title: "Historique · HEXAGONE MMA Social Studio" };

export default function Page() {
  return <HistoryPage />;
}
