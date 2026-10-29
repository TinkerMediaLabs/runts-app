// First-use tips. Each tip points at a named control (see useTipTarget) and shows once, the first time
// its screen is open and the control is on screen. Add a tip by adding an entry here and registering the
// control with useTipTarget(target). Order decides which shows first when several are eligible.

export type Tip = {
  id:      string;
  target:  string;            // name registered with useTipTarget
  routes:  string[];          // route names where the tip may show
  needs?:  string;            // optional context flag that must be true (e.g. 'playerExpanded')
  title:   string;
  body:    string;
  order:   number;
};

export const TIPS: Tip[] = [
  {
    id: 'search',
    target: 'search-bar',
    routes: ['HomeScreen'],
    title: 'Find your next story',
    body: 'Search by title, author or genre. Tap here any time.',
    order: 10,
  },
  {
    id: 'foryou-card',
    target: 'foryou-card',
    routes: ['HomeScreen'],
    title: 'Tap for the details',
    body: 'Tap the bottom of a card to open or close its story info. Tap the cover to open the story.',
    order: 12,
  },
  {
    id: 'foryou-pin',
    target: 'foryou-pin',
    routes: ['HomeScreen'],
    needs: 'foryouExpanded',
    title: 'Save it for later',
    body: 'The pin adds this story to your playlist so it plays in order with the rest.',
    order: 14,
  },
  {
    id: 'story-tile',
    target: 'story-tile',
    routes: ['PlaylistScreen'],
    title: 'Tap a story to expand it',
    body: 'Tap a story to see its summary, tags and play controls. Tap again to close it.',
    order: 45,
  },
  {
    id: 'pin',
    target: 'pin-button',
    routes: ['StoryScreen'],
    title: 'Pin it to your playlist',
    body: 'Pinned stories play one after another. Find them, and change their order, in Playlist.',
    order: 20,
  },
  {
    id: 'player-options',
    target: 'player-options',
    routes: ['HomeScreen', 'DiscoverScreen', 'PlaylistScreen', 'PremiumScreen', 'StoryScreen', 'TagHomeScreen', 'AuthorDetails'],
    needs: 'playerExpanded',
    title: 'More options',
    body: 'Every button on this screen is also here as a list, plus a way to close the player.',
    order: 30,
  },
  {
    id: 'player-actions',
    target: 'player-actions',
    routes: ['HomeScreen', 'DiscoverScreen', 'PlaylistScreen', 'PremiumScreen', 'StoryScreen', 'TagHomeScreen', 'AuthorDetails'],
    needs: 'playerExpanded',
    title: 'Speed, sleep timer and more',
    body: 'Story info, pin, playback speed, sleep timer, share and bookmark are all in this row.',
    order: 35,
  },
  {
    id: 'player-skip',
    target: 'player-skip',
    routes: ['HomeScreen', 'DiscoverScreen', 'PlaylistScreen', 'PremiumScreen', 'StoryScreen', 'TagHomeScreen', 'AuthorDetails'],
    needs: 'playerExpanded',
    title: 'Missed something?',
    body: 'Jump back or ahead 15 seconds. You can also drag the bar to move anywhere.',
    order: 40,
  },
  {
    id: 'reorder',
    target: 'reorder-button',
    routes: ['PlaylistScreen'],
    title: 'Change the order',
    body: 'Tap Reorder, then drag stories to set what plays next.',
    order: 50,
  },
];
