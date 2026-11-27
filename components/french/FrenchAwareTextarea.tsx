"use client";

import { Popover } from "radix-ui";
import { useLayoutEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { IssueActions } from "@/hooks/useIssueActions";
import { useIsMobile } from "@/hooks/useMedia";
import type { FrenchIssue } from "@/lib/french/types";
import { cn } from "@/lib/utils";
import { IssueCard } from "./IssueCard";

const UNDERLINE = {
  error: "underline decoration-wavy decoration-[var(--danger)] decoration-[1.5px]",
  check: "underline decoration-wavy decoration-[var(--warning)] decoration-[1.5px]",
  suggestion: "underline decoration-dotted decoration-[#007aff] decoration-2",
} as const;

function underlineOf(issue: FrenchIssue): string {
  if (issue.severity === "suggestion") return UNDERLINE.suggestion;
  return issue.severity === "error" && issue.confidence === "high"
    ? UNDERLINE.error
    : UNDERLINE.check;
}

/** Segments du texte, les passages signalés (sans chevauchement) marqués. */
function segments(text: string, issues: readonly FrenchIssue[]): ReactNode[] {
  const out: ReactNode[] = [];
  let cursor = 0;
  for (const issue of [...issues].sort((a, b) => a.start - b.start)) {
    if (issue.start < cursor || issue.end <= issue.start) continue;
    out.push(text.slice(cursor, issue.start));
    out.push(
      <mark
        key={issue.id}
        data-issue={issue.id}
        className={cn("bg-transparent text-transparent underline-offset-[3px]", underlineOf(issue))}
      >
        {text.slice(issue.start, issue.end)}
      </mark>,
    );
    cursor = issue.end;
  }
  out.push(text.slice(cursor));
  // Un saut de ligne final n'a pas de hauteur sans caractère après lui.
  out.push("​");
  return out;
}

interface FrenchAwareTextareaProps extends Omit<
  React.ComponentProps<typeof Textarea>,
  "onChange" | "value"
> {
  value: string;
  onValueChange: (value: string) => void;
  issues: readonly FrenchIssue[];
  actions: IssueActions;
  onExplain?: (ruleId: string) => void;
  ref?: Ref<HTMLTextAreaElement>;
}

/**
 * Champ de saisie de l'Atelier Français (section 6.4) : soulignés ondulés sur un calque
 * synchronisé sous le texte (rouge : faute, orange : à vérifier, bleu pointillé :
 * suggestion). Toucher un passage souligné ouvre sa fiche : popover sur desktop, feuille
 * compacte sur mobile. Au clavier, le badge de qualité donne la même liste d'alertes.
 */
export function FrenchAwareTextarea({
  value,
  onValueChange,
  issues,
  actions,
  onExplain,
  className,
  ref,
  onClick,
  onKeyUp,
  ...props
}: FrenchAwareTextareaProps) {
  const mobile = useIsMobile();
  const inner = useRef<HTMLTextAreaElement | null>(null);
  const mirror = useRef<HTMLDivElement | null>(null);
  const anchor = useRef<{ getBoundingClientRect: () => DOMRect }>({
    getBoundingClientRect: () => new DOMRect(),
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const open = issues.find((i) => i.id === openId);

  // Le calque suit le défilement du champ.
  useLayoutEffect(() => {
    const node = inner.current;
    const layer = mirror.current;
    if (!node || !layer) return;
    const sync = () => {
      layer.scrollTop = node.scrollTop;
    };
    sync();
    node.addEventListener("scroll", sync);
    return () => node.removeEventListener("scroll", sync);
  }, [value]);

  const inspect = () => {
    const node = inner.current;
    if (!node || node.selectionStart !== node.selectionEnd) return;
    const at = node.selectionStart;
    const hit = issues.find((i) => i.start <= at && at <= i.end && i.end > i.start);
    if (!hit) return setOpenId(null);
    const mark = mirror.current?.querySelector(`[data-issue="${CSS.escape(hit.id)}"]`);
    if (mark) anchor.current = { getBoundingClientRect: () => mark.getBoundingClientRect() };
    setOpenId(hit.id);
  };

  const card = open ? (
    <IssueCard
      issue={open}
      actions={actions}
      onDone={() => {
        setOpenId(null);
        inner.current?.focus();
      }}
      onExplain={
        onExplain
          ? (id) => {
              setOpenId(null);
              onExplain(id);
            }
          : undefined
      }
    />
  ) : null;

  return (
    <div className="relative">
      <div
        ref={mirror}
        aria-hidden="true"
        className={cn(
          "field-mirror pointer-events-none absolute inset-0 overflow-hidden rounded-md border border-transparent px-3 py-2.5 text-field break-words whitespace-pre-wrap text-transparent",
          className,
        )}
      >
        {segments(value, issues)}
      </div>
      <Textarea
        {...props}
        ref={(node) => {
          inner.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onClick={(event) => {
          inspect();
          onClick?.(event);
        }}
        onKeyUp={(event) => {
          if (event.key === "Escape") setOpenId(null);
          onKeyUp?.(event);
        }}
        spellCheck={false}
        className={cn("relative bg-transparent", className)}
      />
      {mobile ? (
        <Dialog open={Boolean(open)} onOpenChange={(next) => !next && setOpenId(null)}>
          {open ? (
            <DialogContent>
              <DialogTitle className="sr-only">Alerte de l&apos;Atelier Français</DialogTitle>
              {card}
            </DialogContent>
          ) : null}
        </Dialog>
      ) : (
        <Popover.Root open={Boolean(open)} onOpenChange={(next) => !next && setOpenId(null)}>
          <Popover.Anchor virtualRef={anchor} />
          <Popover.Portal>
            <Popover.Content
              side="bottom"
              align="start"
              sideOffset={6}
              collisionPadding={12}
              onOpenAutoFocus={(event) => event.preventDefault()}
              aria-label="Alerte de l'Atelier Français"
              className="z-50 w-80 rounded-xl bg-surface-float p-4 shadow-float squircle"
            >
              {card}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </div>
  );
}
