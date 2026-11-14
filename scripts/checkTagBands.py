#!/usr/bin/env python3
"""
Read-only check of the new tag indexes in one environment.
  python3 scripts/checkTagBands.py dev        # dev | staging | production
Prints: how many StoryTag rows carry a length band, a count per band, one live "tag#band" key queried through the
byLiveTagBandAndPublishedAt index (should return its rows, newest first), and how many Tag rows each type index holds.
"""
import json, sys
from collections import Counter
from tableSafety import aws, table, SUFFIX

def scan_all(name, proj, names=None):
    items, key = [], None
    while True:
        a = ['scan', '--table-name', name, '--projection-expression', proj]
        if names: a += ['--expression-attribute-names', json.dumps(names)]
        if key: a += ['--exclusive-start-key', json.dumps(key)]
        r = aws(*a); items += r['Items']; key = r.get('LastEvaluatedKey')
        if not key: return items

def query(name, index, pk_attr, pk_val, limit=50):
    r = aws('query', '--table-name', name, '--index-name', index, '--key-condition-expression', '#k = :v',
            '--expression-attribute-names', json.dumps({'#k': pk_attr}),
            '--expression-attribute-values', json.dumps({':v': {'S': pk_val}}), '--no-scan-index-forward', '--limit', str(limit))
    return r['Items']

if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] not in SUFFIX: sys.exit(__doc__)
    env = sys.argv[1]
    st, tg = table('StoryTag', env), table('Tag', env)
    links = scan_all(st, 'id, tagId, liveTagId, durationBand, liveTagBand')
    banded = [l for l in links if 'liveTagBand' in l]
    print(f'StoryTag rows: {len(links)}; with a live length band: {len(banded)}; without: {len(links) - len(banded)}')
    by_band = Counter(l['durationBand']['N'] for l in links if 'durationBand' in l)
    print('rows per band (0 = under 15 min, 1 = 15-30, 2 = 30-45 ...):', dict(sorted(by_band.items(), key=lambda x: int(x[0]))))
    if banded:
        key = Counter(l['liveTagBand']['S'] for l in banded).most_common(1)[0][0]
        rows = query(st, 'byLiveTagBandAndPublishedAt', 'liveTagBand', key)
        print(f'index query for {key}: {len(rows)} row(s)')
    for t in ('setting', 'mood', 'tone', 'universe'):
        try:
            rows = query(tg, 'byTypeAndName', 'tagType', t)
            print(f'Tag byTypeAndName "{t}": {len(rows)} row(s)')
        except Exception as e:
            print(f'Tag byTypeAndName "{t}": ERROR {e}')
    try:
        query(tg, 'byTypeAndOrder', 'tagType', 'mood'); print('Tag byTypeAndOrder: index answers')
    except Exception as e:
        print('Tag byTypeAndOrder: ERROR', e)
