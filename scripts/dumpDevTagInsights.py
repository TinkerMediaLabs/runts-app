#!/usr/bin/env python3
"""Read-only: saves dev TagInsight rows (id, name, listFlag, liveCount) to ~/devTagInsights.json."""
import json, os, subprocess
DEV = 'ksza7azahbfobkmlxyzaoqnhf4'
r = json.loads(subprocess.check_output(['aws', 'dynamodb', 'scan', '--region', 'us-east-2', '--table-name', f'TagInsight-{DEV}-NONE', '--output', 'json']))
rows = [{k: list(v.values())[0] for k, v in i.items()} for i in r['Items']]
path = os.path.expanduser('~/devTagInsights.json')
json.dump(rows, open(path, 'w'), indent=2)
print(f'saved {len(rows)} rows to {path}')
for x in sorted(rows, key=lambda x: str(x.get('name', '')).lower()):
    print(x['id'][:8], '|', x.get('name', '(no name)'), '| listFlag:', x.get('listFlag', '-'), '| live:', x.get('liveCount', '-'))
