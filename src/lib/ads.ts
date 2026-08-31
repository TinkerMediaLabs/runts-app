/**
 * ads.ts
 * AdMob pre-roll audio interstitial wrapper.
 *
 * Usage:
 *   import { Ads } from '@/lib/ads';
 *   await Ads.init();              // call once in App.tsx bootstrap
 *   await Ads.showPreRoll();       // call before playing a new story
 */

import MobileAds, {
    InterstitialAd,
    AdEventType,
    TestIds,
} from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ---------------------------------------------------------------------------
// Ad unit IDs — test IDs in dev, real IDs in production
// ---------------------------------------------------------------------------

const IS_DEV = Constants.expoConfig?.extra?.APP_ENV !== 'production';

const AD_UNIT_ID = IS_DEV
    ? (Platform.OS === 'ios' ? TestIds.INTERSTITIAL : TestIds.INTERSTITIAL)
    : Platform.OS === 'ios'
        ? (Constants.expoConfig?.extra?.admobIosInterstitial ?? '')
        : (Constants.expoConfig?.extra?.admobAndroidInterstitial ?? '');

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let initialised  = false;
let interstitial: InterstitialAd | null = null;
let adLoaded     = false;

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

async function init(): Promise<void> {
    if (initialised || !AD_UNIT_ID) return;
    try {
        await MobileAds().initialize();
        initialised = true;
        loadAd();
    } catch (err) {
        console.warn('[Ads] init failed:', err);
    }
}

// ---------------------------------------------------------------------------
// Load next ad in background
// ---------------------------------------------------------------------------

function loadAd(): void {
    if (!initialised || !AD_UNIT_ID) return;
    try {
        interstitial = InterstitialAd.createForAdRequest(AD_UNIT_ID, {
            requestNonPersonalizedAdsOnly: false,
        });

        interstitial.addAdEventListener(AdEventType.LOADED, () => {
            adLoaded = true;
        });

        interstitial.addAdEventListener(AdEventType.ERROR, () => {
            adLoaded = false;
        });

        interstitial.load();
    } catch (err) {
        console.warn('[Ads] loadAd failed:', err);
    }
}

// ---------------------------------------------------------------------------
// Show pre-roll ad — resolves when ad closes (or immediately if unavailable)
// ---------------------------------------------------------------------------

function showPreRoll(): Promise<void> {
    return new Promise(resolve => {
        if (!initialised || !interstitial || !adLoaded) {
            // No ad ready — play story immediately
            resolve();
            return;
        }

        const unsubClose = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
            unsubClose();
            adLoaded = false;
            loadAd(); // preload next ad
            resolve();
        });

        const unsubError = interstitial.addAdEventListener(AdEventType.ERROR, () => {
            unsubError();
            adLoaded = false;
            loadAd();
            resolve(); // fail gracefully — play story anyway
        });

        try {
            interstitial.show();
        } catch {
            // Ad not ready yet — play story immediately
            adLoaded = false;
            loadAd();
            resolve();
        }
    });
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const Ads = {
    init,
    showPreRoll,
};