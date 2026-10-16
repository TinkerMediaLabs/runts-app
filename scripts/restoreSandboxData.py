#!/usr/bin/env python3
"""
Restore ALL tables of a sandbox (e.g. staging) from a `aws dynamodb scan` backup taken before a schema
change that recreated the tables. Adds the new search fields where needed:
  Author/Narrator/Universe: searchPk='ALL', nameLower
  Tag:                      searchPk REGULAR|EROTIC, nameLower, primaryFlag 'true'|'false', storyCount=0
  Story:                    titleLower
Skipped: StoryReactionCount (rebuilt by the reaction-aggregator stream when UserReaction rows are restored;
restoring it too would double the counts).

Backup files are named <Model>-<SUFFIX>.json (as produced by the backup loop).

  SUFFIX=5ojmsd7i5nbq5foh2wefkdhj3e-NONE BACKUP=~/staging-backup-2026-10-16 python3 scripts/restoreSandboxData.py          # dry run
  SUFFIX=... BACKUP=... python3 scripts/restoreSandboxData.py --apply

After --apply WAIT ~2 minutes (stream aggregators drain), then run the absolute-value backfills:
  npx tsx scripts/backfillTagStoryCounts.ts <suffix-without--NONE>
  npx tsx scripts/backfillStoryStats.ts   <suffix-without--NONE>
Region comes from AWS_REGION (default us-east-2).
"""
import json, os, subprocess, sys, tempfile, time, glob

REGION = os.environ.get('AWS_REGION', 'us-east-2')
SUFFIX = os.environ.get('SUFFIX')
BACKUP = os.path.expanduser(os.environ.get('BACKUP', ''))
APPLY = '--apply' in sys.argv
SKIP = {'StoryReactionCount'}
if not SUFFIX or not BACKUP:
    print('Set SUFFIX (e.g. 5ojm...-NONE) and BACKUP (dir)'); sys.exit(1)


def sval(item, key):
    v = item.get(key)
    return v.get('S') if v else None


def transform(model, item):
    item = dict(item)
    if model in ('Author', 'Narrator', 'Universe'):
        item['searchPk'] = {'S': 'ALL'}
        item['nameLower'] = {'S': (sval(item, 'name') or '').strip().lower()}
    elif model == 'Tag':
        erotic = bool(item.get('isErotic', {}).get('BOOL', False))
        primary = bool(item.get('isPrimary', {}).get('BOOL', False))
        item['searchPk'] = {'S': 'EROTIC' if erotic else 'REGULAR'}
        item['nameLower'] = {'S': (sval(item, 'name') or '').strip().lower()}
        item['primaryFlag'] = {'S': 'true' if primary else 'false'}
        item['storyCount'] = {'N': '0'}
    elif model == 'Story':
        item['titleLower'] = {'S': (sval(item, 'title') or '').strip().lower()}
    return item


def aws(*args):
    r = subprocess.run(['aws', '--region', REGION, *args], capture_output=True, text=True)
    if r.returncode != 0:
        print('AWS ERROR:', r.stderr.strip()); sys.exit(1)
    return r.stdout


def count(table):
    return json.loads(aws('dynamodb', 'scan', '--table-name', table, '--select', 'COUNT', '--output', 'json'))['Count']


def write_batch(table, items):
    req = {table: [{'PutRequest': {'Item': it}} for it in items]}
    for attempt in range(8):
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
            json.dump(req, f); path = f.name
        out = json.loads(aws('dynamodb', 'batch-write-item', '--request-items', 'file://' + path, '--output', 'json') or '{}')
        os.unlink(path)
        req = out.get('UnprocessedItems') or {}
        if not req.get(table):
            return
        time.sleep(0.5 * (attempt + 1))
    print('Gave up on unprocessed items'); sys.exit(1)


suffix_tag = f'-{SUFFIX}.json'
files = sorted(glob.glob(os.path.join(BACKUP, f'*{suffix_tag}')))
if not files:
    print(f'No backup files matching *{suffix_tag} in {BACKUP}'); sys.exit(1)

for path in files:
    model = os.path.basename(path)[:-len(suffix_tag)]
    table = f'{model}-{SUFFIX}'
    if model in SKIP:
        print(f'{model}: skipped (rebuilt by stream Lambda)'); continue
    raw = json.load(open(path)).get('Items', [])
    items = [transform(model, it) for it in raw]
    if not items:
        print(f'{model}: empty, nothing to restore'); continue
    print(f'{model}: {len(items)} items -> {table}')
    if not APPLY:
        continue
    before = count(table)
    for i in range(0, len(items), 25):
        write_batch(table, items[i:i + 25])
    print(f'   count before={before} after={count(table)}')

print('\nDRY RUN only — rerun with --apply to write.' if not APPLY else
      '\nDone. Wait ~2 min, then run backfillTagStoryCounts.ts and backfillStoryStats.ts.')
