import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Local (per-phone) erotic content preferences.
// The PIN is NOT stored here any more: it lives on the account and is checked
// by the server (see lib/eroticPin.ts).
// ---------------------------------------------------------------------------

const KEYS = {
    enabled:    '@runts/erotic_enabled',
    inPlaylist: '@runts/erotic_in_playlist',
} as const;

// Keys used by the old on-device PIN. Removed on startup so no plain-text PIN is left on the phone.
const LEGACY_PIN_KEYS = ['@runts/erotic_pin_enabled', '@runts/erotic_pin'];

export async function purgeLegacyEroticPin(): Promise<void> {
    try {
        await AsyncStorage.multiRemove(LEGACY_PIN_KEYS);
    } catch {
        // Non-fatal
    }
}

export async function getEroticEnabled(): Promise<boolean> {
    try {
        return (await AsyncStorage.getItem(KEYS.enabled)) === 'true';
    } catch {
        return false;
    }
}

export async function saveEroticEnabled(value: boolean): Promise<void> {
    try {
        await AsyncStorage.setItem(KEYS.enabled, value ? 'true' : 'false');
    } catch {
        // Non-fatal
    }
}

export async function getEroticInPlaylist(): Promise<boolean> {
    try {
        return (await AsyncStorage.getItem(KEYS.inPlaylist)) === 'true';
    } catch {
        return false;
    }
}

export async function saveEroticInPlaylist(value: boolean): Promise<void> {
    try {
        await AsyncStorage.setItem(KEYS.inPlaylist, value ? 'true' : 'false');
    } catch {
        // Non-fatal
    }
}

// Called when erotic content is switched off. The account PIN is deliberately kept.
export async function clearAllEroticSettings(): Promise<void> {
    try {
        await AsyncStorage.multiRemove([KEYS.enabled, KEYS.inPlaylist]);
    } catch {
        // Non-fatal
    }
}

export type EroticSettings = {
    enabled:    boolean;
    inPlaylist: boolean;
};

export async function loadAllEroticSettings(): Promise<EroticSettings> {
    try {
        const results = await AsyncStorage.multiGet([KEYS.enabled, KEYS.inPlaylist]);
        const map = Object.fromEntries(results.map(([k, v]) => [k, v]));
        return {
            enabled:    map[KEYS.enabled]    === 'true',
            inPlaylist: map[KEYS.inPlaylist] === 'true',
        };
    } catch {
        return { enabled: false, inPlaylist: false };
    }
}
