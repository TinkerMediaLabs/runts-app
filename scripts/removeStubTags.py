#!/usr/bin/env python3
"""
Find and remove "stub" Tag rows and the orphan StoryTag links behind them. Dry run by default.

A stub is a Tag row with no name. It appears when a StoryTag row points at a tag that does not exist and the
tag-count aggregator then writes a storyCount onto a bare row (this happens when StoryTag rows are inserted or
restored). An orphan link is a StoryTag row whose tagId matches no named Tag row.

  python3 scripts/removeStubTags.py dev                 # dry run: lists what it would remove
  python3 scripts/removeStubTags.py dev --apply         # deletes orphan links, waits 2 minutes, deletes stubs

Run the dry run on an environment BEFORE restoring StoryTag there after a table recreate: any orphan links it
reports would otherwise come back as stub tags. <env> is dev | staging | production.
"""
import json, os, subprocess, sys, tempfile, time
from tableSafety import aws, table, SUFFIX

def scan_all(name, proj, names=None):
    items, key = [], None
    while True:
        a = ['scan', '--table-name', name, '--projection-expression', proj]
        if names: a += ['--expression-attribute-names', json.dumps(names)]
        if key: a += ['--exclusive-start-key', json.dumps(key)]
        r = aws(*a)
        items += r['Items']; key = r.get('LastEvaluatedKey')
        if not key: return items

def delete_ids(name, ids):
    for i in range(0, len(ids), 25):
        req = {name: [{'DeleteRequest': {'Key': {'id': {'S': x}}}} for x in ids[i:i + 25]]}
        while req:
            with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f: json.dump(req, f)
            r = aws('batch-write-item', '--request-items', 'file://' + f.name); os.unlink(f.name)
            req = r.get('UnprocessedItems') or None
            if req: time.sleep(1)

def find(tag_t, link_t):
    tags = scan_all(tag_t, 'id, #n', {'#n': 'name'})
    named = {t['id']['S'] for t in tags if 'name' in t}
    stubs = [t['id']['S'] for t in tags if 'name' not in t]
    links = scan_all(link_t, 'id, tagId, storyId')
    orphans = [l for l in links if l['tagId']['S'] not in named]
    return tags, named, stubs, links, orphans

if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] not in SUFFIX: sys.exit(__doc__)
    env, apply = sys.argv[1], '--apply' in sys.argv
    tag_t, link_t = table('Tag', env), table('StoryTag', env)
    tags, named, stubs, links, orphans = find(tag_t, link_t)
    print(f'{tag_t}: {len(tags)} rows, {len(named)} named, {len(stubs)} stubs (no name)')
    print(f'{link_t}: {len(links)} rows, {len(orphans)} point at a tag that does not exist')
    for tid in sorted({l["tagId"]["S"] for l in orphans}):
        n = sum(1 for l in orphans if l['tagId']['S'] == tid)
        print(f'  missing tag {tid}: {n} link(s)')
    if not apply:
        print('Dry run. Nothing changed. Add --apply to delete the orphan links and the stubs.')
        sys.exit(0)
    delete_ids(link_t, [l['id']['S'] for l in orphans])
    print(f'Deleted {len(orphans)} orphan links. Waiting 2 minutes for the count job to settle...')
    time.sleep(120)
    _, _, stubs, _, _ = find(tag_t, link_t)
    delete_ids(tag_t, stubs)
    print(f'Deleted {len(stubs)} stub tags. Now run: npx tsx scripts/backfillTagStoryCounts.ts {SUFFIX[env]}')
