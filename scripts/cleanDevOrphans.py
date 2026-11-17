#!/usr/bin/env python3
"""
Dev sandbox only: removes StoryTag / StoryScene / StoryNarrator rows, and dev user rows (pins, finished, in-progress, ratings, reactions,
favorites, bookmarks, counters, comments) whose story no longer exists.

  python3 scripts/cleanDevOrphans.py            dry run: counts only
  python3 scripts/cleanDevOrphans.py --apply    deletes the orphan rows

Only ever touches the dev tables (suffix below).
"""
import json, os, subprocess, sys, tempfile, time
REGION = os.environ.get('AWS_REGION', 'us-east-2')
SUF = 'ksza7azahbfobkmlxyzaoqnhf4-NONE'
APPLY = '--apply' in sys.argv

def aws(*a):
    r = subprocess.run(['aws', '--region', REGION, *a], capture_output=True, text=True)
    if r.returncode != 0:
        if 'ResourceNotFoundException' in r.stderr: return '{"Items": []}'
        print('AWS ERROR:', r.stderr.strip()); sys.exit(1)
    return r.stdout

def scan(t, proj):
    start = None
    while True:
        a = ['dynamodb', 'scan', '--table-name', t, '--projection-expression', proj,
             '--expression-attribute-names', json.dumps({'#i': 'id', '#s': 'storyId'}) if '#s' in proj else json.dumps({'#i': 'id'}),
             '--max-items', '500', '--output', 'json']
        if start: a += ['--starting-token', start]
        out = json.loads(aws(*a))
        for i in out.get('Items', []): yield i
        start = out.get('NextToken')
        if not start: break

stories = {i['id']['S'] for i in scan(f'Story-{SUF}', '#i')}
print('Stories in dev:', len(stories))
MODELS = ('StoryTag', 'StoryScene', 'StoryNarrator', 'UserPinnedStory', 'UserFinishedStory', 'UserInProgressStory',
          'UserRating', 'UserReaction', 'UserFavoritedStory', 'UserBookmark', 'StoryReactionCount', 'StoryListenDay',
          'Comment', 'CommentReport')
for m in MODELS:
    t = f'{m}-{SUF}'
    orphans = [i['id']['S'] for i in scan(t, '#i, #s') if i.get('storyId', {}).get('S') and i['storyId']['S'] not in stories]
    print('%-14s orphans: %d' % (m, len(orphans)))
    if APPLY:
        for k in range(0, len(orphans), 25):
            req = {t: [{'DeleteRequest': {'Key': {'id': {'S': x}}}} for x in orphans[k:k + 25]]}
            with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as tf: json.dump(req, tf)
            aws('dynamodb', 'batch-write-item', '--request-items', 'file://' + tf.name)
            os.unlink(tf.name); time.sleep(0.1)
        print('   deleted')
if not APPLY: print('\nDRY RUN - nothing changed. Re-run with --apply to delete.')
