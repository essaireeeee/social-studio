/**
 * Contraste WCAG 2.x des paires texte / fond du design system (section 5.2).
 * Logique pure : les valeurs viennent de `app/globals.css`, lues par le test.
 */

export type Rgba = { r: number; g: number; b: number; a: number };
export type ThemeTokens = Record<string, string>;

/** `#RGB`, `#RRGGBB` ou `rgba(r, g, b, a)`. */
export function parseColor(value: string): Rgba {
  const text = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(text);
  if (hex) {
    const digits = hex[1]!.length === 3 ? [...hex[1]!].map((c) => c + c).join("") : hex[1]!;
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgba = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(
    text,
  );
  if (rgba) {
    return { r: +rgba[1]!, g: +rgba[2]!, b: +rgba[3]!, a: rgba[4] === undefined ? 1 : +rgba[4] };
  }
  throw new Error(`Couleur illisible : ${value}`);
}

/** Pose une couleur (éventuellement translucide) sur un fond opaque. */
export function composite(top: Rgba, under: Rgba): Rgba {
  const a = top.a;
  return {
    r: top.r * a + under.r * (1 - a),
    g: top.g * a + under.g * (1 - a),
    b: top.b * a + under.b * (1 - a),
    a: 1,
  };
}

function channel(value: number): number {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function luminance({ r, g, b }: Rgba): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: Rgba, b: Rgba): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Extrait les déclarations `--nom: valeur;` d'un bloc CSS dont le sélecteur est donné. */
export function readTokens(css: string, selector: string): ThemeTokens {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`Bloc introuvable : ${selector}`);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  const tokens: ThemeTokens = {};
  for (const match of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    tokens[match[1]!] = match[2]!.trim();
  }
  return tokens;
}

/**
 * Une paire testée : texte (ou icône) sur un fond. `tint` : fond teinté de la couleur
 * du texte (badges `bg-success/10`), en proportion. `layers` : fonds empilés, du plus haut
 * au plus bas (un champ dans une carte, une barre translucide sur le fond).
 */
export interface ContrastPair {
  text: string;
  layers: string[];
  /** 4,5 pour du texte courant, 3 pour du gros texte ou une icône. */
  min: number;
  tint?: number;
  usage: string;
}

/** Fond effectif d'une pile de calques, du plus haut au plus bas. */
export function flatten(tokens: ThemeTokens, layers: string[]): Rgba {
  const colors = layers.map((name) => resolveToken(tokens, name));
  let result = colors.at(-1)!;
  for (let i = colors.length - 2; i >= 0; i -= 1) result = composite(colors[i]!, result);
  return result;
}

export function resolveToken(tokens: ThemeTokens, name: string): Rgba {
  const value = tokens[name];
  if (value === undefined) throw new Error(`Token absent : --${name}`);
  return parseColor(value);
}

export function pairRatio(tokens: ThemeTokens, pair: ContrastPair): number {
  let background = flatten(tokens, pair.layers);
  const text = resolveToken(tokens, pair.text);
  if (pair.tint) background = composite({ ...text, a: pair.tint * text.a }, background);
  return contrastRatio(composite(text, background), background);
}

const SURFACES = [["bg"], ["surface"], ["surface-2", "surface"], ["surface-float"]] as const;

/** Paires réellement utilisées par les composants. */
export function contrastPairs(): ContrastPair[] {
  const pairs: ContrastPair[] = [];
  const onSurfaces = (text: string, usage: string, surfaces = SURFACES) => {
    for (const layers of surfaces) pairs.push({ text, layers: [...layers], min: 4.5, usage });
  };
  onSurfaces("label", "texte principal");
  onSurfaces("label-2", "texte secondaire, en-têtes de section, placeholders");
  pairs.push({ text: "label-2", layers: ["surface-3"], min: 4.5, usage: "segment actif (nuit)" });
  for (const accent of ["live-text", "daily-text"]) {
    onSurfaces(accent, "texte d'accent (liens, onglet actif, valeurs)");
    pairs.push({
      text: accent,
      layers: ["bar-material", "bg"],
      min: 4.5,
      usage: "tab bar, barre de navigation",
    });
    pairs.push({ text: accent, layers: ["surface"], tint: 0.1, min: 4.5, usage: "pilule teintée" });
  }
  for (const state of ["success-text", "warning-text", "danger-text"]) {
    onSurfaces(state, "messages d'état");
    pairs.push({ text: state, layers: ["surface"], tint: 0.1, min: 4.5, usage: "badge teinté" });
    pairs.push({ text: state, layers: ["bg"], tint: 0.1, min: 4.5, usage: "bandeau teinté" });
  }
  for (const fill of ["live-fill", "daily-fill", "danger-fill"]) {
    pairs.push({
      text: "on-fill",
      layers: [fill],
      min: 4.5,
      usage: "libellé blanc d'un bouton plein",
    });
  }
  pairs.push({
    text: "label",
    layers: ["bar-material", "bg"],
    min: 4.5,
    usage: "titre de la barre",
  });
  pairs.push({
    text: "label-2",
    layers: ["bar-material", "bg"],
    min: 4.5,
    usage: "onglet inactif",
  });
  // Fond gris des contrôles (`--fill`) posé sur l'écran, une carte ou la sidebar.
  for (const under of ["bg", "surface", "bg-grouped"]) {
    pairs.push({
      text: "label-2",
      layers: ["fill", under],
      min: 4.5,
      usage: "segment inactif, badge neutre, champ de recherche",
    });
    pairs.push({ text: "label", layers: ["fill", under], min: 4.5, usage: "pilule non choisie" });
  }
  // Icônes et gros texte : 3:1.
  for (const icon of ["live", "daily"]) {
    pairs.push({ text: icon, layers: ["surface"], min: 3, usage: "pastille de mode, icône" });
  }
  return pairs;
}
