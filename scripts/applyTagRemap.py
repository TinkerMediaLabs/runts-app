#!/usr/bin/env python3
"""
Applies the reworked tag taxonomy (scripts/tagRemap.csv) to one environment. Dry run by default; nothing is written
without --apply.

  SUFFIX=nzvkuznrzjfc5kud3vfik5j7ey-NONE python3 scripts/applyTagRemap.py
  SUFFIX=nzvkuznrzjfc5kud3vfik5j7ey-NONE python3 scripts/applyTagRemap.py --apply

For the stories in the CSV, each story's full tag set becomes: genre (primary), secondary, setting, mood, up to two
tones, themes, Literary Classic, Adapted for Screen (if marked) and its world (an existing universe tag). Steps:
  1. Renames existing tags in place (RENAMES), so ids, colors and images survive.
  2. Creates tags that are still missing (settings, moods, tones, plain tags).
  3. Fixes isPrimary / primaryFlag on plain tags (only the PRIMARY genres are primary).
  4. Creates missing StoryTag links first, then deletes links to tags the story no longer has.
  5. Sets Story.primaryTagId / secondaryTagId.
tag-index-sync and the tag-count aggregator keep the live-tag index fields and storyCount current, as for any link.
Tags no story uses afterwards are listed at the end: delete them in the CMS. Run backupTables.py first. Safe to re-run.
"""
import csv, json, os, subprocess, sys, uuid
from collections import defaultdict
from datetime import datetime, timezone

REGION = os.environ.get('AWS_REGION', 'us-east-2')
SUFFIX = os.environ.get('SUFFIX')
APPLY = '--apply' in sys.argv
if not SUFFIX:
    print('Set SUFFIX (the table suffix of the environment).'); sys.exit(1)
TAG, STORY, LINK = f'Tag-{SUFFIX}', f'Story-{SUFFIX}', f'StoryTag-{SUFFIX}'
CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tagRemap.csv')
NOW = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')

PRIMARY = {'Science Fiction', 'Adventure', 'Horror', 'Mystery', 'Comedy', 'Fantasy', 'Drama'}

# (type, old name) -> new name. type '' = a plain (untyped) tag. Only applied when the old tag exists and the new name does not.
RENAMES = {
    ('', 'Classic'): 'Literary Classic',
    ('', 'Paper To Film'): 'Adapted for Screen',
    ('', 'Crime'): 'Crime & Detective',
    ('', 'Feminism'): "Women's Voices",
    ('', 'Psychological Horror'): 'Psychological',
    ('', 'Nostalgia'): 'Nostalgic',
    ('setting', 'Sea Story'): 'Wilderness & Sea',
    ('setting', 'Underground City'): 'Hidden Worlds',
    ('mood', 'Uneasy & Suspensful'): 'Tense & Gripping',
    ('mood', 'Dark and scary'): 'Dark & Scary',
    ('mood', 'Light and whimsical'): 'Light & Whimsical',
    ('mood', 'Inspiring and uplifting'): 'Warm & Uplifting',
    ('mood', 'Somber & Foreboding'): 'Bittersweet',
    ('tone', 'Ironic'): 'Wry',
    ('tone', 'Whimsical'): 'Playful',
    ('tone', 'Dark'): 'Grim',
    ('tone', 'Melancholic'): 'Wistful',
    ('tone', 'Hopeful'): 'Tender',
}


def aws(*args):
    r = subprocess.run(['aws', '--region', REGION, *args], capture_output=True, text=True)
    if r.returncode != 0:
        print('AWS ERROR:', r.stderr.strip()); sys.exit(1)
    return r.stdout


def scan(table):
    return json.loads(aws('dynamodb', 'scan', '--table-name', table, '--output', 'json')).get('Items', [])


def s(item, key):
    return item.get(key, {}).get('S')


def ttype(item):
    return s(item, 'tagType') or ''


def is_erotic(item):
    return item.get('isErotic', {}).get('BOOL', False)


def s_id(item):
    return item.get('id', {}).get('S')


def key_of(kind, name):
    return (kind, name.strip().lower())


# ── Read ────────────────────────────────────────────────────────────────────
rows = list(csv.DictReader(open(CSV_PATH, encoding='utf-8')))
tags = scan(TAG)
stories = {s(x, 'id'): x for x in scan(STORY)}
links = scan(LINK)
print(f'{TAG}: {len(tags)} tag(s); {STORY}: {len(stories)}; {LINK}: {len(links)}; CSV: {len(rows)} stories')

by_key = {}                                   # (type, nameLower) -> tag item (regular tags only)
for t in tags:
    if is_erotic(t) or not s(t, 'nameLower'):
        continue
    k = (ttype(t), s(t, 'nameLower'))
    if k in by_key:
        print(f'WARNING: two tags named "{s(t, "name")}" (type "{k[0] or "plain"}"): {s(by_key[k], "id")} and {s(t, "id")}. Merge them first (mergeTagLinks.py).')
        continue
    by_key[k] = t
name_by_id = {s(t, 'id'): s(t, 'name') for t in tags}
type_by_id = {s(t, 'id'): ttype(t) for t in tags}

