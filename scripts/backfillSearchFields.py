#!/usr/bin/env python3
"""
In-place backfill of the search fields on EXISTING rows (non-destructive: sets only the new attributes,
never overwrites other fields). Needed for rows created before the scaled schema, because the byName /
byPrimaryAndName / byLiveAndTitle indexes are sparse (rows without the key attributes are invisible).

  Author, Narrator, Universe : searchPk='ALL', nameLower
  Tag                        : searchPk REGULAR|EROTIC, nameLower, primaryFlag 'true'|'false'
  Story                      : titleLower

  SUFFIX=nzvkuznrzjfc5kud3vfik5j7ey-NONE python3 scripts/backfillSearchFields.py            # dry run
  SUFFIX=... python3 scripts/backfillSearchFields.py --apply
Then run backfillTagStoryCounts.ts and backfillStoryStats.ts (absolute counts).
"""
import json, os, subprocess, sys

REGION = os.environ.get('AWS_REGION', 'us-east-2')
SUFFIX = os.environ.get('SUFFIX')
APPLY = '--apply' in sys.argv
if not SUFFIX:
    print('Set SUFFIX, e.g. nzvkuznrzjfc5kud3vfik5j7ey-NONE'); sys.exit(1)


def aws(*args):
    r = subprocess.run(['aws', '--region', REGION, *args], capture_output=True, text=True)
    if r.returncode != 0:
        print('AWS ERROR:', r.stderr.strip()); sys.exit(1)
    return r.stdout


def scan(table):
    return json.loads(aws('dynamodb', 'scan', '--table-name', table, '--output', 'json')).get('Items', [])


def s(item, k):
    v = item.get(k); return v.get('S') if v else None


def wanted(model, it):
    """attribute -> value (DynamoDB JSON) this row should have."""
    if model in ('Author', 'Narrator', 'Universe'):
        return {'searchPk': {'S': 'ALL'}, 'nameLower': {'S': (s(it, 'name') or '').strip().lower()}}
    if model == 'Tag':
        erotic = bool(it.get('isErotic', {}).get('BOOL', False))
        primary = bool(it.get('isPrimary', {}).get('BOOL', False))
        return {'searchPk': {'S': 'EROTIC' if erotic else 'REGULAR'},
                'nameLower': {'S': (s(it, 'name') or '').strip().lower()},
                'primaryFlag': {'S': 'true' if primary else 'false'}}
    if model == 'Story':
        return {'titleLower': {'S': (s(it, 'title') or '').strip().lower()}}
    return {}


total_changed = 0
for model in ['Author', 'Narrator', 'Universe', 'Tag', 'Story']:
    table = f'{model}-{SUFFIX}'
    items = scan(table)
    todo = []
    for it in items:
        want = wanted(model, it)
        diff = {k: v for k, v in want.items() if it.get(k) != v}
        if diff:
            todo.append((it['id'], diff))
    print(f'{model}: {len(items)} rows, {len(todo)} need updating')
    for _id, diff in todo[:2]:
        print('   e.g.', _id['S'], {k: list(v.values())[0] for k, v in diff.items()})
    total_changed += len(todo)
    if not APPLY:
        continue
    for _id, diff in todo:
        names = {f'#a{i}': k for i, k in enumerate(diff)}
        vals = {f':v{i}': diff[k] for i, k in enumerate(diff)}
        expr = 'SET ' + ', '.join(f'#a{i} = :v{i}' for i in range(len(diff)))
        aws('dynamodb', 'update-item', '--table-name', table, '--key', json.dumps({'id': _id}),
            '--update-expression', expr, '--expression-attribute-names', json.dumps(names),
            '--expression-attribute-values', json.dumps(vals),
            '--condition-expression', 'attribute_exists(id)')
print(f'\n{"Updated" if APPLY else "DRY RUN: would update"} {total_changed} rows.' + ('' if APPLY else ' Rerun with --apply.'))
