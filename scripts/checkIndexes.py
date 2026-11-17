#!/usr/bin/env python3
"""
Read-only check that tells you, BEFORE a deploy, whether Amplify will delete and recreate any table because an index
was added or removed. Compares the secondary indexes written in amplify/data/resource.ts with the real tables of an
environment.   python3 scripts/checkIndexes.py <dev|staging|production>
Prints OK for tables that match, and WILL BE RECREATED (with the index names) for any that do not.
"""
import json, re, subprocess, sys
SUFFIX = {'dev': 'ksza7azahbfobkmlxyzaoqnhf4', 'staging': '5ojmsd7i5nbq5foh2wefkdhj3e', 'production': 'nzvkuznrzjfc5kud3vfik5j7ey'}
R = ['--region', 'us-east-2', '--output', 'json']
env = sys.argv[1] if len(sys.argv) > 1 else ''
if env not in SUFFIX: sys.exit('usage: checkIndexes.py <dev|staging|production>')
suffix = SUFFIX[env]

wanted, model = {}, None
for line in open('amplify/data/resource.ts', encoding='utf-8'):
    m = re.match(r'^\s{0,2}(\w+): a\b', line)
    if m: model = m.group(1); wanted.setdefault(model, set()); continue
    if model and 'index(' in line and not line.strip().startswith('//'):
        n = re.search(r"\.name\('([^']+)'\)", line)
        wanted[model].add(n.group(1) if n else 'UNNAMED:' + line.strip()[:50])

def aws(*a): return json.loads(subprocess.check_output(['aws', 'dynamodb', *a, *R]).decode())
names, key = [], None
while True:
    r = aws('list-tables', *(['--exclusive-start-table-name', key] if key else []))
    names += r['TableNames']; key = r.get('LastEvaluatedTableName')
    if not key: break
live = {n.rsplit('-' + suffix + '-NONE', 1)[0]: n for n in names if n.endswith('-' + suffix + '-NONE')}

bad = 0
for mdl, tname in sorted(live.items()):
    have = {g['IndexName'] for g in aws('describe-table', '--table-name', tname)['Table'].get('GlobalSecondaryIndexes', []) if not g['IndexName'].startswith('gsi-')}   # gsi-* are made by Amplify for relationships
    want = wanted.get(mdl, set())
    if have == want: print(f'OK      {mdl} ({len(have)} indexes)'); continue
    bad += 1
    print(f'WILL BE RECREATED  {mdl}: added {sorted(want - have)}  removed {sorted(have - want)}')
for mdl, idx in sorted(wanted.items()):
    if idx and mdl not in live: print(f'NEW TABLE (safe)   {mdl}: {len(idx)} indexes')
print('\nRESULT:', 'DO NOT DEPLOY YET: back up the tables above' if bad else 'no table will be recreated')
