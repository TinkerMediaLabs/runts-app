#!/usr/bin/env python3
"""
Move every StoryTag link from one tag to another (to merge two tags that have the same name). A story that already has
a link to the target tag just loses the source link. Dry run by default; nothing is written without --apply.

  SUFFIX=nzvkuznrzjfc5kud3vfik5j7ey-NONE FROM=<old tag id> TO=<kept tag id> python3 scripts/mergeTagLinks.py
  SUFFIX=... FROM=... TO=... python3 scripts/mergeTagLinks.py --apply

New links are created first and the old ones deleted after, so the tag-count aggregator sees +1 on the kept tag and
-1 on the old one (it never needs an update event). tag-index-sync fills the live-tag index fields on the new rows.
Afterwards delete the old tag in the CMS (its guard now allows it). Run backupTables.py first.
"""
import json, os, subprocess, sys, uuid
from datetime import datetime, timezone

REGION = os.environ.get('AWS_REGION', 'us-east-2')
SUFFIX, FROM, TO = os.environ.get('SUFFIX'), os.environ.get('FROM'), os.environ.get('TO')
APPLY = '--apply' in sys.argv
if not (SUFFIX and FROM and TO) or FROM == TO:
    print('Set SUFFIX, FROM and TO (two different tag ids).'); sys.exit(1)
TABLE = f'StoryTag-{SUFFIX}'


def aws(*args):
    r = subprocess.run(['aws', '--region', REGION, *args], capture_output=True, text=True)
    if r.returncode != 0:
        print('AWS ERROR:', r.stderr.strip()); sys.exit(1)
    return r.stdout


def links_for(tag_id):
    out = json.loads(aws('dynamodb', 'query', '--table-name', TABLE, '--index-name', 'byTagId',
                         '--key-condition-expression', 'tagId = :t',
                         '--expression-attribute-values', json.dumps({':t': {'S': tag_id}}), '--output', 'json'))
    return out.get('Items', [])


src, dst = links_for(FROM), links_for(TO)
have = {r['storyId']['S'] for r in dst}
print(f'{TABLE}: {len(src)} link(s) on the old tag, {len(dst)} on the kept tag')
for r in src:
    sid = r['storyId']['S']
    if sid in have:
        print(f'  story {sid}: already linked to the kept tag, delete old link {r["id"]["S"]}')
    else:
        print(f'  story {sid}: create link on the kept tag, delete old link {r["id"]["S"]}')
    if not APPLY:
        continue
    if sid not in have:
        now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
        item = {'id': {'S': str(uuid.uuid4())}, 'storyId': {'S': sid}, 'tagId': {'S': TO},
                'createdAt': {'S': now}, 'updatedAt': {'S': now}, '__typename': {'S': 'StoryTag'}}
        aws('dynamodb', 'put-item', '--table-name', TABLE, '--item', json.dumps(item),
            '--condition-expression', 'attribute_not_exists(id)')
    aws('dynamodb', 'delete-item', '--table-name', TABLE, '--key', json.dumps({'id': r['id']}))
print('Done.' if APPLY else 'Dry run only. Add --apply to write.')