# ── Desired tags per story ──────────────────────────────────────────────────
def desired_keys(r):
    out = [('', r['primary']), ('', r['secondary']), ('', 'Literary Classic')]
    if r['setting']: out.append(('setting', r['setting']))
    out.append(('mood', r['mood']))
    for c in ('tone 1', 'tone 2'):
        if r[c]: out.append(('tone', r[c]))
    for th in r['themes'].split('|'):
        if th.strip(): out.append(('', th.strip()))
    if r['adapted for screen'].strip().lower() == 'yes': out.append(('', 'Adapted for Screen'))
    if r['world']: out.append(('universe', r['world']))
    seen, res = set(), []
    for kind, name in out:
        k = key_of(kind, name)
        if k not in seen:
            seen.add(k); res.append((kind, name.strip()))
    return res

wanted = {}                                   # key -> display name (the spelling from the CSV)
for r in rows:
    for kind, name in desired_keys(r):
        wanted.setdefault(key_of(kind, name), name)

# ── 1. Renames ──────────────────────────────────────────────────────────────
renames = []
for (kind, old), new in RENAMES.items():
    ok, nk = key_of(kind, old), key_of(kind, new)
    if ok in by_key and nk not in by_key:
        renames.append((by_key[ok], new)); by_key[nk] = by_key.pop(ok); name_by_id[s_id(by_key[nk])] = new
    elif ok in by_key and nk in by_key:
        print(f'note: "{old}" and "{new}" both exist ({kind or "plain"}); links move to "{new}" and "{old}" is retired.')
print(f'\n{len(renames)} rename(s):')
for t, new in renames:
    print(f'  {ttype(t) or "plain":8} "{s(t, "name")}" -> "{new}"')

# A world with no universe-typed tag: use a plain tag of that name if there is one (so its links are kept, not deleted).
for k, name in wanted.items():
    if k[0] == 'universe' and k not in by_key:
        if ('', k[1]) in by_key:
            by_key[k] = by_key[('', k[1])]
            print(f'note: world "{name}" is a plain tag here, not a universe tag; its links are kept as they are.')
        else:
            near = [f'{ttype(t) or "plain"}:{s(t, "name")}' + (' (erotic)' if is_erotic(t) else '') for t in tags
                    if k[1].replace('-', '')[:4] in (s(t, 'nameLower') or '').replace('-', '')]
            print(f'WARNING: world "{name}" has no universe tag and no plain tag of that name. Similar tags: {near or "none"}')

# ── 2. Creates ──────────────────────────────────────────────────────────────
moods = [t for k, t in by_key.items() if k[0] == 'mood']
next_order = max([int(t.get('sortOrder', {}).get('N', 0)) for t in moods] + [0]) + 1
creates = []
for k, name in wanted.items():
    if k in by_key:
        continue
    if k[0] == 'universe':
        print(f'WARNING: world "{name}" has no universe tag; skipped.'); continue
    item = {'__typename': {'S': 'Tag'}, 'id': {'S': str(uuid.uuid4())}, 'name': {'S': name}, 'nameLower': {'S': name.lower()},
            'searchPk': {'S': 'REGULAR'}, 'isErotic': {'BOOL': False}, 'color': {'S': '#00ffff'},
            'createdAt': {'S': NOW}, 'updatedAt': {'S': NOW}}
    if k[0]:
        item['tagType'] = {'S': k[0]}
    is_primary = k[0] == '' and name in PRIMARY
    item['isPrimary'] = {'BOOL': is_primary}
    item['primaryFlag'] = {'S': 'true' if is_primary else 'false'}
    if k[0] == 'mood':
        item['sortOrder'] = {'N': str(next_order)}; item['pickerEnabled'] = {'BOOL': True}; next_order += 1
    creates.append(item); by_key[k] = item
    name_by_id[s(item, 'id')] = name; type_by_id[s(item, 'id')] = k[0]
print(f'\n{len(creates)} tag(s) to create:')
for t in creates:
    print(f'  {ttype(t) or "plain":8} "{s(t, "name")}"')

# ── 3. isPrimary fixes on plain tags ────────────────────────────────────────
flag_fixes = []
for k, name in wanted.items():
    if k[0] != '' or k not in by_key or by_key[k] in creates:
        continue
    t = by_key[k]
    want = name in PRIMARY
    if t.get('isPrimary', {}).get('BOOL', False) != want or s(t, 'primaryFlag') != ('true' if want else 'false'):
        flag_fixes.append((t, want))
print(f'\n{len(flag_fixes)} primary-flag fix(es):')
for t, want in flag_fixes:
    print(f'  "{s(t, "name")}": primary -> {want}')

# ── 4/5. Links and story fields ─────────────────────────────────────────────
cur = defaultdict(list)                       # storyId -> [(linkId, tagId)]
for l in links:
    cur[s(l, 'storyId')].append((s(l, 'id'), s(l, 'tagId')))
