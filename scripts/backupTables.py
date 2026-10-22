#!/usr/bin/env python3
"""
Back up EVERY DynamoDB table of one Amplify environment (read-only; nothing is changed or deleted).
One scan per table is written to BACKUP/<Model>-<SUFFIX>.json, the format scripts/restoreSandboxData.py reads.

  SUFFIX=5ojmsd7i5nbq5foh2wefkdhj3e-NONE BACKUP=~/staging-backup-2026-10-21 python3 scripts/backupTables.py
  SUFFIX=nzvkuznrzjfc5kud3vfik5j7ey-NONE BACKUP=~/prod-backup-2026-10-21     python3 scripts/backupTables.py

Environment suffixes: dev ksza7azahbfobkmlxyzaoqnhf4-NONE, staging 5ojmsd7i5nbq5foh2wefkdhj3e-NONE,
production nzvkuznrzjfc5kud3vfik5j7ey-NONE. Region comes from AWS_REGION (default us-east-2).
Each backup is verified by comparing its row count with a live COUNT before moving on.
"""
import json, os, subprocess, sys, time

REGION = os.environ.get('AWS_REGION', 'us-east-2')
SUFFIX = os.environ.get('SUFFIX')
BACKUP = os.path.expanduser(os.environ.get('BACKUP', ''))
KNOWN = {
    'ksza7azahbfobkmlxyzaoqnhf4-NONE': 'dev',
    '5ojmsd7i5nbq5foh2wefkdhj3e-NONE': 'staging',
    'nzvkuznrzjfc5kud3vfik5j7ey-NONE': 'production',
}
if not SUFFIX or not BACKUP:
    print('Set SUFFIX (e.g. 5ojm...-NONE) and BACKUP (a new directory)'); sys.exit(1)
if SUFFIX not in KNOWN:
    print('Unknown SUFFIX %s - expected one of: %s' % (SUFFIX, ', '.join(KNOWN))); sys.exit(1)


def aws(*args):
    # Retries timeouts and other transient failures (a flaky connection should not kill a long backup).
    last = ''
    for attempt in range(6):
        r = subprocess.run(['aws', '--region', REGION, '--cli-read-timeout', '90', '--cli-connect-timeout', '30', *args],
                           capture_output=True, text=True)
        if r.returncode == 0:
            return r.stdout
        last = r.stderr.strip()
        print('  (retrying after: %s)' % last.splitlines()[0][:100] if last else '  (retrying)')
        time.sleep(2 * (attempt + 1))
    print('AWS ERROR:', last); sys.exit(1)


names, token = [], None
while True:
    a = ['dynamodb', 'list-tables', '--output', 'json']
    if token:
        a += ['--starting-token', token]
    out = json.loads(aws(*a))
    names += out.get('TableNames', [])
    token = out.get('NextToken')
    if not token:
        break
tables = sorted(n for n in names if n.endswith('-' + SUFFIX))
if not tables:
    print('No tables found with suffix', SUFFIX); sys.exit(1)

os.makedirs(BACKUP, exist_ok=True)
print('Backing up %d %s tables to %s' % (len(tables), KNOWN[SUFFIX], BACKUP))
total = 0
for t in tables:
    out = aws('dynamodb', 'scan', '--table-name', t, '--output', 'json')
    with open(os.path.join(BACKUP, t + '.json'), 'w') as f:
        f.write(out)
    n = len(json.loads(out).get('Items', []))
    live = json.loads(aws('dynamodb', 'scan', '--table-name', t, '--select', 'COUNT', '--output', 'json')).get('Count', 0)
    flag = '' if n == live else '   <-- differs from live count %d (table changing while backing up?)' % live
    print('  %-60s %6d rows%s' % (t, n, flag))
    total += n
print('Done. %d rows backed up.' % total)
