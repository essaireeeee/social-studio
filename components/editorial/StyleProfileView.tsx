import { getCategory } from "@/lib/categories/registry";
import { OVERUSED_MIN_CORPUS, collapseExpressions } from "@/lib/editorial/style-extractor";
import { POSITION_LABELS } from "@/lib/editorial/profile-service";
import type { StyleProfile } from "@/types/domain";
import { EmptyLine, StatBlock, StatNumber } from "./StatBlock";
import { StatBar, StatBarList } from "./StatBar";

const pct = (value: number) => `${Math.round(value * 100)} %`;

/** Indicateurs d'un profil de style : chiffres, barres et listes. Aucun graphique décoratif. */
export function StyleProfileView({ profile }: { profile: StyleProfile }) {
  const meta = { corpusSize: profile.corpusSize, analyzedAt: profile.createdAt };
  const mode = profile.mode;
  const maxEmoji = profile.emojis.top[0]?.count ?? 1;
  const maxTag = profile.hashtags.top[0]?.count ?? 1;
  const expressions = collapseExpressions([
    ...profile.ngrams.quadgrams,
    ...profile.ngrams.trigrams,
    ...profile.ngrams.bigrams,
  ]).slice(0, 10);
  const maxShare = expressions[0]?.share ?? 1;
  const globalStructures = profile.structures.filter((s) => !s.categoryId);
  const categoryStructures = profile.structures.filter((s) => s.categoryId);
  const ctas = profile.ctas.top.filter((c) => !c.categoryId).slice(0, 5);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <StatBlock title="Longueur" {...meta}>
        <div className="grid grid-cols-3 gap-4">
          <StatNumber label="caractères (médiane)" value={profile.length.charsMedian} />
          <StatNumber label="caractères (p90)" value={profile.length.charsP90} />
          <StatNumber label="lignes (médiane)" value={profile.length.linesMedian} />
        </div>
      </StatBlock>

      <StatBlock title="Emojis" {...meta}>
        {profile.emojis.top.length === 0 ? (
          <EmptyLine>Aucun emoji dans le corpus.</EmptyLine>
        ) : (
          <StatBarList>
            {profile.emojis.top.slice(0, 8).map((e) => (
              <StatBar
                key={e.emoji}
                label={e.emoji}
                value={`${e.count} · ${pct(e.share)} des posts`}
                fraction={e.count / maxEmoji}
                mode={mode}
              />
            ))}
          </StatBarList>
        )}
        <p className="text-13 text-muted-foreground">
          {profile.emojis.perPostMedian} par post (médiane), {profile.emojis.perPostP90} au p90 ·{" "}
          {pct(profile.emojis.lineStartRatio)} des lignes commencent par un emoji.
        </p>
      </StatBlock>

      <StatBlock title="Hashtags" {...meta}>
        {profile.hashtags.top.length === 0 ? (
          <EmptyLine>Aucun hashtag dans le corpus.</EmptyLine>
        ) : (
          <StatBarList>
            {profile.hashtags.top.slice(0, 8).map((t) => (
              <StatBar
                key={t.tag}
                label={t.tag}
                value={String(t.count)}
                fraction={t.count / maxTag}
                mode={mode}
              />
            ))}
          </StatBarList>
        )}
        <p className="text-13 text-muted-foreground">
          {profile.hashtags.perPostMedian} par post (médiane) ·{" "}
          {POSITION_LABELS[profile.hashtags.position]}.
        </p>
      </StatBlock>

      <StatBlock title="Accroches" {...meta}>
        {profile.hooks.patterns.length === 0 ? (
          <EmptyLine>Aucun patron d&apos;accroche répété (2 occurrences minimum).</EmptyLine>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {profile.hooks.patterns.slice(0, 8).map((p) => (
              <li key={p.pattern} className="flex items-baseline justify-between gap-3 text-13">
                <code className="truncate font-mono text-xs text-foreground">{p.pattern}</code>
                <span className="font-mono text-xs text-muted-foreground">{p.count}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-13 text-muted-foreground">
          {pct(profile.hooks.uppercaseRatio)} en majuscules · {pct(profile.hooks.exclamationRatio)}{" "}
          avec « ! » · {pct(profile.hooks.questionRatio)} avec « ? » · {profile.hooks.avgWords} mots
          en moyenne.
        </p>
        {profile.hooks.samples.length > 0 ? (
          <details className="text-13">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Accroches réelles (consultation)
            </summary>
            <ul className="mt-2 flex flex-col gap-1 border-l border-border pl-3 text-foreground">
              {profile.hooks.samples.map((sample, i) => (
                <li key={`${i}-${sample}`}>{sample}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </StatBlock>

      <StatBlock title="Expressions récurrentes" {...meta}>
        {expressions.length === 0 ? (
          <EmptyLine>Aucune expression répétée dans au moins 2 publications.</EmptyLine>
        ) : (
          <StatBarList>
            {expressions.map((g) => (
              <StatBar
                key={g.text}
                label={g.text}
                value={pct(g.share)}
                fraction={g.share / maxShare}
                mode={mode}
              />
            ))}
          </StatBarList>
        )}
      </StatBlock>

      <StatBlock title="À varier" {...meta}>
        {profile.corpusSize < OVERUSED_MIN_CORPUS ? (
          <EmptyLine>
            Détection à partir de {OVERUSED_MIN_CORPUS} publications ({profile.corpusSize}{" "}
            actuellement).
          </EmptyLine>
        ) : profile.overused.length === 0 ? (
          <EmptyLine>Aucune expression présente dans plus de 25 % des publications.</EmptyLine>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {profile.overused.map((o) => (
              <li key={o.expression} className="flex items-baseline justify-between gap-3 text-13">
                <span className="truncate font-mono text-xs text-warning">{o.expression}</span>
                <span className="font-mono text-xs text-muted-foreground">{pct(o.share)}</span>
              </li>
            ))}
          </ul>
        )}
      </StatBlock>

      <StatBlock title="Structures" {...meta}>
        {globalStructures.length === 0 ? (
          <EmptyLine>Aucune structure mesurée.</EmptyLine>
        ) : (
          <ul className="flex flex-col gap-1.5 text-13">
            {globalStructures.slice(0, 6).map((s) => (
              <li key={s.fingerprint} className="flex justify-between gap-3">
                <code className="font-mono text-xs text-foreground">{s.fingerprint}</code>
                <span className="font-mono text-xs text-muted-foreground">{s.count}</span>
              </li>
            ))}
          </ul>
        )}
        {categoryStructures.length > 0 ? (
          <details className="text-13">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Par catégorie
            </summary>
            <ul className="mt-2 flex flex-col gap-1">
              {categoryStructures.map((s) => (
                <li key={`${s.categoryId}-${s.fingerprint}`} className="flex justify-between gap-3">
                  <span className="truncate text-muted-foreground">
                    {getCategory(s.categoryId!)?.label ?? s.categoryId}
                  </span>
                  <code className="font-mono text-xs text-foreground">
                    {s.fingerprint} <span className="text-muted-foreground">×{s.count}</span>
                  </code>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        <p className="text-xs text-muted-foreground">
          H accroche · B corps · I information · Q citation · C appel à l&apos;action · T hashtags ·
          S signature
        </p>
      </StatBlock>

      <StatBlock title="CTA et ponctuation" {...meta}>
        {ctas.length === 0 ? (
          <EmptyLine>Aucun appel à l&apos;action détecté.</EmptyLine>
        ) : (
          <ul className="flex flex-col gap-1.5 text-13">
            {ctas.map((c) => (
              <li key={c.text} className="flex justify-between gap-3">
                <span className="truncate text-foreground">{c.text}</span>
                <span className="font-mono text-xs text-muted-foreground">{c.count}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-13 text-muted-foreground">
          {profile.punctuation.exclamationPerPost} « ! » par post ·{" "}
          {profile.punctuation.ellipsisPerPost} points de suspension ·{" "}
          {pct(profile.punctuation.uppercaseWordRatio)} de mots en capitales.
        </p>
      </StatBlock>
    </div>
  );
}
