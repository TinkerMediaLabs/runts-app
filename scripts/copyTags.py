#!/usr/bin/env python3
"""Copy every Tag row from staging into the (empty) dev Tag table. storyCount is reset to 0.
Usage: python3 scripts/copyTags.py   Refuses to run if dev already has tags."""
import json, sys
from tableSafety import aws, table, count, batch_write

src, dst = table('Tag', 'staging'), table('Tag', 'dev')
if count(dst) != 0: sys.exit(f'{dst} is not empty; nothing done.')
items, key = [], None
while True:
    a = ['scan', '--table-name', src]
    if key: a += ['--exclusive-start-key', json.dumps(key)]
    r = aws(*a); items += r['Items']; key = r.get('LastEvaluatedKey')
    if not key: break
for it in items:
    if 'storyCount' in it: it['storyCount'] = {'N': '0'}
batch_write(dst, items)
print(f'copied {len(items)} tags from staging to dev; dev now has {count(dst)}')
