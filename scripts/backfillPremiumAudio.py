#!/usr/bin/env python3
"""
Creates the PremiumAudio rows for premium stories that already exist (the Story stream only writes them when a story
changes). Safe to repeat: rows are keyed by the audio path. Also lists rows whose story is no longer premium.
  python3 scripts/backfillPremiumAudio.py <dev|staging|production>            dry run
  python3 scripts/backfillPremiumAudio.py <dev|staging|production> --apply    writes
"""
import json, subprocess, sys
from datetime import datetime, timezone
SUFFIX = {'dev': 'ksza7azahbfobkmlxyzaoqnhf4', 'staging': '5ojmsd7i5nbq5foh2wefkdhj3e', 'production': 'nzvkuznrzjfc5kud3vfik5j7ey'}
R = ['--region', 'us-east-2', '--output', 'json']
env = sys.argv[1] if len(sys.argv) > 1 else ''
if env not in SUFFIX: sys.exit('usage: backfillPremiumAudio.py <dev|staging|production> [--apply]')
apply = '--apply' in sys.argv
def aws(*a):
    out = subprocess.check_output(['aws', 'dynamodb', *a, *R]).decode()
    return json.loads(out) if out.strip() else {}
def scan(table, **kw):
    items, key = [], None
    while True:
        a = ['scan', '--table-name', table]
        if 'proj' in kw: a += ['--projection-expression', kw['proj']]
        if key: a += ['--exclusive-start-key', json.dumps(key)]
        r = aws(*a); items += r['Items']; key = r.get('LastEvaluatedKey')
        if not key: return items
STORY, PA = f'Story-{SUFFIX[env]}-NONE', f'PremiumAudio-{SUFFIX[env]}-NONE'
want = {}
for s in scan(STORY, proj='id, isPremium, audioUri, title'):
    p = s.get('audioUri', {}).get('S', '')
    if s.get('isPremium', {}).get('BOOL') is True and p.startswith('stories/audio/'):
        want[p] = (s['id']['S'], s.get('title', {}).get('S', ''))
have = {r['id']['S']: r.get('storyId', {}).get('S') for r in scan(PA, proj='id, storyId')}
missing = {p: v for p, v in want.items() if p not in have}
extra = [p for p in have if p not in want]
print(f'{env}: {len(want)} premium stories with audio, {len(have)} PremiumAudio rows')
for p, (sid, title) in missing.items(): print(f'  missing: {p}   ({title})')
for p in extra: print(f'  row without a premium story: {p}   (left alone)')
if not missing: print('nothing to add'); sys.exit()
if not apply: print(f'\ndry run: would add {len(missing)}. Re-run with --apply.'); sys.exit()
now = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
for p, (sid, _) in missing.items():
    item = {'id': {'S': p}, 'storyId': {'S': sid}, '__typename': {'S': 'PremiumAudio'}, 'createdAt': {'S': now}, 'updatedAt': {'S': now}}
    aws('put-item', '--table-name', PA, '--item', json.dumps(item), '--condition-expression', 'attribute_not_exists(id)')
print(f'added {len(missing)}')
