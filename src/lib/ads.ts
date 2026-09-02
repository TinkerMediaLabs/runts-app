/**
 * ads.ts
 * Audio pre-roll ad stub — ready for audio ad network integration.
 *
 * When Runts reaches sufficient listener volume to qualify for an audio
 * ad network (AdsWizz, Triton Digital, etc.), implement showPreRoll()
 * to fetch a DAAST/VAST audio ad URL and play it via TrackPlayer
 * before queuing the story track.
 *
 * The PlayerContext integration is already wired:
 * - lastPlayedStoryIdRef tracks story ID changes
 * - isPremiumRef skips ads for premium users
 * - showPreRoll() is awaited before audioEngine.play()
 */

export const Ads = {
    init:        async (): Promise<void> => {},
    showPreRoll: async (): Promise<void> => {},
};