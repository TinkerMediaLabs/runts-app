// Round-robin merge of several ranked lists into one: first of each list, then second of each, and so on.
// Skips duplicates (by id), erotic stories and rows without an id, and stops at `limit`. No list can crowd
// out the others.
export function mixRoundRobin(lists: any[][], limit: number): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (let i = 0; out.length < limit; i++) {
    let any = false;
    for (const l of lists) {
      const s = l[i];
      if (!s) continue;
      any = true;
      if (!s.id || seen.has(s.id) || s.isErotic === 'true') continue;
      seen.add(s.id);
      out.push(s);
      if (out.length >= limit) break;
    }
    if (!any) break;
  }
  return out;
}
