import type { Metadata } from "next";
import { ValidatedPage } from "@/components/validated/ValidatedPage";

export const metadata: Metadata = { title: "Publications validées · HEXAGONE MMA Social Studio" };

export default function Page() {
  return <ValidatedPage />;
}
