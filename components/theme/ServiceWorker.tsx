"use client";

import { useEffect } from "react";

/**
 * Enregistre `public/sw.js` en production uniquement : en développement, un cache de
 * l'interface masquerait les modifications du code. Exige HTTPS (sauf sur localhost).
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Contexte non sécurisé ou navigateur sans prise en charge : l'application reste utilisable.
    });
  }, []);
  return null;
}
