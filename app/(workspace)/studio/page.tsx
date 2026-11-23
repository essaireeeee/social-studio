import type { Metadata } from "next";
import { Suspense } from "react";
import { StudioProvider } from "@/components/studio/StudioContext";
import { StudioPage } from "@/components/studio/StudioPage";

export const metadata: Metadata = {
  title: "Social Studio · HEXAGONE MMA",
};

export default function Page() {
  return (
    <StudioProvider>
      {/* `?mode=` est lu côté client : l'enveloppe statique reste instantanée. */}
      <Suspense fallback={<div className="h-96" aria-busy="true" />}>
        <StudioPage />
      </Suspense>
    </StudioProvider>
  );
}
