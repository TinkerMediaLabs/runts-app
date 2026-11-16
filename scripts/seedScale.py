#!/usr/bin/env python3
"""
Scale test data for the DEV sandbox only. Adds thousands of synthetic live stories, authors, universes and tags
so you can check that Home, Discover, Tag Home, the taste picker and "Picked for today" make the same number of
requests as with a small catalog, and that every list still pages.

  python3 scripts/seedScale.py plan  [stories]     what would be written to dev (nothing is written)
  python3 scripts/seedScale.py apply [stories]     writes the rows (default 3000 stories)
  python3 scripts/seedScale.py pins <sub> <username> [count]   pins [count] (default 600) of the seeded stories for one dev account
  python3 scripts/seedScale.py demote-genres       turns the seeded primary genre tags into regular tags (older runs made 300)
  python3 scripts/seedScale.py remove              deletes the pins, stories, links, authors and universes it made
  python3 scripts/seedScale.py remove-tags         deletes the tags it made (run ~5 minutes after remove)

For 3000 stories it makes: 300 authors, 300 universes (a fifth of the stories belong to one), 30 primary genre
tags, 1500 other genre tags, 300 setting tags, 60 mood tags (they show in the picker), 40 tone tags, 3000 stories
and about 20000 story-to-tag links. Everything it writes has an id starting with "scale-", so remove finds exactly
those rows and never touches real data. The sync Lambdas see the writes on the streams, so tag counts and the
live-tag and length-band fields fill in on their own, the same as for a story saved in the CMS; give them a few
minutes after apply. remove and remove-tags are separate because deleting tags while their links still exist would
let the count function re-create empty tag rows. Safe to re-run: same ids, same rows.
"""
import json, random, subprocess, sys, tempfile, os, time
from datetime import datetime, timedelta, timezone
from tableSafety import aws, table, batch_write

ENV = 'dev'                # hard-coded on purpose: this script must never touch staging or production
PUBLISHER_ID = '05f92ae8-d37b-4876-9a37-995736d6de8f'
random.seed(214)           # same data every run

def s(v): return {'S': str(v)}
def n(v): return {'N': str(v)}
def b(v): return {'BOOL': bool(v)}

def scan_all(name, **kw):
    items, key = [], None
    while True:
        a = ['scan', '--table-name', name]
        for k, v in kw.items(): a += ['--' + k.replace('_', '-'), v]
        if key: a += ['--exclusive-start-key', json.dumps(key)]
        r = aws(*a); items += r['Items']; key = r.get('LastEvaluatedKey')
        if not key: return items

ADJ = ['Silent', 'Hollow', 'Crimson', 'Last', 'Midnight', 'Forgotten', 'Paper', 'Iron', 'Glass', 'Wandering',
       'Quiet', 'Burning', 'Salt', 'Winter', 'Hidden', 'Borrowed', 'Broken', 'Golden', 'Distant', 'Restless']
NOUN = ['Lighthouse', 'Letter', 'Garden', 'Train', 'Mirror', 'Harbor', 'Clock', 'Orchard', 'Signal', 'Door',
        'Lantern', 'Bridge', 'Island', 'Key', 'River', 'Station', 'Crown', 'Season', 'Promise', 'Echo']
FIRST = ['Ada', 'Bram', 'Cora', 'Dev', 'Elio', 'Fern', 'Gus', 'Hana', 'Ivo', 'Juno', 'Kai', 'Lena', 'Milo', 'Nell', 'Oren']
LAST = ['Ashby', 'Brook', 'Calder', 'Dunn', 'Ellery', 'Frost', 'Greer', 'Hale', 'Ives', 'Joss', 'Kerr', 'Lowe', 'Marsh', 'Nash']

def tag_row(stamp, tid, name, primary, tag_type=None, order=None):
    row = {'__typename': s('Tag'), 'id': s(tid), 'name': s(name), 'nameLower': s(name.lower()), 'searchPk': s('REGULAR'),
           'primaryFlag': s('true' if primary else 'false'), 'isPrimary': b(primary), 'isErotic': b(False),
           'isPremiumGenre': b(False), 'storyCount': n(0), 'color': s('#00ffff'), 'createdAt': s(stamp), 'updatedAt': s(stamp)}
    if tag_type: row['tagType'] = s(tag_type)
    if order is not None: row['sortOrder'] = n(order); row['pickerEnabled'] = b(True)
    return row

