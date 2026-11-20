import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { DataBootstrap } from "@/components/data/DataBootstrap";
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
    <html lang="fr" data-mode="live" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-full bg-background text-foreground">
        {children}
        <DataBootstrap />
      </body>
    </html>
  );
}
