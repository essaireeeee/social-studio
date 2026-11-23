"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { LibraryData } from "@/hooks/useLibraryData";
import { formatDate, plural } from "@/lib/format";
import { parseInstagramExport, type InstagramPost } from "@/lib/import/instagram-export";
import type { ImportRecord } from "@/lib/import/table";
import type { Source } from "@/types/domain";
import { excerptOf } from "../WordingRow";
import { ImportDialog } from "./ImportDialog";
import { ImportReviewFlow } from "./ImportReviewFlow";

const NOT_FOUND =
  "Aucune légende trouvée dans ce fichier. Choisissez le fichier des publications (posts_1.json) d'un export Instagram « Télécharger vos informations » au format JSON. Le format de Meta peut avoir changé : vous pouvez aussi coller les légendes dans l'onglet « Texte collé ».";

/** Import Instagram (section 14.5) : texte collé avec lien, ou fichier d'export JSON. */
export function InstagramImportModal({
  data,
  onClose,
}: {
  data: LibraryData;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"text" | "file">("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [date, setDate] = useState("");
  const [posts, setPosts] = useState<InstagramPost[] | null>(null);
  const [error, setError] = useState<string>();
  const [records, setRecords] = useState<{ list: ImportRecord[]; source: Source } | null>(null);
  const [step, setStep] = useState<"review" | "confirm">("review");

  const readFile = async (file: File) => {
    setError(undefined);
    setPosts(null);
    try {
      const found = parseInstagramExport(JSON.parse(await file.text()));
      if (found.length === 0) setError(NOT_FOUND);
      else setPosts(found);
    } catch {
      setError(
        "Ce fichier n'est pas un JSON lisible. Choisissez l'export au format JSON, pas HTML.",
      );
    }
  };

  const review = (list: ImportRecord[], source: Source) => {
    setStep("review");
    setRecords({ list, source });
  };

  const urlInvalid = url.trim() !== "" && !/^https?:\/\/\S+$/.test(url.trim());

  return (
    <ImportDialog
      title="Importer depuis Instagram"
      description="Aucune connexion à Instagram : seuls le texte collé et le fichier que vous fournissez sont lus. Le lien est stocké, jamais consulté."
      steps={["Source", "Vérifier", "Confirmer"]}
      current={records ? (step === "review" ? 1 : 2) : 0}
      onClose={onClose}
    >
      {records ? (
        <ImportReviewFlow
          records={records.list}
          source={records.source}
          data={data}
          step={step}
          onStep={setStep}
          onBack={() => setRecords(null)}
          onDone={onClose}
        />
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as "text" | "file")}>
          <TabsList aria-label="Source Instagram">
            <TabsTrigger value="text">Texte collé</TabsTrigger>
            <TabsTrigger value="file">Fichier d&apos;export (JSON)</TabsTrigger>
          </TabsList>
          <TabsContent value="text" className="flex flex-col gap-3 pt-3">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Légende de la publication
              <Textarea
                rows={8}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="text-sm"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Lien de la publication (facultatif)
                <Input
                  type="url"
                  placeholder="https://www.instagram.com/p/…"
                  value={url}
                  aria-invalid={urlInvalid || undefined}
                  onChange={(e) => setUrl(e.target.value)}
                />
                {urlInvalid ? (
                  <span className="text-danger">Le lien doit commencer par https://.</span>
                ) : null}
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Date de publication (facultatif)
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
            </div>
            <Button
              className="self-end"
              disabled={!text.trim() || urlInvalid}
              onClick={() =>
                review(
                  [
                    {
                      text: text.trim(),
                      url: url.trim() || undefined,
                      date: date || undefined,
                      platform: "instagram",
                    },
                  ],
                  "manual",
                )
              }
            >
              Vérifier
            </Button>
          </TabsContent>
          <TabsContent value="file" className="flex flex-col gap-3 pt-3">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Fichier JSON de l&apos;export Meta (posts_1.json)
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void readFile(file);
                }}
                className="text-13 text-foreground file:mr-3 file:h-8 file:cursor-pointer file:rounded-md file:border file:border-border file:bg-elevated file:px-3 file:text-13 file:text-foreground"
              />
            </label>
            {error ? (
              <p
                role="alert"
                className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-13 text-warning"
              >
                {error}
              </p>
            ) : null}
            {posts ? (
              <section aria-label="Aperçu des légendes trouvées" className="flex flex-col gap-2">
                <p className="text-13 font-medium">
                  {plural(posts.length, "légende trouvée", "légendes trouvées")}
                </p>
                <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto rounded-md border border-border p-2">
                  {posts.slice(0, 20).map((post, i) => (
                    <li key={i} className="text-13">
                      <span className="text-muted-foreground">
                        {post.date ? `${formatDate(post.date)} · ` : ""}
                      </span>
                      {excerptOf(post.text).slice(0, 160)}
                    </li>
                  ))}
                  {posts.length > 20 ? (
                    <li className="text-xs text-muted-foreground">
                      … et {posts.length - 20} autres.
                    </li>
                  ) : null}
                </ul>
                <Button
                  className="self-end"
                  onClick={() =>
                    review(
                      posts.map((p) => ({ text: p.text, date: p.date, platform: "instagram" })),
                      "instagram_export",
                    )
                  }
                >
                  Vérifier
                </Button>
              </section>
            ) : null}
          </TabsContent>
        </Tabs>
      )}
    </ImportDialog>
  );
}
