// Background colours for a genre tile that has no picture. Most followed genres will not have one, so the plain
// grey box is replaced by a deep gradient that is different for each genre but always the same for the same genre.
// If the CMS gave the tag a colour (Tag.color, "#rrggbb") that colour is used (darkened to sit on the dark app);
// otherwise one of the palette pairs is picked from the tag id. Pure, so it can be unit tested.

export const TILE_PALETTE: [string, string][] = [
  ['#1f4a7a', '#0a1a33'],
  ['#5a2a7a', '#1a0a33'],
  ['#7a2a4a', '#330a1a'],
  ['#1f6a5a', '#0a3328'],
  ['#7a5a1f', '#33240a'],
  ['#3a2a8a', '#140a38'],
  ['#1f5f7a', '#0a2a38'],
  ['#7a3a1f', '#38180a'],
];

const HEX = /^#?([0-9a-f]{6})$/i;

/** Mixes a "#rrggbb" colour with black. factor 1 = unchanged, 0 = black. Null when it is not a valid hex colour. */
export function darken(color: string | null | undefined, factor: number): string | null {
  const m = typeof color === 'string' ? HEX.exec(color.trim()) : null;
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const part = (shift: number) => Math.round(((n >> shift) & 255) * factor).toString(16).padStart(2, '0');
  return `#${part(16)}${part(8)}${part(0)}`;
}

/** A stable number from text (same text, same number). */
export function hashText(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

/** [from, to] gradient colours for a tag tile. */
export function tagTileColors(tagId: string, color?: string | null): [string, string] {
  const from = darken(color, 0.6);
  const to = darken(color, 0.25);
  if (from && to) return [from, to];
  return TILE_PALETTE[hashText(tagId || '') % TILE_PALETTE.length];
}

/** The big faint letter on the tile: the first letter or digit of the name, upper case. */
export function tileInitial(name: string | null | undefined): string {
  const m = /[\p{L}\p{N}]/u.exec(name ?? '');
  return m ? m[0].toUpperCase() : '#';
}