id_for = {k: s(t, 'id') for k, t in by_key.items()}
add, delete, story_updates, used_ids = [], [], [], set()
for r in rows:
    sid = r['story id']
    if sid not in stories:
        print(f'WARNING: story {sid} ({r["title"]}) is not in {STORY}; skipped.'); continue
    want_ids = {id_for[key_of(*dk)] for dk in desired_keys(r) if key_of(*dk) in id_for}
    used_ids |= want_ids
    have, extra = set(), []
    for lid, tid in cur.get(sid, []):
        if tid in want_ids and tid not in have:
            have.add(tid)
        else:
            extra.append((lid, tid))
    to_add = want_ids - have
    for tid in sorted(to_add, key=lambda x: name_by_id.get(x, '')):
        add.append((sid, tid))
    for lid, tid in extra:
        delete.append((lid, sid, tid))
    p, sec = id_for[key_of('', r['primary'])], id_for[key_of('', r['secondary'])]
    st = stories[sid]
    if s(st, 'primaryTagId') != p or s(st, 'secondaryTagId') != sec:
        story_updates.append((sid, r['title'], p, sec))
    print(f'  {r["title"]}: +{len(to_add)} link(s), -{len(extra)} link(s)')
print(f'\nTotals: {len(add)} link(s) to add, {len(delete)} to delete, {len(story_updates)} story primary/secondary change(s).')
for sid, title, p, sec in story_updates:
    print(f'  {title}: primary "{name_by_id[p]}", secondary "{name_by_id[sec]}"')

# Retired = regular tags no story will use afterwards (with or without links today). Check who still points at them.
retired = {}
csv_ids = {r['story id'] for r in rows}
used_elsewhere = {s(l, 'tagId') for l in links if s(l, 'storyId') not in csv_ids}   # stories this CSV does not cover
if used_elsewhere:
    print(f'\nnote: {len(stories) - len(csv_ids & set(stories))} story(ies) are not in the CSV and keep their tags; tags they use are not listed below.')
for t in tags:
    tid = s_id(t)
    if not is_erotic(t) and s(t, 'nameLower') and tid not in used_ids and tid not in used_elsewhere:
        retired[tid] = name_by_id[tid]
followers = defaultdict(int)
for f in scan(f'UserFollowedTag-{SUFFIX}'):
    followers[s(f, 'tagId')] += 1
sections = [json.dumps(x) for x in scan(f'HomeSection-{SUFFIX}')]
print(f'\n{len(retired)} tag(s) no story will use (delete them in the CMS afterwards):')
for tid, name in sorted(retired.items(), key=lambda x: (type_by_id[x[0]], x[1].lower())):
    notes = []
    if followers.get(tid): notes.append(f'FOLLOWED by {followers[tid]} user(s)')
    if any(tid in sec for sec in sections): notes.append('used by a HOME SECTION')
    print(f'  {type_by_id[tid] or "plain":8} "{name}"  ({tid})' + (f'  <-- {", ".join(notes)}' if notes else ''))

if not APPLY:
    print('\nDry run only. Add --apply to write.'); sys.exit(0)

# ── Write ───────────────────────────────────────────────────────────────────
print('\nApplying...')
for t, new in renames:
    aws('dynamodb', 'update-item', '--table-name', TAG, '--key', json.dumps({'id': t['id']}),
        '--update-expression', 'SET #n = :n, nameLower = :l, updatedAt = :u',
        '--expression-attribute-names', json.dumps({'#n': 'name'}),
        '--expression-attribute-values', json.dumps({':n': {'S': new}, ':l': {'S': new.lower()}, ':u': {'S': NOW}}))
for item in creates:
    aws('dynamodb', 'put-item', '--table-name', TAG, '--item', json.dumps(item), '--condition-expression', 'attribute_not_exists(id)')
for t, want in flag_fixes:
    aws('dynamodb', 'update-item', '--table-name', TAG, '--key', json.dumps({'id': t['id']}),
        '--update-expression', 'SET isPrimary = :b, primaryFlag = :f, updatedAt = :u',
        '--expression-attribute-values', json.dumps({':b': {'BOOL': want}, ':f': {'S': 'true' if want else 'false'}, ':u': {'S': NOW}}))
for sid, tid in add:
    item = {'id': {'S': str(uuid.uuid4())}, 'storyId': {'S': sid}, 'tagId': {'S': tid},
            'createdAt': {'S': NOW}, 'updatedAt': {'S': NOW}, '__typename': {'S': 'StoryTag'}}
    aws('dynamodb', 'put-item', '--table-name', LINK, '--item', json.dumps(item), '--condition-expression', 'attribute_not_exists(id)')
for sid, title, p, sec in story_updates:
    aws('dynamodb', 'update-item', '--table-name', STORY, '--key', json.dumps({'id': {'S': sid}}),
        '--update-expression', 'SET primaryTagId = :p, secondaryTagId = :s, updatedAt = :u',
        '--expression-attribute-values', json.dumps({':p': {'S': p}, ':s': {'S': sec}, ':u': {'S': NOW}}))
for lid, sid, tid in delete:
    aws('dynamodb', 'delete-item', '--table-name', LINK, '--key', json.dumps({'id': {'S': lid}}))
print('Done. Delete the retired tags in the CMS, then check Tags and Stories.')
