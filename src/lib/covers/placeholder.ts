/**
 * Deterministic placeholder covers (PRD §21.8).
 *
 * Every prompt gets a 2:3 gradient derived from its category and title, so the
 * catalog is recognisable before cover upload lands in Milestone 5, and so the
 * same prompt always looks the same. Pure and dependency-free: server and client
 * render identical output, and no network request is involved.
 *
 * Hues stay inside the emerald → teal → cyan band the palette uses, so
 * placeholders read as part of the design rather than as noise.
 */

/** FNV-1a. Small, stable, and good enough to spread short strings. */
function hash(input: string): number {
  let value = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    value ^= input.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

/** Emerald through cyan, matching the token palette. */
const HUE_MIN = 150;
const HUE_MAX = 215;

export type PlaceholderCover = {
  /** CSS gradient, ready for a `background-image`. */
  backgroundImage: string;
  /** The two stop colors, for callers that need them separately. */
  from: string;
  to: string;
};

/**
 * Builds the gradient for a prompt.
 *
 * The category drives the base hue so a category's prompts look related; the
 * title shifts hue, angle, and lightness within that family so neighbouring
 * cards stay distinguishable.
 */
export function getPlaceholderCover(
  title: string,
  categorySlug?: string | null,
): PlaceholderCover {
  const categorySeed = hash(categorySlug ?? "uncategorized");
  const titleSeed = hash(title);

  const baseHue = HUE_MIN + (categorySeed % (HUE_MAX - HUE_MIN));
  const hueShift = (titleSeed % 24) - 12;
  const fromHue = wrapHue(baseHue + hueShift);
  const toHue = wrapHue(fromHue + 26 + (titleSeed % 18));

  const fromLightness = 0.26 + ((titleSeed >>> 8) % 7) / 100;
  const toLightness = 0.15 + ((titleSeed >>> 16) % 5) / 100;
  const angle = 120 + ((titleSeed >>> 4) % 5) * 15;

  const from = `oklch(${fromLightness.toFixed(3)} 0.075 ${fromHue})`;
  const to = `oklch(${toLightness.toFixed(3)} 0.045 ${toHue})`;

  return {
    from,
    to,
    backgroundImage: `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`,
  };
}

function wrapHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}
