// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ReferencesPanel } from "@/components/editor/ReferencesPanel";
import {
  LocalBm25Retriever,
  buildRetrievalQuery,
  type ReferenceResult,
} from "@/lib/retrieval/retriever";
import { NOW } from "../../fixtures/entities";
import { RETRIEVAL_FIGHTERS, buildRetrievalCorpus } from "../../fixtures/retrieval-corpus";

let references: ReferenceResult[];

beforeAll(async () => {
  const retriever = new LocalBm25Retriever();
  retriever.load(await buildRetrievalCorpus());
  references = retriever.rank(
    buildRetrievalQuery(
      {
        mode: "live",
        categoryId: "live_ko",
        platform: "instagram",
        fields: { winner: "Karim Fictif" },
        hashtagIds: [],
      },
      { fighters: RETRIEVAL_FIGHTERS, now: new Date(NOW) },
    ),
  );
});

/** Le Studio garde la liste des exclusions ; ici, un état local en tient lieu. */
function Harness({ onRegenerate }: { onRegenerate: () => void }) {
  const [excluded, setExcluded] = useState<string[]>([]);
  return (
    <ReferencesPanel
      mode="live"
      references={references}
      excludedIds={excluded}
      onToggleExclude={(id) =>
        setExcluded((current) =>
          current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
        )
      }
      onRegenerate={onRegenerate}
    />
  );
}

describe("ReferencesPanel", () => {
  it("est replié par défaut et annonce le nombre de références", async () => {
    render(<Harness onRegenerate={() => {}} />);
    const toggle = screen.getByRole("button", {
      name: `Références utilisées (${references.length})`,
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("affiche extrait, catégorie, date, score et raison de chaque référence", async () => {
    render(<Harness onRegenerate={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /Références utilisées/ }));
    const first = screen.getAllByRole("button", { name: /Voir la référence/ })[0]!;
    expect(first).toHaveTextContent("KO de Karim Fictif");
    expect(first).toHaveTextContent("KO / TKO");
    expect(first).toHaveTextContent("21/10/2026");
    expect(first).toHaveTextContent(/0,\d\d/);
    expect(first).toHaveTextContent("Même catégorie");
  });

  it("ouvre le post complet, permet de l'exclure, puis propose de régénérer", async () => {
    const onRegenerate = vi.fn();
    render(<Harness onRegenerate={onRegenerate} />);
    await userEvent.click(screen.getByRole("button", { name: /Références utilisées/ }));
    expect(screen.queryByRole("button", { name: "Régénérer" })).toBeNull();

    await userEvent.click(screen.getAllByRole("button", { name: /Voir la référence/ })[0]!);
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByText(/Une droite, c'est fini/)).toBeInTheDocument();
    expect(within(sheet).getByText("Détail du score")).toBeInTheDocument();

    await userEvent.click(
      within(sheet).getByRole("button", { name: "Exclure de cette génération" }),
    );
    expect(
      within(sheet).getByRole("button", { name: "Réintégrer à cette génération" }),
    ).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();

    expect(screen.getByText("1 référence exclue de cette génération.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Régénérer" }));
    expect(onRegenerate).toHaveBeenCalledOnce();
  });

  it("explique l'absence de référence", async () => {
    render(
      <ReferencesPanel
        mode="daily"
        references={[]}
        excludedIds={[]}
        onToggleExclude={() => {}}
        onRegenerate={() => {}}
        defaultOpen
      />,
    );
    expect(
      screen.getByText(/ne contient pas encore de publication DAILY & MEDIA/),
    ).toBeInTheDocument();
  });
});
