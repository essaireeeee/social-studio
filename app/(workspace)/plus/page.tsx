import type { Metadata } from "next";
import { MorePage } from "@/components/more/MorePage";

export const metadata: Metadata = {
  title: "Plus · HEXAGONE MMA Social Studio",
};

export default function Page() {
  return <MorePage />;
}
