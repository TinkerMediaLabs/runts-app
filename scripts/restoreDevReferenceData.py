#!/usr/bin/env python3
"""
Restore dev reference data (Tag, Author, Narrator, Universe) from a DynamoDB scan backup into the
freshly recreated tables, adding the new search fields (searchPk / nameLower / primaryFlag) and
resetting Tag.storyCount to 0. Stories / StoryTag are NOT restored (they get re-pushed).

  python3 scripts/restoreDevReferenceData.py            # dry run: shows what it would write
  python3 scripts/restoreDevReferenceData.py --apply    # writes via `aws dynamodb batch-write-item`

Uses only the AWS CLI + python stdlib. Same transform is what the production backfill needs.
"""
import json, os, subprocess, sys, tempfile, time

SUFFIX = os.environ.get('SUFFIX', 'ksza7azahbfobkmlxyzaoqnhf4-NONE')
BACKUP = os.path.expanduser(os.environ.get('BACKUP', '~/dev-backup-2026-10-16'))
APPLY = '--apply' in sys.argv
MODELS = ['Tag', 'Author', 'Narrator', 'Universe']


def sval(item, key):
    v = item.get(key)
    return v.get('S') if v else None


def transform(model, item):
    item = dict(item)
    name = (sval(item, 'name') or '').strip()
    if model in ('Author', 'Narrator', 'Universe'):
        item['searchPk'] = {'S': 'ALL'}
        item['nameLower'] = {'S': name.lower()}
    elif model == 'Tag':
        erotic = bool(item.get('isErotic', {}).get('BOOL', False))
        primary = bool(item.get('isPrimary', {}).get('BOOL', False))
        item['searchPk'] = {'S': 'EROTIC' if erotic else 'REGULAR'}
        item['nameLower'] = {'S': name.lower()}
        item['primaryFlag'] = {'S': 'true' if primary else 'false'}
        item['storyCount'] = {'N': '0'}
    return item


def aws(*args):
    r = subprocess.run(['aws', *args], capture_output=True, text=True)
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


for model in MODELS:
    table = f'{model}-{SUFFIX}'
    src = os.path.join(BACKUP, f'{model}.json')
    items = [transform(model, it) for it in json.load(open(src))['Items']]
    print(f'{model}: {len(items)} items from backup -> {table}')
    if not APPLY:
        for it in items[:2]:
            print('   sample:', {k: list(v.values())[0] for k, v in it.items() if k in ('name', 'searchPk', 'nameLower', 'primaryFlag', 'storyCount')})
        continue
    before = count(table)
    for i in range(0, len(items), 25):
        write_batch(table, items[i:i + 25])
    print(f'   table count before={before} after={count(table)}')

print('\nDRY RUN only — rerun with --apply to write.' if not APPLY else '\nDone.')
