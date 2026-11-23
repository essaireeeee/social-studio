import { AppShell } from "@/components/layout/AppShell";

/** Espace de travail : toutes les pages partagent le shell (header, barre latérale, Session Live). */
export default function WorkspaceLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
