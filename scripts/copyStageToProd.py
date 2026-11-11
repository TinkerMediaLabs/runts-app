#!/usr/bin/env python3
"""
One-time copy of CONTENT from the staging environment to production (same ids, same S3 keys).

  python3 scripts/copyStageToProd.py            dry run: row counts per table, S3 summary, nothing changed
  python3 scripts/copyStageToProd.py --apply    1) syncs the staging bucket to production (not profile-pictures/),
                                                2) copies the content tables, 3) verifies the counts

Copies: Tag, Author, Narrator, Universe, Story, StoryTag, StoryScene, StoryNarrator, HomeSection.
Skips (rebuilt by the scheduled jobs / user data): TagInsight, TrendingSnapshot, every User* table.
Resets counters so the stream aggregators count from zero on production: Story.numListens=0,
Story.avgRating/numRatings/numComments removed, Tag.storyCount=0.
Refuses to run if any destination table already has rows. Only ever reads staging.
After it finishes run the backfills (see handoff).
"""
import json, os, subprocess, sys, tempfile, time

REGION = os.environ.get('AWS_REGION', 'us-east-2')
SRC, DST = '5ojmsd7i5nbq5foh2wefkdhj3e-NONE', 'nzvkuznrzjfc5kud3vfik5j7ey-NONE'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
def bucket(env): return json.load(open(os.path.join(ROOT, f'amplify_outputs.{env}.json')))['storage']['bucket_name']
SRC_B, DST_B = bucket('staging'), bucket('production')
ORDER = ['Tag', 'Author', 'Narrator', 'Universe', 'Story', 'StoryTag', 'StoryScene', 'StoryNarrator', 'HomeSection']
APPLY = '--apply' in sys.argv

def aws(*a, ok_fail=False):
    r = subprocess.run(['aws', '--region', REGION, *a], capture_output=True, text=True)
    if r.returncode != 0:
        if ok_fail: return None
        print('AWS ERROR:', r.stderr.strip()); sys.exit(1)
    return r.stdout

def count(t):
    return json.loads(aws('dynamodb', 'scan', '--table-name', t, '--select', 'COUNT', '--output', 'json'))['Count']

def scan_pages(t):
    start = None
    while True:
        a = ['dynamodb', 'scan', '--table-name', t, '--max-items', '250', '--output', 'json']
        if start: a += ['--starting-token', start]
        out = json.loads(aws(*a))
        yield out.get('Items', [])
        start = out.get('NextToken')
        if not start: break

def fix(model, item):
    if model == 'Story':
        item['numListens'] = {'N': '0'}
        for k in ('avgRating', 'numRatings', 'numComments'): item.pop(k, None)
    if model == 'Tag':
        item['storyCount'] = {'N': '0'}
    return item

def put_all(t, items):
    reqs = [{'PutRequest': {'Item': i}} for i in items]
    i = 0
    while i < len(reqs):
        n = 25
        while n > 1 and len(json.dumps(reqs[i:i + n])) > 10_000_000: n //= 2
        req = {t: reqs[i:i + n]}
        for attempt in range(8):
            with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as tf: json.dump(req, tf)
            res = json.loads(aws('dynamodb', 'batch-write-item', '--request-items', 'file://' + tf.name, '--output', 'json'))
            os.unlink(tf.name)
            left = res.get('UnprocessedItems', {})
            if not left: break
            req = left; time.sleep(0.3 * (attempt + 1))
        else:
            print('Could not write all rows to', t); sys.exit(1)
        i += n; time.sleep(0.15)

src = {m: f'{m}-{SRC}' for m in ORDER}
dst = {m: f'{m}-{DST}' for m in ORDER}
sc = {m: count(src[m]) for m in ORDER}
dc = {m: count(dst[m]) for m in ORDER}
print('%-16s %8s %8s' % ('table', 'staging', 'prod'))
for m in ORDER: print('%-16s %8d %8d' % (m, sc[m], dc[m]))
s3 = aws('s3', 'ls', 's3://' + SRC_B, '--recursive', '--summarize', ok_fail=True) or ''
print('Staging bucket:', ' | '.join(l.strip() for l in s3.splitlines() if 'Total' in l) or 'could not list')
if any(dc.values()):
    print('\nA production table already has rows. Aborting (this copy only runs into empty tables).'); sys.exit(1)
if not APPLY:
    print('\nDRY RUN - nothing changed. Re-run with --apply to copy.'); sys.exit(0)

print('\nSyncing S3 (staging -> production, excluding profile-pictures/)...')
r = subprocess.run(['aws', '--region', REGION, 's3', 'sync', f's3://{SRC_B}', f's3://{DST_B}', '--exclude', 'profile-pictures/*', '--only-show-errors'])
if r.returncode != 0: print('S3 sync failed; no rows were written.'); sys.exit(1)
print('S3 done.')

for m in ORDER:
    n = 0
    for page in scan_pages(src[m]):
        put_all(dst[m], [fix(m, i) for i in page]); n += len(page)
    print('  %-16s %6d copied' % (m, n))

print('\nVerifying...')
ok = True
for m in ORDER:
    d = count(dst[m]); flag = 'ok' if d == sc[m] else 'MISMATCH'
    ok &= d == sc[m]; print('  %-16s staging %6d  prod %6d  %s' % (m, sc[m], d, flag))
print('\nDone.' if ok else '\nCounts differ - tell Claude before doing anything else.')
