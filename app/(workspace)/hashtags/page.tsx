import type { Metadata } from "next";
import { HashtagsPage } from "@/components/hashtags/HashtagsPage";

export const metadata: Metadata = {
  title: "Hashtags & signatures · HEXAGONE MMA Social Studio",
};

export default function Page() {
  return <HashtagsPage />;
}
