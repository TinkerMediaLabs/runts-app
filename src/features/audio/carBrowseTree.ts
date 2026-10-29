import type { BrowseCategory } from '@rntp/player';

// What the car screen (Android Auto, later CarPlay) shows. The library keeps this list on the phone and serves it
// even when the app is closed, so it must be rebuilt whenever the person, their plan or their lists change.
//
// Step 1 (this file): placeholders only, to prove the app appears in the car and that signing out clears it.
// Next steps replace the signed-in placeholder with Continue listening, My playlist and Discover.

export type CarTreeInput = { signedIn: boolean };

export function buildCarBrowseTree({ signedIn }: CarTreeInput): BrowseCategory[] {
  if (!signedIn) {
    // Never show one person's library to the next person in the car, and never leave a dead end.
    return [
      {
        mediaId: 'signed-out',
        title: 'Runts',
        items: [{ mediaId: 'signed-out-note', title: 'Open Runts on your phone to sign in' }],
      },
    ];
  }
  return [
    {
      mediaId: 'coming-soon',
      title: 'Runts',
      items: [{ mediaId: 'coming-soon-note', title: 'Your stories are coming to the car soon' }],
    },
  ];
}
