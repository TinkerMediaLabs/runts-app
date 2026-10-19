#!/usr/bin/env python3
"""
Remove duplicate join rows (same storyId + tagId / narratorId) created by the old unindexed lookup bug.
Keeps the oldest row per pair, deletes the rest. Dry run by default.

  SUFFIX=5ojmsd7i5nbq5foh2wefkdhj3e-NONE python3 scripts/dedupeLinks.py                 # StoryTag, dry run
  SUFFIX=... python3 scripts/dedupeLinks.py --apply
  SUFFIX=... MODEL=StoryNarrator FK=narratorId python3 scripts/dedupeLinks.py --apply

Deleting StoryTag rows fires the tag-count aggregator (-1, floor-guarded). Wait ~2 min afterwards, then run
scripts/backfillTagStoryCounts.ts <suffix-without--NONE> to set exact counts.
"""
import json, os, subprocess, sys, tempfile, time

REGION = os.environ.get('AWS_REGION', 'us-east-2')
SUFFIX = os.environ.get('SUFFIX')
MODEL = os.environ.get('MODEL', 'StoryTag')
FK = os.environ.get('FK', 'tagId')
APPLY = '--apply' in sys.argv
if not SUFFIX:
    print('Set SUFFIX, e.g. 5ojmsd7i5nbq5foh2wefkdhj3e-NONE'); sys.exit(1)
TABLE = f'{MODEL}-{SUFFIX}'


def aws(*args):
    r = subprocess.run(['aws', '--region', REGION, *args], capture_output=True, text=True)
    if r.returncode != 0:
        print('AWS ERROR:', r.stderr.strip()); sys.exit(1)
    return r.stdout


rows, token = [], None
while True:
    cmd = ['dynamodb', 'scan', '--table-name', TABLE, '--projection-expression', 'id, storyId, #f, createdAt',
           '--expression-attribute-names', json.dumps({'#f': FK}), '--output', 'json']
    if token:
        cmd += ['--starting-token', token]
    out = json.loads(aws(*cmd))
    rows += out.get('Items', [])
    token = out.get('NextToken')
    if not token:
        break

groups = {}
for r in rows:
    key = (r.get('storyId', {}).get('S'), r.get(FK, {}).get('S'))
    groups.setdefault(key, []).append(r)

to_delete = []
for key, g in groups.items():
    if len(g) > 1:
        g.sort(key=lambda r: r.get('createdAt', {}).get('S', ''))
        to_delete += g[1:]

print(f'{TABLE}: {len(rows)} rows, {len(groups)} distinct (story, {FK}) pairs, {len(to_delete)} duplicates to delete')
by_story = {}
for r in to_delete:
    by_story[r['storyId']['S']] = by_story.get(r['storyId']['S'], 0) + 1
for sid, n in sorted(by_story.items(), key=lambda x: -x[1])[:10]:
    print(f'   story {sid}: {n} duplicate rows')

if not APPLY:
    print('\nDRY RUN only — rerun with --apply to delete.'); sys.exit(0)

for i in range(0, len(to_delete), 25):
    req = {TABLE: [{'DeleteRequest': {'Key': {'id': r['id']}}} for r in to_delete[i:i + 25]]}
    for attempt in range(8):
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
            json.dump(req, f); path = f.name
        res = json.loads(aws('dynamodb', 'batch-write-item', '--request-items', 'file://' + path, '--output', 'json') or '{}')
        os.unlink(path)
        req = res.get('UnprocessedItems') or {}
        if not req.get(TABLE):
            break
        time.sleep(0.5 * (attempt + 1))
print(f'Deleted {len(to_delete)} duplicates. Wait ~2 min, then run backfillTagStoryCounts.ts.')
