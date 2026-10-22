#!/usr/bin/env python3
"""
Count every row a user owns in the DEV sandbox (read-only), via the same userId indexes the user-cleanup
Lambda uses. Used to prove account deletion removes everything.

  python3 scripts/checkUserRows.py <userId>
"""
import json, os, subprocess, sys

REGION = os.environ.get('AWS_REGION', 'us-east-2')
SUFFIX = 'ksza7azahbfobkmlxyzaoqnhf4-NONE'   # dev sandbox only
TARGETS = [
    ('User', None), ('UserPinnedStory', 'byUserAndStory'), ('UserFinishedStory', 'byUserAndStory'),
    ('UserInProgressStory', 'byUserAndStory'), ('UserRating', 'byUserAndStory'),
    ('UserReaction', 'byUserAndStory'), ('UserFavoritedStory', 'byUserAndStory'),
    ('UserFollowedAuthor', 'byUserAndAuthor'), ('UserBookmark', 'byUserAndCreatedAt'),
    ('UserDevice', 'byUserId'), ('Comment', 'byUserAndCreatedAt'),
]
if len(sys.argv) != 2:
    print('usage: python3 scripts/checkUserRows.py <userId>'); sys.exit(1)
uid = sys.argv[1]


def aws(*args):
    r = subprocess.run(['aws', '--region', REGION, *args], capture_output=True, text=True)
    if r.returncode != 0:
        print('AWS ERROR:', r.stderr.strip()); sys.exit(1)
    return json.loads(r.stdout) if r.stdout.strip() else {}   # get-item prints nothing when the item does not exist


total = 0
for model, index in TARGETS:
    table = '%s-%s' % (model, SUFFIX)
    if index is None:
        n = 1 if aws('dynamodb', 'get-item', '--table-name', table,
                     '--key', json.dumps({'id': {'S': uid}}), '--output', 'json').get('Item') else 0
    else:
        n = aws('dynamodb', 'query', '--table-name', table, '--index-name', index,
                '--key-condition-expression', 'userId = :u',
                '--expression-attribute-values', json.dumps({':u': {'S': uid}}),
                '--select', 'COUNT', '--output', 'json').get('Count', 0)
    total += n
    print('  %-22s %d' % (model, n))
print('TOTAL rows for user %s: %d' % (uid, total))
