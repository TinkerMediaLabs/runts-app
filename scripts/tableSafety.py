#!/usr/bin/env python3
"""
Safety net for schema changes. Amplify DELETES AND RECREATES a table whenever an index is added or removed
(all rows lost). Before any deploy that touches an index on a table with real data:

  1. python3 scripts/tableSafety.py backup  <Model> <env>            -> prints a backup ARN
  2. deploy, then check the table is empty
  3. python3 scripts/tableSafety.py restore <Model> <env> <backupArn> -> copies every row back
  4. python3 scripts/tableSafety.py count   <Model> <env>             -> compare with the count before

<env> is dev | staging | production. Row writes go through the normal table, so streams fire (the sync
Lambdas are idempotent). Restore never deletes the temporary table; it prints the command so you decide.
"""
import json, subprocess, sys, tempfile, time, os

SUFFIX = {'dev': 'ksza7azahbfobkmlxyzaoqnhf4', 'staging': '5ojmsd7i5nbq5foh2wefkdhj3e', 'production': 'nzvkuznrzjfc5kud3vfik5j7ey'}
R = ['--region', 'us-east-2']

def aws(*args):
    out = subprocess.check_output(['aws', 'dynamodb', *args, *R, '--output', 'json']).decode()
    return json.loads(out) if out.strip() else {}

def table(model, env): return f'{model}-{SUFFIX[env]}-NONE'

def count(name):
    n, key = 0, None
    while True:
        a = ['scan', '--table-name', name, '--select', 'COUNT']
        if key: a += ['--exclusive-start-key', json.dumps(key)]
        r = aws(*a); n += r['Count']; key = r.get('LastEvaluatedKey')
        if not key: return n

def wait_active(name):
    while True:
        try:
            if aws('describe-table', '--table-name', name)['Table']['TableStatus'] == 'ACTIVE': return
        except subprocess.CalledProcessError: pass
        time.sleep(10)

def backup(model, env):
    name = table(model, env)
    print(f'{name}: {count(name)} rows')
    r = aws('create-backup', '--table-name', name, '--backup-name', f'{model}-{env}-{int(time.time())}')
    arn = r['BackupDetails']['BackupArn']
    while aws('describe-backup', '--backup-arn', arn)['BackupDescription']['BackupDetails']['BackupStatus'] != 'AVAILABLE': time.sleep(5)
    print('backup ready:', arn)

def batch_write(target, items):
    for i in range(0, len(items), 25):
        req = {target: [{'PutRequest': {'Item': it}} for it in items[i:i + 25]]}
        while req:
            with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f: json.dump(req, f)
            r = aws('batch-write-item', '--request-items', 'file://' + f.name); os.unlink(f.name)
            req = r.get('UnprocessedItems') or None
            if req: time.sleep(1)

def restore(model, env, arn):
    target, tmp = table(model, env), f'{table(model, env)}-restore-{int(time.time())}'
    if count(target) != 0: sys.exit(f'{target} is not empty; refusing to overwrite. Nothing done.')
    print('restoring backup into', tmp, '(a few minutes)...')
    aws('restore-table-from-backup', '--target-table-name', tmp, '--backup-arn', arn)
    wait_active(tmp)
    key, n = None, 0
    while True:
        a = ['scan', '--table-name', tmp]
        if key: a += ['--exclusive-start-key', json.dumps(key)]
        r = aws(*a); batch_write(target, r['Items']); n += len(r['Items']); key = r.get('LastEvaluatedKey')
        print(f'  copied {n}')
        if not key: break
    print(f'done: {count(tmp)} rows in backup copy, {count(target)} rows in {target}')
    print('when satisfied, remove the temporary table with:')
    print(f'  aws dynamodb delete-table {" ".join(R)} --table-name {tmp}')

if __name__ == '__main__':
    cmd, model, env = sys.argv[1:4]
    if env not in SUFFIX: sys.exit('env must be dev | staging | production')
    if cmd == 'backup': backup(model, env)
    elif cmd == 'count': print(count(table(model, env)))
    elif cmd == 'restore': restore(model, env, sys.argv[4])
    else: sys.exit(__doc__)
