// src/lib/paginate.ts  (runts)  — and copy to runts-admin/src/lib/paginate.ts
// SCALE RULE: never trust a single list/query page. Loop nextToken to the end
// for logic (lookups, sync, dedupe). User-facing long lists use load-more instead.
export async function fetchAllPages<T>(
  fetchPage: (nextToken: string | null) => Promise<{ data?: T[] | null; nextToken?: string | null; errors?: any[] }>,
  maxPages = 1000,
): Promise<T[]> {
  const all: T[] = [];
  let token: string | null = null;
  for (let i = 0; i < maxPages; i++) {
    const res = await fetchPage(token);
    if (res.errors?.length) throw new Error(res.errors[0].message);
    all.push(...(res.data ?? []));
    token = res.nextToken ?? null;
    if (!token) return all;
  }
  throw new Error('fetchAllPages: page limit hit');
}
