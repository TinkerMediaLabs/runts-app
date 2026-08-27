/**
 * purchases.ts
 * Typed wrapper around the RevenueCat react-native-purchases SDK.
 *
 * Usage:
 *   import { PurchasesService } from '@/lib/purchases';
 *   await PurchasesService.init();                    // call once on app start
 *   await PurchasesService.identify(userId);          // call after sign-in
 *   const isPremium = await PurchasesService.isPremium();
 *   const offerings = await PurchasesService.getOfferings();
 *   await PurchasesService.purchase(package);
 *   await PurchasesService.restorePurchases();
 *   await PurchasesService.reset();                   // call on sign-out
 */

import Purchases, {
    LOG_LEVEL,
    type PurchasesOffering,
    type PurchasesPackage,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const IOS_KEY     = Constants.expoConfig?.extra?.rcIosKey     ?? '';
const ANDROID_KEY = Constants.expoConfig?.extra?.rcAndroidKey ?? '';
const API_KEY     = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;

const ENTITLEMENT_ID = 'premium';

let initialised = false;

// ---------------------------------------------------------------------------
// Init + Identity
// ---------------------------------------------------------------------------

async function init(): Promise<void> {
    if (initialised || !API_KEY) return;
    try {
        if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        await Purchases.configure({ apiKey: API_KEY });
        initialised = true;
    } catch (err) {
        console.warn('[Purchases] init failed:', err);
    }
}

async function identify(userId: string): Promise<void> {
    if (!initialised) return;
    try {
        await Purchases.logIn(userId);
    } catch (err) {
        console.warn('[Purchases] identify failed:', err);
    }
}

async function reset(): Promise<void> {
    if (!initialised) return;
    try {
        await Purchases.logOut();
    } catch (err) {
        console.warn('[Purchases] reset failed:', err);
    }
}

// ---------------------------------------------------------------------------
// Entitlement check
// ---------------------------------------------------------------------------

async function isPremium(): Promise<boolean> {
    if (!initialised) return false;
    try {
        const info = await Purchases.getCustomerInfo();
        return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
    } catch {
        return false;
    }
}

// ---------------------------------------------------------------------------
// Offerings
// ---------------------------------------------------------------------------

async function getOfferings(): Promise<PurchasesOffering | null> {
    if (!initialised) return null;
    try {
        const offerings = await Purchases.getOfferings();
        return offerings.current ?? null;
    } catch (err) {
        console.warn('[Purchases] getOfferings failed:', err);
        return null;
    }
}

// ---------------------------------------------------------------------------
// Purchase
// ---------------------------------------------------------------------------

async function purchase(pkg: PurchasesPackage): Promise<boolean> {
    if (!initialised) return false;
    try {
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    } catch (err: any) {
        if (err?.userCancelled) return false;
        throw err;
    }
}

// ---------------------------------------------------------------------------
// Restore
// ---------------------------------------------------------------------------

async function restorePurchases(): Promise<boolean> {
    if (!initialised) return false;
    try {
        const info = await Purchases.restorePurchases();
        return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
    } catch (err) {
        console.warn('[Purchases] restorePurchases failed:', err);
        return false;
    }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const PurchasesService = {
    init,
    identify,
    reset,
    isPremium,
    getOfferings,
    purchase,
    restorePurchases,
};

export type { PurchasesOffering, PurchasesPackage };