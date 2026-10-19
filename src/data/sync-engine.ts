import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeProfile } from '@/features/profile/normalize-profile';
import { useFocoStore, type FocoState } from '@/store/use-foco-store';

import { collectionEntities, singletonEntities, type RecordChange, type SyncedState } from './entities';
import { collectPendingChanges, markSynced, mergeRemoteChanges, trackChanges, type SyncMeta } from './sync-logic';

/**
 * Where synced records live. Local mode has none; phase 6 plugs in a Supabase implementation
 * (table `user_records`, protected by RLS) without touching any screen.
 */
export interface RemoteStore {
  /** Records changed on the server after `cursor` (server time), plus the new cursor. */
  pull(cursor: string | null): Promise<{ changes: RecordChange[]; cursor: string | null }>;
  push(changes: RecordChange[]): Promise<void>;
}

const STORAGE_KEY = 'foco-sync-v1';
type PersistedSync = { meta: SyncMeta; cursor: string | null };

let meta: SyncMeta = {};
let cursor: string | null = null;
let remote: RemoteStore | null = null;
let applyingRemote = false;
let started = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function pickSynced(state: FocoState): SyncedState {
  const picked: Record<string, unknown> = {};
  for (const key of [...Object.values(collectionEntities), ...Object.values(singletonEntities)]) picked[key] = state[key];
  return picked as SyncedState;
}

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ meta, cursor } satisfies PersistedSync)).catch(() => undefined);
  }, 500);
}

/** Starts recording local edits. Call once the store has hydrated, so loading saved data isn't counted as edits. */
export async function startSyncTracking() {
  if (started) return;
  started = true;

  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) ({ meta, cursor } = JSON.parse(saved) as PersistedSync);
  } catch {
    // Corrupt bookkeeping only means the next sync re-sends everything; local data is untouched.
  }

  useFocoStore.subscribe((state, previous) => {
    if (applyingRemote) return;
    const next = trackChanges(pickSynced(previous), pickSynced(state), meta, new Date().toISOString());
    if (next !== meta) {
      meta = next;
      schedulePersist();
    }
  });
}

export function setRemoteStore(store: RemoteStore | null) {
  remote = store;
}

export function isSyncEnabled() {
  return remote !== null;
}

/** Pull, merge (last write wins) and push. A no-op in local mode. */
export async function syncNow(): Promise<'local' | 'synced'> {
  if (!remote) return 'local';

  const pulled = await remote.pull(cursor);
  const merged = mergeRemoteChanges(pickSynced(useFocoStore.getState()), meta, pulled.changes);
  if ('profile' in merged.patch) merged.patch.profile = normalizeProfile(merged.patch.profile);
  if (Object.keys(merged.patch).length) {
    applyingRemote = true;
    try {
      useFocoStore.setState(merged.patch);
    } finally {
      applyingRemote = false;
    }
  }
  meta = merged.meta;
  cursor = pulled.cursor;

  const pending = collectPendingChanges(pickSynced(useFocoStore.getState()), meta);
  if (pending.length) {
    await remote.push(pending);
    meta = markSynced(meta, pending);
  }
  schedulePersist();
  return 'synced';
}

/** Number of local records the server doesn't have yet (shown in Perfil later). */
export function countPendingChanges() {
  return collectPendingChanges(pickSynced(useFocoStore.getState()), meta).length;
}
