import type { Metadata } from "next";
import { DashboardPage } from "@/components/dashboard/DashboardPage";

export const metadata: Metadata = { title: "Accueil · HEXAGONE MMA Social Studio" };

export default function Page() {
  return <DashboardPage />;
}