def build(story_count):
    k = story_count / 3000.0                      # every count scales with the number of stories
    scaled = lambda base: max(5, int(base * k))
    real_tags = scan_all(table('Tag', ENV))
    real_genres = [t for t in real_tags if t.get('isPrimary', {}).get('BOOL') and not t.get('isErotic', {}).get('BOOL')
                   and t.get('tagType', {}).get('S') in (None, '', 'genre')]
    real_moods = [t for t in real_tags if t.get('tagType', {}).get('S') == 'mood']
    real_tones = [t for t in real_tags if t.get('tagType', {}).get('S') == 'tone']
    if len(real_genres) < 2 or not real_moods: sys.exit(f'need at least 2 genre tags and 1 mood tag in dev (found {len(real_genres)} / {len(real_moods)})')
    # Borrow a real cover and audio file so the stories open and play like real ones.
    real = [x for x in scan_all(table('Story', ENV), filter_expression='live = :t AND attribute_exists(audioUri) AND NOT begins_with(id, :p)',
            expression_attribute_values='{":t":{"S":"true"},":p":{"S":"scale-"}}') if 'audioUri' in x][:1]
    if not real: sys.exit('need at least one real live dev story with an audio file to borrow its audio and cover')
    audio, image = real[0]['audioUri']['S'], real[0].get('imageUri', {}).get('S')
    now = datetime.now(timezone.utc)
    stamp = now.strftime('%Y-%m-%dT%H:%M:%S.000Z')

    # ── tags ────────────────────────────────────────────────────────────────
    def make(kind, count, primary=False, tag_type=None, ordered=False):
        return [tag_row(stamp, f'scale-t-{kind}-{i}', f'ScaleTest {kind} {random.choice(ADJ)} {random.choice(NOUN)} {i}', primary, tag_type,
                        100 + i if ordered else None) for i in range(count)]
    syn_genres = make('genre', scaled(30), primary=True)   # genres stay broad: never more than ~40 in real life
    syn_other = make('other', scaled(1500))
    syn_settings = make('setting', scaled(300), tag_type='setting')
    syn_moods = make('mood', scaled(60), tag_type='mood', ordered=True)
    syn_tones = make('tone', scaled(40), tag_type='tone')
    tags = syn_genres + syn_other + syn_settings + syn_moods + syn_tones
    ids = lambda rows: [r['id']['S'] for r in rows]
    genre_pool = [t['id']['S'] for t in real_genres] + ids(syn_genres)
    mood_pool = [t['id']['S'] for t in real_moods] + ids(syn_moods)
    tone_pool = [t['id']['S'] for t in real_tones] + ids(syn_tones)
    other_pool, setting_pool = ids(syn_other), ids(syn_settings)

    # ── authors and universes ───────────────────────────────────────────────
    author_count = max(50, story_count // 10)
    authors = []
    for i in range(author_count):
        name = f'{random.choice(FIRST)} {random.choice(LAST)} {i}'
        authors.append({'__typename': s('Author'), 'id': s(f'scale-a-{i}'), 'name': s(name), 'nameLower': s(name.lower()), 'searchPk': s('ALL'),
                        'publisherId': s(PUBLISHER_ID), 'bio': s('Synthetic author for the scale test.'), 'createdAt': s(stamp), 'updatedAt': s(stamp)})
    universe_count = scaled(300)
    universes = []
    for i in range(universe_count):
        name = f'ScaleTest Universe {random.choice(ADJ)} {random.choice(NOUN)} {i}'
        universes.append({'__typename': s('Universe'), 'id': s(f'scale-u-{i}'), 'name': s(name), 'nameLower': s(name.lower()), 'searchPk': s('ALL'),
                          'createdAt': s(stamp), 'updatedAt': s(stamp)})

    # ── stories and links ───────────────────────────────────────────────────
    stories, links = [], []
    for i in range(story_count):
        g1, g2 = random.sample(genre_pool, 2)
        title = f'{random.choice(ADJ)} {random.choice(NOUN)} {i}'
        minutes = random.choice([3, 5, 8, 10, 12, 15, 18, 22, 25, 30, 35, 45, 60, 75, 90]) + random.randint(0, 2)
        pub = now - timedelta(days=random.randint(0, 400), minutes=random.randint(0, 1439))
        story = {'__typename': s('Story'), 'id': s(f'scale-s-{i}'), 'title': s(f'ScaleTest {title}'), 'titleLower': s(f'scaletest {title}'.lower()),
                 'summary': s('A synthetic story used to test how the app behaves with a large catalog.'),
                 'description': s('Synthetic story for the scale test. Safe to delete.'),
                 'audioUri': s(audio), 'duration': n(minutes * 60), 'numListens': n(int(random.paretovariate(1.2) * 3)),
                 'live': s('true'), 'isErotic': s('false'), 'nsfw': s('false'),
                 'publishedAt': s(pub.strftime('%Y-%m-%dT%H:%M:%S.000Z')), 'publishedYear': n(pub.year),
                 'authorId': s(f'scale-a-{random.randrange(author_count)}'), 'publisherId': s(PUBLISHER_ID),
                 'primaryTagId': s(g1), 'secondaryTagId': s(g2), 'storyFormat': s('SHORT_STORY'),
                 'avgRating': {'N': str(round(random.uniform(3.2, 4.9), 2))}, 'numRatings': n(random.randint(0, 40)),
                 'createdAt': s(stamp), 'updatedAt': s(stamp)}
        if random.random() < 0.2: story['universeId'] = s(f'scale-u-{random.randrange(universe_count)}')
        if image: story['imageUri'] = s(image)
        stories.append(story)
        tag_ids = [g1, g2] + random.sample(other_pool, min(len(other_pool), random.randint(1, 3)))
        if random.random() < 0.5 and setting_pool: tag_ids.append(random.choice(setting_pool))
        if tone_pool: tag_ids.append(random.choice(tone_pool))
        tag_ids += random.sample(mood_pool, min(len(mood_pool), random.choice([1, 2])))
        for j, tid in enumerate(dict.fromkeys(tag_ids)):
            links.append({'__typename': s('StoryTag'), 'id': s(f'scale-l-{i}-{j}'), 'storyId': s(f'scale-s-{i}'), 'tagId': s(tid),
                          'createdAt': s(stamp), 'updatedAt': s(stamp)})
    return {'Tag': tags, 'Universe': universes, 'Author': authors, 'Story': stories, 'StoryTag': links}

def pin_rows(sub, username, count):
    now = datetime.now(timezone.utc)
    stamp = now.strftime('%Y-%m-%dT%H:%M:%S.000Z')
    ids = list(range(3000)); random.shuffle(ids)
    rows = []
    for k, i in enumerate(ids[:count]):
        rows.append({'__typename': s('UserPinnedStory'), 'id': s(f'scale-p-{k}'), 'userId': s(sub), 'storyId': s(f'scale-s-{i}'),
                     'pinnedAt': s((now - timedelta(minutes=count - k)).strftime('%Y-%m-%dT%H:%M:%S.000Z')), 'sortOrder': n(k),
                     'owner': s(f'{sub}::{username}'), 'createdAt': s(stamp), 'updatedAt': s(stamp)})
    return rows

def demote_genres():
    name = table('Tag', ENV)
    # Only the ones still marked primary, so a re-run after an interruption picks up where it stopped.
    rows = scan_all(name, filter_expression='begins_with(id, :p) AND primaryFlag = :t',
                    expression_attribute_values='{":p":{"S":"scale-t-genre-"},":t":{"S":"true"}}')
    print(f'turning {len(rows)} seeded genre tags into regular tags...', flush=True)
    for k, r in enumerate(rows):
        for attempt in range(4):
            try:
                aws('update-item', '--table-name', name, '--key', json.dumps({'id': r['id']}), '--update-expression', 'SET isPrimary = :f, primaryFlag = :pf',
                    '--expression-attribute-values', json.dumps({':f': {'BOOL': False}, ':pf': {'S': 'false'}}))
                break
            except subprocess.CalledProcessError:
                if attempt == 3: raise
                time.sleep(2 * (attempt + 1))
        if (k + 1) % 50 == 0: print(f'  {k + 1}', flush=True)
    print('done. Re-open Discover: the genre list should be back to the real genres.')

def delete_rows(model):
    name = table(model, ENV)
    rows = scan_all(name, filter_expression='begins_with(id, :p)', expression_attribute_values='{":p":{"S":"scale-"}}')
    print(f'removing {len(rows)} {model} rows...', flush=True)
    for i in range(0, len(rows), 25):
        req = {name: [{'DeleteRequest': {'Key': {'id': r['id']}}} for r in rows[i:i + 25]]}
        while req:
            with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f: json.dump(req, f)
            r = aws('batch-write-item', '--request-items', 'file://' + f.name); os.unlink(f.name)
            req = r.get('UnprocessedItems') or None
            if req: time.sleep(1)

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    num = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 3000
    if cmd == 'plan':
        data = build(num)
        print(f'would write to {ENV}: ' + ', '.join(f'{len(v)} {k}' for k, v in data.items()) + '. Nothing written.')
    elif cmd == 'apply':
        data = build(num)
        for model in ('Tag', 'Universe', 'Author', 'Story', 'StoryTag'):   # tags first, links last
            print(f'writing {len(data[model])} {model} rows...', flush=True)
            batch_write(table(model, ENV), data[model])
        print('done. Give the sync Lambdas a few minutes, then check tag counts and a tag page in the dev app.')
    elif cmd == 'pins':
        sub, username = sys.argv[2], sys.argv[3]
        count = int(sys.argv[4]) if len(sys.argv) > 4 else 600
        rows = pin_rows(sub, username, count)
        print(f'writing {len(rows)} UserPinnedStory rows for {sub}...', flush=True)
        batch_write(table('UserPinnedStory', ENV), rows)
        print('done. Open Playlist in the dev app and scroll.')
    elif cmd == 'demote-genres': demote_genres()
    elif cmd == 'remove':
        for model in ('UserPinnedStory', 'StoryTag', 'Story', 'Universe', 'Author'): delete_rows(model)
        print('done. Wait about 5 minutes so the count function lowers the tag counts, then run: python3 scripts/seedScale.py remove-tags')
    elif cmd == 'remove-tags': delete_rows('Tag'); print('done.')
    else: sys.exit(__doc__)
