#!/usr/bin/env python3
"""Read-only: can the wiped dev Tag table be rebuilt from staging? Usage: python3 scripts/checkTagRecovery.py"""
import json, subprocess

def scan(table, proj):
    out, key = [], None
    while True:
        cmd = ['aws', 'dynamodb', 'scan', '--region', 'us-east-2', '--table-name', table, '--projection-expression', proj, '--output', 'json']
        if key: cmd += ['--exclusive-start-key', json.dumps(key)]
        r = json.loads(subprocess.check_output(cmd))
        out += r['Items']; key = r.get('LastEvaluatedKey')
        if not key: return out

DEV, STG = 'ksza7azahbfobkmlxyzaoqnhf4', '5ojmsd7i5nbq5foh2wefkdhj3e'
dev_links = {i['tagId']['S'] for i in scan(f'StoryTag-{DEV}-NONE', 'tagId') if 'tagId' in i}
dev_insight = {i['id']['S']: i.get('name', {}).get('S', '?') for i in scan(f'TagInsight-{DEV}-NONE', 'id, #n'.replace('#n', 'name')) } if False else {}
for i in scan(f'TagInsight-{DEV}-NONE', 'id'):
    dev_insight[i['id']['S']] = '?'
stg = {i['id']['S']: i.get('name', {}).get('S', '?') for i in scan(f'Tag-{STG}-NONE', 'id, #n'.replace('#n', 'name'))} if False else None
stg_items = scan(f'Tag-{STG}-NONE', 'id')
stg_ids = {i['id']['S'] for i in stg_items}
print(f'dev story links reference {len(dev_links)} distinct tags; {len(dev_links & stg_ids)} of them exist in staging')
print(f'dev tag insights: {len(dev_insight)}; {len(set(dev_insight) & stg_ids)} exist in staging')
print(f'staging has {len(stg_ids)} tags')
missing = dev_links - stg_ids
print('referenced by dev but NOT in staging:', sorted(missing)[:10])
