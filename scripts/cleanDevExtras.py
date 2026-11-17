#!/usr/bin/env python3
"""
Dev sandbox only: after copyStageToDev.py, removes dev content rows whose id does not exist in staging
(old dev-only tags, authors, home sections... that show up as duplicates in the app).

  python3 scripts/cleanDevExtras.py            dry run: counts only
  python3 scripts/cleanDevExtras.py --apply    deletes those dev rows

Reads staging, deletes only in dev. Content tables only (no user data).
"""
import json, os, subprocess, sys, tempfile, time
REGION = os.environ.get('AWS_REGION', 'us-east-2')
SRC, DST = '5ojmsd7i5nbq5foh2wefkdhj3e-NONE', 'ksza7azahbfobkmlxyzaoqnhf4-NONE'
MODELS = ['Tag', 'Author', 'Narrator', 'Universe', 'HomeSection', 'StoryScene']
APPLY = '--apply' in sys.argv

def aws(*a):
    r = subprocess.run(['aws', '--region', REGION, *a], capture_output=True, text=True)
    if r.returncode != 0: print('AWS ERROR:', r.stderr.strip()); sys.exit(1)
    return r.stdout

def ids(t):
    start = None
    while True:
        a = ['dynamodb', 'scan', '--table-name', t, '--projection-expression', 'id', '--max-items', '500', '--output', 'json']
        if start: a += ['--starting-token', start]
        out = json.loads(aws(*a))
        for i in out.get('Items', []): yield i['id']['S']
        start = out.get('NextToken')
        if not start: break

for m in MODELS:
    keep = set(ids(f'{m}-{SRC}'))
    extra = [i for i in ids(f'{m}-{DST}') if i not in keep]
    print('%-12s staging %4d  dev-only rows: %d' % (m, len(keep), len(extra)))
    if APPLY:
        t = f'{m}-{DST}'
        for k in range(0, len(extra), 25):
            req = {t: [{'DeleteRequest': {'Key': {'id': {'S': x}}}} for x in extra[k:k + 25]]}
            with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as tf: json.dump(req, tf)
            aws('dynamodb', 'batch-write-item', '--request-items', 'file://' + tf.name)
            os.unlink(tf.name); time.sleep(0.1)
        print('   deleted')
if not APPLY: print('\nDRY RUN - nothing changed. Re-run with --apply to delete.')
