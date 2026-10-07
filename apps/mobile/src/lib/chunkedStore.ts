// Keychain values are capped around 2 KB on iOS and a Supabase session is bigger than that, so a
// value is split into chunks and reassembled. Pure, so it can be tested without the native module.

export const CHUNK_SIZE = 1800;

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

const countKey = (key: string) => `${key}.n`;
const partKey = (key: string, i: number) => `${key}.${i}`;

export function chunkedStore(raw: KeyValueStore): KeyValueStore {
  return {
    async get(key) {
      const n = Number(await raw.get(countKey(key)));
      if (!Number.isInteger(n) || n <= 0) return null;
      const parts: string[] = [];
      for (let i = 0; i < n; i++) {
        const part = await raw.get(partKey(key, i));
        if (part === null) return null;
        parts.push(part);
      }
      return parts.join("");
    },
    async set(key, value) {
      const prev = Number(await raw.get(countKey(key))) || 0;
      const n = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
      for (let i = 0; i < n; i++) await raw.set(partKey(key, i), value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
      await raw.set(countKey(key), String(n));
      for (let i = n; i < prev; i++) await raw.remove(partKey(key, i));
    },
    async remove(key) {
      const n = Number(await raw.get(countKey(key))) || 0;
      for (let i = 0; i < n; i++) await raw.remove(partKey(key, i));
      await raw.remove(countKey(key));
    },
  };
}
