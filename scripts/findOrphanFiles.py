#!/usr/bin/env python3
"""
Report files in a storage bucket that no database row references (READ-ONLY; prints the `aws s3 rm`
commands but never runs them).

  BUCKET=amplify-runts-staging-san-runtsstoragebucketf8df8e-ixeas7ief3e3 SUFFIX=5ojmsd7i5nbq5foh2wefkdhj3e-NONE \
    python3 scripts/findOrphanFiles.py

Referenced fields: Story.imageUri/audioUri, Tag.imageUri/tileImageUri/heroImageUri, Author/Narrator.profilePicUri.
Checked prefixes: stories/, authors/, narrators/ (profile-pictures/ is per-user and ignored).
"""
import json, os, subprocess, sys

REGION = os.environ.get('AWS_REGION', 'us-east-2')
BUCKET, SUFFIX = os.environ.get('BUCKET'), os.environ.get('SUFFIX')
if not BUCKET or not SUFFIX:
    print('Set BUCKET and SUFFIX'); sys.exit(1)


def aws(*a):
    r = subprocess.run(['aws', '--region', REGION, *a], capture_output=True, text=True)
    if r.returncode != 0:
        print('AWS ERROR:', r.stderr.strip()); sys.exit(1)
    return r.stdout


def scan(model):
    return json.loads(aws('dynamodb', 'scan', '--table-name', f'{model}-{SUFFIX}', '--output', 'json')).get('Items', [])


FIELDS = {'Story': ['imageUri', 'audioUri'], 'Tag': ['imageUri', 'tileImageUri', 'heroImageUri'],
          'Author': ['profilePicUri'], 'Narrator': ['profilePicUri']}
ref = set()
for model, fields in FIELDS.items():
    for it in scan(model):
        for f in fields:
            v = it.get(f, {}).get('S')
            if v and not v.startswith('http'):
                ref.add(v)

orphans, total = [], 0
for prefix in ('stories/', 'authors/', 'narrators/'):
    token = None
    while True:
        cmd = ['s3api', 'list-objects-v2', '--bucket', BUCKET, '--prefix', prefix, '--output', 'json']
        if token:
            cmd += ['--starting-token', token]
        out = json.loads(aws(*cmd) or '{}')
        for o in out.get('Contents', []) or []:
            if o['Key'].endswith('/'):
                continue
            total += 1
            if o['Key'] not in ref:
                orphans.append((o['Key'], o['Size']))
        token = out.get('NextToken')
        if not token:
            break

print(f'{total} files checked, {len(ref)} referenced paths, {len(orphans)} unreferenced:')
for k, sz in sorted(orphans):
    print(f'  {sz / 1e6:8.1f} MB  {k}')
print(f'  total {sum(s for _, s in orphans) / 1e6:.1f} MB')
if orphans:
    print('\nTo delete one (review first!):')
    for k, _ in sorted(orphans):
        print(f"  aws s3 rm 's3://{BUCKET}/{k}' --region {REGION}")
