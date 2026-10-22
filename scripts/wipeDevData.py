#!/usr/bin/env python3
"""
Wipe the DEV sandbox (`--identifier mylaptop`): every DynamoDB table's rows and every file in the dev S3
bucket. Keeps the infrastructure, the Cognito users/groups (including the CMS admin login) and all IDs.

SAFETY: the dev table suffix and bucket are hard-coded below. The script only ever touches tables named
<Model>-<DEV_SUFFIX> and that one bucket, so it cannot be pointed at staging or production.

  python3 scripts/wipeDevData.py            dry run: row counts per table + S3 file count, nothing changed
  python3 scripts/wipeDevData.py --apply    1) backs up every table to BACKUP (a scan per table, same format
                                               scripts/restoreSandboxData.py reads), 2) deletes all rows
                                               except the Publisher table's (see KEEP_ROWS),
                                               3) empties the S3 bucket (files are NOT backed up)

BACKUP defaults to ~/dev-backup-<today>-pre-wipe; set BACKUP=... to change it.
Deleting rows fires the stream Lambdas (aggregators, tag-index-sync, user-cleanup); the deletes are paced
to keep that gentle. After the wipe the counters (StoryStats, tag counts) start from zero by themselves.
"""
import json, os, subprocess, sys, tempfile, time, datetime

REGION = os.environ.get('AWS_REGION', 'us-east-2')
DEV_SUFFIX = 'ksza7azahbfobkmlxyzaoqnhf4-NONE'
DEV_BUCKET = 'amplify-runts-mylaptop-sa-runtsstoragebucketf8df8e-nbvf1w2ensh4'
APPLY = '--apply' in sys.argv
# Tables that are backed up but whose rows are KEPT. The CMS hard-codes the single publisher id
# (runts-admin StoryFormPage PUBLISHER_ID) and has no screen to create a Publisher, so it must survive.
KEEP_ROWS = ('Publisher',)
BACKUP = os.path.expanduser(os.environ.get(
    'BACKUP', '~/dev-backup-%s-pre-wipe' % datetime.date.today().isoformat()))


def aws(*args, ok_fail=False):
    r = subprocess.run(['aws', '--region', REGION, *args], capture_output=True, text=True)
    if r.returncode != 0:
        if ok_fail:
            return None
        print('AWS ERROR:', r.stderr.strip())
        sys.exit(1)
    return r.stdout


def dev_tables():
    names, token = [], None
    while True:
        args = ['dynamodb', 'list-tables', '--output', 'json']
        if token:
            args += ['--starting-token', token]
        out = json.loads(aws(*args))
        names += out.get('TableNames', [])
        token = out.get('NextToken')
        if not token:
            break
    return sorted(n for n in names if n.endswith('-' + DEV_SUFFIX))


def count_rows(table):
    out = json.loads(aws('dynamodb', 'scan', '--table-name', table, '--select', 'COUNT', '--output', 'json'))
    return out.get('Count', 0)


def backup_table(table):
    out = aws('dynamodb', 'scan', '--table-name', table, '--output', 'json')
    with open(os.path.join(BACKUP, table + '.json'), 'w') as f:
        f.write(out)
    return len(json.loads(out).get('Items', []))


def wipe_table(table):
    deleted, start = 0, None
    while True:
        args = ['dynamodb', 'scan', '--table-name', table, '--projection-expression', 'id',
                '--max-items', '250', '--output', 'json']
        if start:
            args += ['--starting-token', start]
        out = json.loads(aws(*args))
        ids = [i['id']['S'] for i in out.get('Items', []) if 'id' in i]
        for i in range(0, len(ids), 25):
            chunk = ids[i:i + 25]
            req = {table: [{'DeleteRequest': {'Key': {'id': {'S': x}}}} for x in chunk]}
            for attempt in range(8):
                with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as tf:
                    json.dump(req, tf)
                res = json.loads(aws('dynamodb', 'batch-write-item', '--request-items', 'file://' + tf.name,
                                     '--output', 'json'))
                os.unlink(tf.name)
                left = res.get('UnprocessedItems', {})
                if not left:
                    break
                req = left
                time.sleep(0.3 * (attempt + 1))
            else:
                print('Could not delete all rows of', table); sys.exit(1)
            deleted += len(chunk)
            time.sleep(0.15)
        start = out.get('NextToken')
        if not start:
            break
    return deleted


tables = dev_tables()
if not tables:
    print('No tables found with suffix', DEV_SUFFIX); sys.exit(1)

print('Dev tables found:', len(tables))
counts = {t: count_rows(t) for t in tables}
for t in tables:
    print('  %-60s %6d rows' % (t, counts[t]))
print('  TOTAL rows:', sum(counts.values()))

s3out = aws('s3', 'ls', 's3://' + DEV_BUCKET, '--recursive', '--summarize', ok_fail=True) or ''
summary = [l.strip() for l in s3out.splitlines() if 'Total Objects' in l or 'Total Size' in l]
print('S3 bucket %s: %s' % (DEV_BUCKET, ' | '.join(summary) or 'could not list'))

if not APPLY:
    print('\nDRY RUN - nothing changed. Re-run with --apply to back up, wipe and empty the bucket.')
    sys.exit(0)

os.makedirs(BACKUP, exist_ok=True)
print('\nBacking up to', BACKUP)
for t in tables:
    n = backup_table(t)
    if n != counts[t]:
        print('Backup row count differs for %s (%d vs %d); stopping before any delete.' % (t, n, counts[t]))
        sys.exit(1)
print('Backup complete.')

print('\nDeleting rows...')
for t in tables:
    if t.startswith(tuple(k + '-' for k in KEEP_ROWS)):
        print('  %-60s kept' % t)
    elif counts[t]:
        print('  %-60s %6d deleted' % (t, wipe_table(t)))

print('\nEmptying S3 bucket...')
aws('s3', 'rm', 's3://' + DEV_BUCKET, '--recursive', '--quiet')

print('\nDone. Dev tables and bucket are empty. Cognito users and groups were not touched.')
