// Pure checks for the daily data-health job (no AWS calls, so they can be unit tested).
// The invariants are the ones tag-index-sync maintains:
//   Story.liveTagId        = primaryTagId while live === 'true', otherwise absent
//   StoryTag.liveTagId     = tagId while the story is live, otherwise absent
//   StoryTag.publishedAt   = the story's publishedAt
// A StoryTag whose story no longer exists is an orphan.

export type StoryRow = { id: string; live?: string; primaryTagId?: string; liveTagId?: string; publishedAt?: string };
export type LinkRow = { id: string; storyId?: string; tagId?: string; liveTagId?: string; publishedAt?: string };

export type Fix =
  | { table: 'Story'; id: string; liveTagId: string | undefined }
  | { table: 'StoryTag'; id: string; liveTagId: string | undefined; publishedAt: string | undefined };

export type Drift = { storyFixes: Fix[]; linkFixes: Fix[]; orphans: string[] };

export function findDrift(stories: StoryRow[], links: LinkRow[]): Drift {
  const byId = new Map<string, StoryRow>();
  const storyFixes: Fix[] = [];
  for (const s of stories) {
    byId.set(s.id, s);
    const want = s.live === 'true' && s.primaryTagId ? s.primaryTagId : undefined;
    if ((s.liveTagId ?? undefined) !== want) storyFixes.push({ table: 'Story', id: s.id, liveTagId: want });
  }
  const linkFixes: Fix[] = [];
  const orphans: string[] = [];
  for (const l of links) {
    const story = l.storyId ? byId.get(l.storyId) : undefined;
    if (!story) { orphans.push(l.id); continue; }
    const wantLive = story.live === 'true' ? l.tagId : undefined;
    const wantPub = story.publishedAt ?? undefined;
    if ((l.liveTagId ?? undefined) !== wantLive || (l.publishedAt ?? undefined) !== wantPub) {
      linkFixes.push({ table: 'StoryTag', id: l.id, liveTagId: wantLive, publishedAt: wantPub });
    }
  }
  return { storyFixes, linkFixes, orphans };
}

export type Report = { lines: string[]; problem: boolean };

// Builds the human-readable summary. `problem` is true when something needs attention.
export function buildReport(args: {
  stories: number; links: number; drift: Drift; repaired: number; repairCap: number;
  snapshotAgeHours: number | null; maxSnapshotAgeHours: number;
}): Report {
  const { drift } = args;
  const lines: string[] = [];
  let problem = false;
  lines.push(`Checked ${args.stories} stories and ${args.links} tag links.`);
  const drifted = drift.storyFixes.length + drift.linkFixes.length;
  if (drifted === 0) lines.push('Live-tag indexes: all in step.');
  else {
    lines.push(`Live-tag indexes: ${drift.storyFixes.length} stories and ${drift.linkFixes.length} links were out of step; repaired ${args.repaired}.`);
    if (args.repaired < drifted) { problem = true; lines.push(`Repair cap of ${args.repairCap} reached; ${drifted - args.repaired} remain (will continue tomorrow). Investigate why tag-index-sync is missing events.`); }
    // Any drift at all means the stream sync missed something, so it is worth a look even when repaired.
    problem = true;
  }
  if (drift.orphans.length) { problem = true; lines.push(`${drift.orphans.length} tag links point at a missing story (first: ${drift.orphans.slice(0, 3).join(', ')}).`); }
  if (args.snapshotAgeHours === null) { problem = true; lines.push('Trending snapshot: no rows found.'); }
  else if (args.snapshotAgeHours > args.maxSnapshotAgeHours) { problem = true; lines.push(`Trending snapshot is ${args.snapshotAgeHours.toFixed(1)}h old (expected under ${args.maxSnapshotAgeHours}h).`); }
  else lines.push(`Trending snapshot: fresh (${args.snapshotAgeHours.toFixed(1)}h old).`);
  return { lines, problem };
}
