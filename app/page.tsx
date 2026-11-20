// Page volontairement vide (Phase 0) : le Dashboard et le shell arrivent en Phase 7.
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 px-4">
      <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">
        HEXAGONE MMA · SOCIAL STUDIO
      </p>
      <p className="text-13 text-muted-foreground">Your voice. Your fight. Your content.</p>
    </main>
  );
}
