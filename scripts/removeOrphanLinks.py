#!/usr/bin/env python3
"""
Delete StoryTag / StoryNarrator rows whose story no longer exists (left behind by the old CMS delete,
which removed only the Story row). Dry run by default.

  SUFFIX=5ojmsd7i5nbq5foh2wefkdhj3e-NONE python3 scripts/removeOrphanLinks.py            # dry run, both tables
  SUFFIX=... python3 scripts/removeOrphanLinks.py --apply

Deleting StoryTag rows fires the tag-count aggregator (-1, floor-guarded). Wait ~2 min afterwards, then run
npx tsx scripts/backfillTagStoryCounts.ts <suffix-without--NONE> to set exact counts.
"""
import json, os, subprocess, sys, tempfile, time

REGION = os.environ.get('AWS_REGION', 'us-east-2')
SUFFIX = os.environ.get('SUFFIX')
APPLY = '--apply' in sys.argv
if not SUFFIX:
    print('Set SUFFIX, e.g. 5ojmsd7i5nbq5foh2wefkdhj3e-NONE'); sys.exit(1)


def aws(*args):
    r = subprocess.run(['aws', '--region', REGION, *args], capture_output=True, text=True)
    if r.returncode != 0:
        print('AWS ERROR:', r.stderr.strip()); sys.exit(1)
    return r.stdout


def scan(table, projection):
    rows, token = [], None
    while True:
        cmd = ['dynamodb', 'scan', '--table-name', table, '--projection-expression', projection, '--output', 'json']
        if token:
            cmd += ['--starting-token', token]
        out = json.loads(aws(*cmd))
        rows += out.get('Items', [])
        token = out.get('NextToken')
        if not token:
            return rows


story_ids = {r['id']['S'] for r in scan(f'Story-{SUFFIX}', 'id')}
print(f'Story-{SUFFIX}: {len(story_ids)} stories')

for model in ('StoryTag', 'StoryNarrator'):
    table = f'{model}-{SUFFIX}'
    rows = scan(table, 'id, storyId')
    orphans = [r for r in rows if r.get('storyId', {}).get('S') not in story_ids]
    by_story = {}
    for r in orphans:
        sid = r.get('storyId', {}).get('S', '(none)')
        by_story[sid] = by_story.get(sid, 0) + 1
    print(f'{table}: {len(rows)} rows, {len(orphans)} orphaned across {len(by_story)} missing stories')
    if not APPLY:
        continue
    for i in range(0, len(orphans), 25):
        req = {table: [{'DeleteRequest': {'Key': {'id': r['id']}}} for r in orphans[i:i + 25]]}
        for attempt in range(8):
            with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
                json.dump(req, f); path = f.name
            res = json.loads(aws('dynamodb', 'batch-write-item', '--request-items', 'file://' + path, '--output', 'json') or '{}')
            os.unlink(path)
            req = res.get('UnprocessedItems') or {}
            if not req.get(table):
                break
            time.sleep(0.5 * (attempt + 1))
    print(f'   deleted {len(orphans)}')

if not APPLY:
    print('\nDRY RUN only - rerun with --apply to delete.')
else:
    print('\nDone. Wait ~2 min, then run backfillTagStoryCounts.ts.')
