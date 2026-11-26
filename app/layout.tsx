import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { DataBootstrap } from "@/components/data/DataBootstrap";
import { ServiceWorker } from "@/components/theme/ServiceWorker";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { THEME_COLORS } from "@/lib/design/theme";
import { PREPAINT_SCRIPT } from "@/lib/shell/shortcuts";
import "./globals.css";

/**
 * Inter, police de secours hors appareils Apple (section 5.3), servie depuis le projet :
 * aucune requête externe, utilisable hors ligne. Licence : `app/fonts/Inter-OFL.txt`.
 */
const inter = localFont({
  src: [
    { path: "./fonts/inter-latin-wght.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/inter-latin-ext-wght.woff2", weight: "100 900", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HEXAGONE MMA · Social Studio",
  description: "Your voice. Your fight. Your content. Outil interne de production éditoriale.",
  robots: { index: false, follow: false },
  applicationName: "HEXAGONE Social Studio",
  appleWebApp: {
    capable: true,
    title: "Social Studio",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Le script d'en-tête rétablit le thème, le mode et la barre latérale avant l'affichage :
    // `suppressHydrationWarning` accepte ces attributs posés hors de React.
    <html lang="fr" data-mode="live" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREPAINT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider>
          {children}
          <DataBootstrap />
          <ServiceWorker />
        </ThemeProvider>
      </body>
    </html>
  );
}
