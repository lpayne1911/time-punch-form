// Web implementation of token storage. CRUCIAL: this file must NOT import
// `expo-secure-store` — its web build is an empty object, and importing it makes
// expo-modules-core's registerWebModule throw at startup ("Module implementation
// must be a class"), which blanks the whole web app. Metro resolves this `.web`
// file for web automatically, so the native `storage.ts` (which uses SecureStore)
// is never pulled into the web bundle.

const memory = new Map<string, string>();

function ls(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export async function getItem(key: string): Promise<string | null> {
  const store = ls();
  if (store) {
    try {
      return store.getItem(key);
    } catch {
      /* fall through to memory */
    }
  }
  return memory.get(key) ?? null;
}

export async function setItem(key: string, value: string): Promise<void> {
  memory.set(key, value);
  try {
    ls()?.setItem(key, value);
  } catch {
    /* private mode — token lives in memory for this session only */
  }
}

export async function deleteItem(key: string): Promise<void> {
  memory.delete(key);
  try {
    ls()?.removeItem(key);
  } catch {
    /* ignore */
  }
}
