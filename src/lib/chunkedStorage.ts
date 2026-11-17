// The offline cache is saved as one big text. On Android a single AsyncStorage row over about 2MB cannot be
// read back ("Row too big to fit into CursorWindow"), so a heavy listener's whole cache would be thrown away.
// This wrapper stores the text in pieces of CHUNK_SIZE characters under `${key}:0`, `${key}:1`, ... and keeps
// a small marker under `key` itself, so no row is ever large however much the listener has viewed.
export interface KeyValueBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const CHUNK_SIZE = 400_000;
const MARKER = '__chunked__:';

const markerCount = (value: string | null): number | null => {
  if (!value || !value.startsWith(MARKER)) return null;
  const n = Number(value.slice(MARKER.length));
  return Number.isInteger(n) && n >= 0 ? n : null;
};

export function createChunkedStorage(backend: KeyValueBackend, chunkSize: number = CHUNK_SIZE): KeyValueBackend {
  const removeChunks = async (key: string, from: number, to: number) => {
    for (let i = from; i < to; i++) await backend.removeItem(`${key}:${i}`);
  };
  return {
    async getItem(key) {
      const head = await backend.getItem(key);
      const count = markerCount(head);
      if (count === null) return head;                       // nothing saved, or saved before chunking
      const parts: string[] = [];
      for (let i = 0; i < count; i++) {
        const part = await backend.getItem(`${key}:${i}`);
        if (part === null) return null;                      // incomplete (interrupted save): treat as empty
        parts.push(part);
      }
      return parts.join('');
    },
    async setItem(key, value) {
      const previous = markerCount(await backend.getItem(key).catch(() => null)) ?? 0;
      const count = Math.max(1, Math.ceil(value.length / chunkSize));
      for (let i = 0; i < count; i++) await backend.setItem(`${key}:${i}`, value.slice(i * chunkSize, (i + 1) * chunkSize));
      await backend.setItem(key, `${MARKER}${count}`);       // the marker goes last: a half-written save is never read
      await removeChunks(key, count, previous);              // drop pieces left over from a longer earlier save
    },
    async removeItem(key) {
      const previous = markerCount(await backend.getItem(key).catch(() => null)) ?? 0;
      await backend.removeItem(key);
      await removeChunks(key, 0, previous);
    },
  };
}
