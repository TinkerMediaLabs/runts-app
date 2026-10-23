// Tiny event channel for the small confirmation chip shown at the top of the
// screen ("Story pinned to playlist"). Works from anywhere (hooks included)
// without needing a React provider; the <ActionChip /> component mounted in
// AppShell listens for it.

export type ChipKind = 'success' | 'error';
export type ChipMessage = { id: number; text: string; kind: ChipKind };

type Listener = (message: ChipMessage) => void;

const listeners = new Set<Listener>();
let counter = 0;

export function showChip(text: string, kind: ChipKind = 'success'): void {
    const message: ChipMessage = { id: ++counter, text, kind };
    listeners.forEach(listener => listener(message));
}

export function subscribeChip(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
