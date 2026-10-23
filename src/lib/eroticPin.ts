import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

// Client for the account-level erotic content PIN. The PIN itself is checked on the server
// (manageEroticPin mutation); nothing about it is stored on the phone.

export type PinResult = {
    ok: boolean;
    pinSet: boolean;
    error?: string;          // 'wrong_pin' | 'locked' | 'invalid_pin' | 'pin_required' | 'bad_request' | 'server_error'
    attemptsLeft?: number;
    lockedUntil?: number;    // epoch seconds
};

type Args = { action: 'status' | 'verify' | 'set' | 'remove'; pin?: string; newPin?: string };

export async function callEroticPin(args: Args): Promise<PinResult> {
    try {
        const client = generateClient<Schema>();
        const res: any = await client.mutations.manageEroticPin(args);
        if (res.errors?.length || !res.data) {
            console.warn('manageEroticPin failed:', res.errors?.[0]?.message ?? 'no data');
            return { ok: false, pinSet: false, error: 'server_error' };
        }
        return {
            ok:           !!res.data.ok,
            pinSet:       !!res.data.pinSet,
            error:        res.data.error ?? undefined,
            attemptsLeft: res.data.attemptsLeft ?? undefined,
            lockedUntil:  res.data.lockedUntil ?? undefined,
        };
    } catch (err) {
        console.warn('manageEroticPin error:', err);
        return { ok: false, pinSet: false, error: 'server_error' };
    }
}

export function pinErrorMessage(result: PinResult): string {
    switch (result.error) {
        case 'wrong_pin': {
            const n = result.attemptsLeft;
            return n != null
                ? `Incorrect PIN. ${n} attempt${n === 1 ? '' : 's'} left.`
                : 'Incorrect PIN. Try again.';
        }
        case 'locked': {
            const secs = Math.max(0, (result.lockedUntil ?? 0) - Math.floor(Date.now() / 1000));
            const mins = Math.max(1, Math.ceil(secs / 60));
            return `Too many attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`;
        }
        case 'pin_required':
        case 'invalid_pin':
            return 'Enter a 4-digit PIN.';
        case 'server_error':
            return "Couldn't reach the server. Check your connection and try again.";
        default:
            return 'Something went wrong. Please try again.';
    }
}
