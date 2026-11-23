import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { DataBootstrap } from "@/components/data/DataBootstrap";
import { PREPAINT_SCRIPT } from "@/lib/shell/shortcuts";
import "./globals.css";

export const metadata: Metadata = {
  title: "HEXAGONE MMA · Social Studio",
  description: "Your voice. Your fight. Your content. Outil interne de production éditoriale.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0A0B0E",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Le script d'en-tête rétablit le mode et la barre latérale avant l'affichage :
    // `suppressHydrationWarning` accepte ces attributs posés hors de React.
    <html
      lang="fr"
      data-mode="live"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREPAINT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-background text-foreground">
        {children}
        <DataBootstrap />
      </body>
    </html>
  );
}
