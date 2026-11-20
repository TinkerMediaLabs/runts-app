// Chips that wrap onto lines, capped at a number of lines. When they do not all fit, the last line ends with a
// "+N more" chip. Pure (widths in, counts out) so it can be tested; the card measures the real widths.
export type FlowItem = { kind: 'text' | 'chip' | 'dot'; width: number };

// How many lines these widths take when they wrap left to right with `gap` between items.
export function lineCount(widths: number[], containerW: number, gap: number): number {
  if (widths.length === 0) return 0;
  let lines = 1;
  let x = 0;
  for (const w of widths) {
    if (x === 0) x = w;
    else if (x + gap + w <= containerW) x += gap + w;
    else { lines += 1; x = w; }
  }
  return lines;
}

// `visible`: how many of the items to show (the rest are hidden). `hidden`: how many CHIPS that hides, which is the
// number for "+N more" (0 means everything fits and no "+N more" is needed).
export function fitItems(items: FlowItem[], containerW: number, gap: number, maxLines: number, moreWidth: number): { visible: number; hidden: number } {
  const all = items.map(i => i.width);
  if (lineCount(all, containerW, gap) <= maxLines) return { visible: items.length, hidden: 0 };
  const chipsFrom = (n: number) => items.slice(n).filter(i => i.kind === 'chip').length;
  for (let n = items.length - 1; n >= 0; n--) {
    if (lineCount([...all.slice(0, n), moreWidth], containerW, gap) > maxLines) continue;
    let visible = n;
    while (visible > 0 && items[visible - 1].kind === 'dot') visible -= 1;   // never end on the separator dot
    return { visible, hidden: chipsFrom(visible) };
  }
  return { visible: 0, hidden: chipsFrom(0) };
}
