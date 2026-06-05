import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

const KEYS = {
    enabled:    '@runts/erotic_enabled',
    pinEnabled: '@runts/erotic_pin_enabled',
    pin:        '@runts/erotic_pin',
    inPlaylist: '@runts/erotic_in_playlist',
} as const;

// ---------------------------------------------------------------------------
// Erotic Enabled
// ---------------------------------------------------------------------------

export async function getEroticEnabled(): Promise<boolean> {
    try {
        const val = await AsyncStorage.getItem(KEYS.enabled);
        return val === 'true';
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

// ---------------------------------------------------------------------------
// PIN Enabled
// ---------------------------------------------------------------------------

export async function getEroticPinEnabled(): Promise<boolean> {
    try {
        const val = await AsyncStorage.getItem(KEYS.pinEnabled);
        return val === 'true';
    } catch {
        return false;
    }
}

export async function saveEroticPinEnabled(value: boolean): Promise<void> {
    try {
        await AsyncStorage.setItem(KEYS.pinEnabled, value ? 'true' : 'false');
    } catch {
        // Non-fatal
    }
}

// ---------------------------------------------------------------------------
// PIN Value
// ---------------------------------------------------------------------------

export async function getEroticPin(): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(KEYS.pin);
    } catch {
        return null;
    }
}

export async function saveEroticPin(pin: string): Promise<void> {
    try {
        await AsyncStorage.setItem(KEYS.pin, pin);
    } catch {
        // Non-fatal
    }
}

export async function removeEroticPin(): Promise<void> {
    try {
        await AsyncStorage.multiRemove([KEYS.pin, KEYS.pinEnabled]);
    } catch {
        // Non-fatal
    }
}

// ---------------------------------------------------------------------------
// In Playlist
// ---------------------------------------------------------------------------

export async function getEroticInPlaylist(): Promise<boolean> {
    try {
        const val = await AsyncStorage.getItem(KEYS.inPlaylist);
        return val === 'true';
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

// ---------------------------------------------------------------------------
// Clear all erotic settings — called when erotic is disabled
// Resets everything including PIN so user starts fresh if they re-enable
// ---------------------------------------------------------------------------

export async function clearAllEroticSettings(): Promise<void> {
    try {
        await AsyncStorage.multiRemove([
            KEYS.enabled,
            KEYS.pinEnabled,
            KEYS.pin,
            KEYS.inPlaylist,
        ]);
    } catch {
        // Non-fatal
    }
}

// ---------------------------------------------------------------------------
// Load all settings in one call — used by AppContext on startup
// ---------------------------------------------------------------------------

export type EroticSettings = {
    enabled:    boolean;
    pinEnabled: boolean;
    pin:        string | null;
    inPlaylist: boolean;
};

export async function loadAllEroticSettings(): Promise<EroticSettings> {
    try {
        const results = await AsyncStorage.multiGet([
            KEYS.enabled,
            KEYS.pinEnabled,
            KEYS.pin,
            KEYS.inPlaylist,
        ]);

        const map = Object.fromEntries(results.map(([k, v]) => [k, v]));

        return {
            enabled:    map[KEYS.enabled]    === 'true',
            pinEnabled: map[KEYS.pinEnabled] === 'true',
            pin:        map[KEYS.pin]        ?? null,
            inPlaylist: map[KEYS.inPlaylist] === 'true',
        };
    } catch {
        return { enabled: false, pinEnabled: false, pin: null, inPlaylist: false };
    }
}