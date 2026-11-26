"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useMedia";

/**
 * Transition de navigation (section 5.6) : glissement horizontal à ressort ; fondu de 100 ms
 * si le mouvement est réduit. Le style de transformation est retiré à la fin, pour ne pas
 * changer le repère des éléments fixes de la page.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  return (
    <motion.div
      key={pathname}
      initial={reduced ? { opacity: 0 } : { opacity: 0, x: 24 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
      transition={reduced ? { duration: 0.1 } : { type: "spring", stiffness: 380, damping: 36 }}
      // `transform: none` au repos : un élément `position: fixed` garde le viewport pour repère.
      transformTemplate={(_, generated) =>
        generated === "none" || generated === "translateX(0px)" ? "none" : generated
      }
    >
      {children}
    </motion.div>
  );
}
