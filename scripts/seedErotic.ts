// ---------------------------------------------------------------------------
// Erotic Content Seeder
// Run from project root: npx ts-node --esm scripts/seedErotic.ts
// Requires amplify_outputs.json to be present (dev sandbox)
// ---------------------------------------------------------------------------

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';
import outputs from '../amplify_outputs.json' with { type: 'json' };
import { signIn } from 'aws-amplify/auth';


Amplify.configure(outputs);
const client = generateClient<Schema>();

// ---------------------------------------------------------------------------
// IDs
// ---------------------------------------------------------------------------

const PUBLISHER_ID = '05f92ae8-0000-0000-0000-000000000001'; // reuse existing publisher

const TAG_IDS = {
    romance:           'etag0001-0000-0000-0000-000000000001',
    darkRomance:       'etag0001-0000-0000-0000-000000000002',
    fantasyErotica:    'etag0001-0000-0000-0000-000000000003',
    paranormalRomance: 'etag0001-0000-0000-0000-000000000004',
    contemporary:      'etag0001-0000-0000-0000-000000000005',
};

const AUTHOR_IDS = {
    scarletVale:      'eauth001-0000-0000-0000-000000000001',
    dkAshford:        'eauth001-0000-0000-0000-000000000002',
    lyraMoonwhisper:  'eauth001-0000-0000-0000-000000000003',
    marcusThorne:     'eauth001-0000-0000-0000-000000000004',
};

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

const EROTIC_TAGS = [
    {
        id:          TAG_IDS.romance,
        name:        'Romance',
        isErotic:    true,
        isPrimary:   true,
        color:       '#ff7c2a',
        icon:        'heart',
        imageUri:    'stories/covers/tag-romance.jpg',
        tileImageUri: 'stories/covers/tag-romance.jpg',
    },
    {
        id:          TAG_IDS.darkRomance,
        name:        'Dark Romance',
        isErotic:    true,
        isPrimary:   true,
        color:       '#8b1a1a',
        icon:        'fire',
        imageUri:    'stories/covers/tag-dark-romance.jpg',
        tileImageUri: 'stories/covers/tag-dark-romance.jpg',
    },
    {
        id:          TAG_IDS.fantasyErotica,
        name:        'Fantasy Erotica',
        isErotic:    true,
        isPrimary:   true,
        color:       '#c45c2a',
        icon:        'hat-wizard',
        imageUri:    'stories/covers/tag-fantasy-erotica.jpg',
        tileImageUri: 'stories/covers/tag-fantasy-erotica.jpg',
    },
    {
        id:          TAG_IDS.paranormalRomance,
        name:        'Paranormal Romance',
        isErotic:    true,
        isPrimary:   true,
        color:       '#7c2a5c',
        icon:        'moon',
        imageUri:    'stories/covers/tag-paranormal-romance.jpg',
        tileImageUri: 'stories/covers/tag-paranormal-romance.jpg',
    },
    {
        id:          TAG_IDS.contemporary,
        name:        'Contemporary',
        isErotic:    true,
        isPrimary:   true,
        color:       '#ff9944',
        icon:        'city',
        imageUri:    'stories/covers/tag-contemporary.jpg',
        tileImageUri: 'stories/covers/tag-contemporary.jpg',
    },
];

// ---------------------------------------------------------------------------
// Authors
// ---------------------------------------------------------------------------

const EROTIC_AUTHORS = [
    {
        id:           AUTHOR_IDS.scarletVale,
        name:         'Scarlet Vale',
        bio:          'Scarlet Vale writes slow-burn romance with scorching payoffs. Her stories explore desire, vulnerability, and the complicated hearts of people who want more than they dare ask for.',
        publisherId:  PUBLISHER_ID,
        primaryGenres: [TAG_IDS.romance, TAG_IDS.contemporary],
        profilePicUri: 'authors/scarlet-vale.jpg',
    },
    {
        id:           AUTHOR_IDS.dkAshford,
        name:         'D.K. Ashford',
        bio:          'D.K. Ashford specialises in dark romance — morally grey characters, power dynamics, and the intoxicating tension between danger and desire. Not for the faint of heart.',
        publisherId:  PUBLISHER_ID,
        primaryGenres: [TAG_IDS.darkRomance, TAG_IDS.paranormalRomance],
        profilePicUri: 'authors/dk-ashford.jpg',
    },
    {
        id:           AUTHOR_IDS.lyraMoonwhisper,
        name:         'Lyra Moonwhisper',
        bio:          'Lyra Moonwhisper builds worlds where desire is magic and magic is desire. Her fantasy erotica blends lush world-building with characters whose longing reshapes reality itself.',
        publisherId:  PUBLISHER_ID,
        primaryGenres: [TAG_IDS.fantasyErotica, TAG_IDS.paranormalRomance],
        profilePicUri: 'authors/lyra-moonwhisper.jpg',
    },
    {
        id:           AUTHOR_IDS.marcusThorne,
        name:         'Marcus Thorne',
        bio:          'Marcus Thorne writes unflinching contemporary stories about real desire — messy, urgent, and deeply human. His work never flinches from complexity or consequence.',
        publisherId:  PUBLISHER_ID,
        primaryGenres: [TAG_IDS.contemporary, TAG_IDS.darkRomance],
        profilePicUri: 'authors/marcus-thorne.jpg',
    },
];

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

