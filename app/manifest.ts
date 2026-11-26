import type { MetadataRoute } from "next";

/** Application installable (section 5.7 de PROMPT_V2.md). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "HEXAGONE Social Studio",
    short_name: "Social Studio",
    description: "Outil interne de production éditoriale de HEXAGONE MMA.",
    lang: "fr",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    // Fond noir : écran de lancement sans flash sur iPhone, couleur de la marque.
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["productivity", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
