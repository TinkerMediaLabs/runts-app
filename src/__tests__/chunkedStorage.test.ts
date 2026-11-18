import { createChunkedStorage, type KeyValueBackend } from '../lib/chunkedStorage';

const memory = () => {
  const map = new Map<string, string>();
  const backend: KeyValueBackend = {
    getItem: async k => (map.has(k) ? map.get(k)! : null),
    setItem: async (k, v) => { map.set(k, v); },
    removeItem: async k => { map.delete(k); },
  };
  return { map, backend };
};

describe('chunkedStorage', () => {
  it('round-trips a value larger than one chunk, with every row small', async () => {
    const { map, backend } = memory();
    const store = createChunkedStorage(backend, 10);
    const value = 'abcdefghij'.repeat(7) + 'xyz';
    await store.setItem('k', value);
    expect(await store.getItem('k')).toBe(value);
    for (const v of map.values()) expect(v.length).toBeLessThanOrEqual(20);
  });

  it('returns null when nothing is saved and passes through a value saved before chunking', async () => {
    const { backend } = memory();
    const store = createChunkedStorage(backend, 10);
    expect(await store.getItem('k')).toBeNull();
    await backend.setItem('old', '{"plain":true}');
    expect(await store.getItem('old')).toBe('{"plain":true}');
  });

  it('drops leftover pieces when a shorter value replaces a longer one', async () => {
    const { map, backend } = memory();
    const store = createChunkedStorage(backend, 10);
    await store.setItem('k', 'x'.repeat(45));
    await store.setItem('k', 'y'.repeat(5));
    expect(await store.getItem('k')).toBe('yyyyy');
    expect([...map.keys()].sort()).toEqual(['k', 'k:0']);
  });

  it('treats an interrupted save (a missing piece) as empty', async () => {
    const { map, backend } = memory();
    const store = createChunkedStorage(backend, 10);
    await store.setItem('k', 'z'.repeat(35));
    map.delete('k:2');
    expect(await store.getItem('k')).toBeNull();
  });

  it('removes the marker and every piece', async () => {
    const { map, backend } = memory();
    const store = createChunkedStorage(backend, 10);
    await store.setItem('k', 'q'.repeat(35));
    await store.removeItem('k');
    expect(map.size).toBe(0);
  });

  it('saves an empty string', async () => {
    const { backend } = memory();
    const store = createChunkedStorage(backend, 10);
    await store.setItem('k', '');
    expect(await store.getItem('k')).toBe('');
  });

  it('uses batch writes and removes when the backend has them', async () => {
    const { map, backend } = memory();
    let multiSetCalls = 0, multiRemoveCalls = 0;
    const batched: KeyValueBackend = {
      ...backend,
      multiSet: async pairs => { multiSetCalls++; pairs.forEach(([k, v]) => map.set(k, v)); },
      multiRemove: async keys => { multiRemoveCalls++; keys.forEach(k => map.delete(k)); },
    };
    const store = createChunkedStorage(batched, 10);
    await store.setItem('k', 'x'.repeat(45));
    expect(multiSetCalls).toBe(1);
    expect(await store.getItem('k')).toBe('x'.repeat(45));
    await store.setItem('k', 'y'.repeat(5));
    expect(multiRemoveCalls).toBe(1);
    expect(await store.getItem('k')).toBe('yyyyy');
    expect([...map.keys()].sort()).toEqual(['k', 'k:0']);
  });
});