const EROTIC_STORIES = [
    {
        id:           'e1000000-0000-0000-0000-000000000001',
        title:        'The Midnight Bargain',
        summary:      'A disgraced heiress strikes a dangerous deal with the ruthless CEO who ruined her family — and finds herself wanting far more than revenge.',
        description:  'When Celeste Harrow walks into Damian Voss\'s boardroom with nothing left to lose, she expects a fight. She doesn\'t expect the electricity between them, or the counter-offer that will change everything.',
        audioUri:     'stories/audio/the-hollow-year.mp3',
        imageUri:     'stories/covers/the-midnight-bargain.jpg',
        duration:     1380,
        primaryTagId: TAG_IDS.darkRomance,
        authorId:     AUTHOR_IDS.dkAshford,
        publisherId:  PUBLISHER_ID,
        isErotic:     'true',
        live:         'true',
        nsfw:         'true',
        numListens:   0,
        publishedAt:  new Date('2026-06-01').toISOString(),
    },
    {
        id:           'e1000000-0000-0000-0000-000000000002',
        title:        'Embers at Dawn',
        summary:      'Two rival chefs competing for the same Michelin star discover their most dangerous ingredient is each other.',
        description:  'Nadia and Ren have been circling each other across professional kitchens for three years. When a shared prep kitchen and a snowstorm leave them alone together overnight, the competition transforms into something neither can walk away from.',
        audioUri:     'stories/audio/the-hollow-year.mp3',
        imageUri:     'stories/covers/embers-at-dawn.jpg',
        duration:     1260,
        primaryTagId: TAG_IDS.romance,
        authorId:     AUTHOR_IDS.scarletVale,
        publisherId:  PUBLISHER_ID,
        isErotic:     'true',
        live:         'true',
        nsfw:         'true',
        numListens:   0,
        publishedAt:  new Date('2026-06-01').toISOString(),
    },
    {
        id:           'e1000000-0000-0000-0000-000000000003',
        title:        'Crimson Velvet',
        summary:      'A vampire lord who has not felt desire in three centuries meets the mortal artist commissioned to paint his portrait.',
        description:  'Lord Aldric Vael has outlived empires. He has not wanted anything in three hundred years. Then Mara Solano arrives with her canvases and her unguarded eyes, and everything he buried comes flooding back.',
        audioUri:     'stories/audio/the-hollow-year.mp3',
        imageUri:     'stories/covers/crimson-velvet.jpg',
        duration:     1500,
        primaryTagId: TAG_IDS.paranormalRomance,
        authorId:     AUTHOR_IDS.dkAshford,
        publisherId:  PUBLISHER_ID,
        isErotic:     'true',
        live:         'true',
        nsfw:         'true',
        numListens:   0,
        publishedAt:  new Date('2026-06-02').toISOString(),
    },
    {
        id:           'e1000000-0000-0000-0000-000000000004',
        title:        'The Glass Tower',
        summary:      'An ambitious executive and her newly assigned bodyguard are fighting the same battle on different sides of the line.',
        description:  'Sasha Morrow runs a billion-dollar firm with cold precision. Eli Carver is the ex-military bodyguard hired to keep her alive. In a glass tower above a city that wants her gone, proximity becomes the most dangerous threat of all.',
        audioUri:     'stories/audio/the-hollow-year.mp3',
        imageUri:     'stories/covers/the-glass-tower.jpg',
        duration:     1440,
        primaryTagId: TAG_IDS.contemporary,
        authorId:     AUTHOR_IDS.marcusThorne,
        publisherId:  PUBLISHER_ID,
        isErotic:     'true',
        live:         'true',
        nsfw:         'true',
        numListens:   0,
        publishedAt:  new Date('2026-06-02').toISOString(),
    },
    {
        id:           'e1000000-0000-0000-0000-000000000005',
        title:        'Moonlit Claiming',
        summary:      'An elven queen bound by ancient law must choose a consort before the winter solstice. She chooses the one man her court forbids.',
        description:  'Queen Elowen has three days to name a consort or forfeit her crown. The court expects her to choose a lord of pure blood. Instead, she calls the name of the half-human commander who has guarded her borders — and her heart — for seven years.',
        audioUri:     'stories/audio/the-hollow-year.mp3',
        imageUri:     'stories/covers/moonlit-claiming.jpg',
        duration:     1620,
        primaryTagId: TAG_IDS.fantasyErotica,
        authorId:     AUTHOR_IDS.lyraMoonwhisper,
        publisherId:  PUBLISHER_ID,
        isErotic:     'true',
        live:         'true',
        nsfw:         'true',
        numListens:   0,
        publishedAt:  new Date('2026-06-03').toISOString(),
    },
    {
        id:           'e1000000-0000-0000-0000-000000000006',
        title:        'Sweet Surrender',
        summary:      'A burned-out wedding planner trying to stay professional meets the best man who makes her forget every rule she has.',
        description:  'Priya has planned 200 weddings without catching feelings once. Then James Cole walks in — the groom\'s best friend, the wrong man at the wrong time — and three days before the ceremony, every plan she has falls apart.',
        audioUri:     'stories/audio/the-hollow-year.mp3',
        imageUri:     'stories/covers/sweet-surrender.jpg',
        duration:     1200,
        primaryTagId: TAG_IDS.romance,
        authorId:     AUTHOR_IDS.scarletVale,
        publisherId:  PUBLISHER_ID,
        isErotic:     'true',
        live:         'true',
        nsfw:         'true',
        numListens:   0,
        publishedAt:  new Date('2026-06-03').toISOString(),
    },
    {
        id:           'e1000000-0000-0000-0000-000000000007',
        title:        'Shadow Court',
        summary:      'A thief caught stealing from a fae lord\'s vault is offered a choice — face the ancient punishment, or become his captive companion for one moon cycle.',
        description:  'Lena has stolen from kings and escaped clean every time. The fae are supposed to be myths. Lord Caelum is very real, and his offer is not mercy — it is something far more dangerous than chains.',
        audioUri:     'stories/audio/the-hollow-year.mp3',
        imageUri:     'stories/covers/shadow-court.jpg',
        duration:     1560,
        primaryTagId: TAG_IDS.fantasyErotica,
        authorId:     AUTHOR_IDS.lyraMoonwhisper,
        publisherId:  PUBLISHER_ID,
        isErotic:     'true',
        live:         'true',
        nsfw:         'true',
        numListens:   0,
        publishedAt:  new Date('2026-06-04').toISOString(),
    },
    {
        id:           'e1000000-0000-0000-0000-000000000008',
        title:        'The Last Night',
        summary:      'Two strangers at an airport bar have one night before their lives take them to opposite ends of the earth.',
        description:  'Daniel\'s flight leaves at 6am for a contract he can\'t break. Zoe\'s train leaves at 7am for a life she\'s not sure she wants. Between midnight and departure, they decide to be honest about everything.',
        audioUri:     'stories/audio/the-hollow-year.mp3',
        imageUri:     'stories/covers/the-last-night.jpg',
        duration:     1320,
        primaryTagId: TAG_IDS.contemporary,
        authorId:     AUTHOR_IDS.marcusThorne,
        publisherId:  PUBLISHER_ID,
        isErotic:     'true',
        live:         'true',
        nsfw:         'true',
        numListens:   0,
        publishedAt:  new Date('2026-06-04').toISOString(),
    },
    {
        id:           'e1000000-0000-0000-0000-000000000009',
        title:        'Blood Oath',
        summary:      'A wolf shifter alpha has forty-eight hours to claim his fated mate before the blood moon passes and the bond breaks forever.',
        description:  'Kieran has known Isla was his the moment he scented her. She is human, skeptical, and has very good reasons not to trust men who say things like "you were made for me." He has two days to prove he means every word.',
        audioUri:     'stories/audio/the-hollow-year.mp3',
        imageUri:     'stories/covers/blood-oath.jpg',
        duration:     1680,
        primaryTagId: TAG_IDS.paranormalRomance,
        authorId:     AUTHOR_IDS.lyraMoonwhisper,
        publisherId:  PUBLISHER_ID,
        isErotic:     'true',
        live:         'true',
        nsfw:         'true',
        numListens:   0,
        publishedAt:  new Date('2026-06-05').toISOString(),
    },
    {
        id:           'e1000000-0000-0000-0000-000000000010',
        title:        'Velvet Chains',
        summary:      'A struggling sculptor receives an anonymous commission that will save her career — and an invitation she cannot refuse.',
        description:  'The commission is unsigned. The fee is impossible. The note says only: "Create something true, and I will give you everything you have been afraid to want." Vera agrees. She should not have agreed.',
        audioUri:     'stories/audio/the-hollow-year.mp3',
        imageUri:     'stories/covers/velvet-chains.jpg',
        duration:     1440,
        primaryTagId: TAG_IDS.darkRomance,
        authorId:     AUTHOR_IDS.dkAshford,
        publisherId:  PUBLISHER_ID,
        isErotic:     'true',
        live:         'true',
        nsfw:         'true',
        numListens:   0,
        publishedAt:  new Date('2026-06-05').toISOString(),
    },
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed() {

        console.log('🔥 Signing in...');
    await signIn({
        username: process.env.SEED_EMAIL!,
        password: process.env.SEED_PASSWORD!,
    });
    console.log('✓ Signed in\n');
    console.log('🔥 Seeding erotic content...\n');

    // ── Tags ────────────────────────────────────────────────────────────────
    console.log('Creating erotic tags...');
    for (const tag of EROTIC_TAGS) {
        try {
            await client.models.Tag.create(tag as any);
            console.log(`  ✓ Tag: ${tag.name}`);
        } catch (err: any) {
            if (err?.message?.includes('already exists') || err?.message?.includes('ConditionalCheckFailed')) {
                console.log(`  ↷ Tag already exists: ${tag.name}`);
            } else {
                console.error(`  ✗ Tag failed: ${tag.name}`, err?.message);
            }
        }
    }

    // ── Authors ─────────────────────────────────────────────────────────────
    console.log('\nCreating erotic authors...');
    for (const author of EROTIC_AUTHORS) {
        try {
            await client.models.Author.create(author as any);
            console.log(`  ✓ Author: ${author.name}`);
        } catch (err: any) {
            if (err?.message?.includes('already exists') || err?.message?.includes('ConditionalCheckFailed')) {
                console.log(`  ↷ Author already exists: ${author.name}`);
            } else {
                console.error(`  ✗ Author failed: ${author.name}`, err?.message);
            }
        }
    }

    // ── Stories ─────────────────────────────────────────────────────────────
    console.log('\nCreating erotic stories...');
    for (const story of EROTIC_STORIES) {
        try {
            await client.models.Story.create(story as any);
            console.log(`  ✓ Story: ${story.title}`);
        } catch (err: any) {
           const msg = err?.message ?? err?.errors?.[0]?.message ?? JSON.stringify(err);
    if (msg?.includes('already exists') || msg?.includes('ConditionalCheckFailed')) {
        console.log(`  ↷ Already exists: ${(tag as any).name ?? (story as any).title ?? ''}`);
    } else {
        console.error(`  ✗ Failed:`, msg);
    }
        }
    }

    console.log('\n✅ Erotic content seeded successfully.');
    console.log('\nNext steps:');
    console.log('  1. Generate cover images using the prompts in seedEroticImagePrompts.md');
    console.log('  2. Upload covers to S3: stories/covers/<slug>.jpg');
    console.log('  3. Add audio files to S3: stories/audio/<slug>.mp3');

    // After creating stories, add StoryTag records
console.log('\nCreating erotic story tags...');
for (const story of EROTIC_STORIES) {
    try {
        await client.models.StoryTag.create({
            storyId: story.id,
            tagId:   story.primaryTagId,
        } as any);
        console.log(`  ✓ StoryTag: ${story.title}`);
    } catch (err: any) {
        const msg = err?.message ?? err?.errors?.[0]?.message ?? '';
        if (msg.includes('already exists') || msg.includes('ConditionalCheckFailed')) {
            console.log(`  ↷ StoryTag already exists: ${story.title}`);
        } else {
            console.error(`  ✗ StoryTag failed: ${story.title}`, msg);
        }
    }
}
}

seed().catch(console.error);