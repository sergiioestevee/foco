import {
  collectionEntities,
  singletonEntities,
  SINGLETON_ID,
  type CollectionEntity,
  type EntityName,
  type RecordChange,
  type SingletonEntity,
  type SyncedState,
} from './entities';

/** Per-record bookkeeping, kept outside the app state so screens never see it. */
export type RecordMeta = {
  updatedAt: string;
  /** Has local edits the server doesn't have yet. */
  dirty: boolean;
  /** Has reached the server at least once, so a deletion must be sent as a tombstone. */
  onServer: boolean;
  deleted: boolean;
};
export type SyncMeta = Record<string, RecordMeta>;

export const metaKey = (entity: EntityName, id: string) => `${entity}:${id}`;

type Identified = { id: string };

function sameValue(left: unknown, right: unknown) {
  return left === right || JSON.stringify(left) === JSON.stringify(right);
}

/** Ids added or edited, and ids removed, between two versions of a collection. */
export function diffCollection(previous: readonly Identified[], next: readonly Identified[]) {
  const previousById = new Map(previous.map((item) => [item.id, item]));
  const nextIds = new Set(next.map((item) => item.id));
  return {
    changed: next.filter((item) => !sameValue(previousById.get(item.id), item)).map((item) => item.id),
    removed: previous.filter((item) => !nextIds.has(item.id)).map((item) => item.id),
  };
}

/** Records the edits between two states in `meta`. Returns the updated meta (same object if nothing changed). */
export function trackChanges(previous: SyncedState, next: SyncedState, meta: SyncMeta, now: string): SyncMeta {
  let result = meta;
  const mark = (entity: EntityName, id: string, deleted: boolean) => {
    const key = metaKey(entity, id);
    const current = result[key];
    if (result === meta) result = { ...meta };
    // Deleting something that never reached the server needs no tombstone.
    if (deleted && !current?.onServer) delete result[key];
    else result[key] = { updatedAt: now, dirty: true, onServer: current?.onServer ?? false, deleted };
  };

  for (const [entity, stateKey] of Object.entries(collectionEntities) as [CollectionEntity, keyof SyncedState][]) {
    if (previous[stateKey] === next[stateKey]) continue;
    const { changed, removed } = diffCollection((previous[stateKey] ?? []) as Identified[], (next[stateKey] ?? []) as Identified[]);
    changed.forEach((id) => mark(entity, id, false));
    removed.forEach((id) => mark(entity, id, true));
  }
  for (const [entity, stateKey] of Object.entries(singletonEntities) as [SingletonEntity, keyof SyncedState][]) {
    if (sameValue(previous[stateKey], next[stateKey])) continue;
    mark(entity, SINGLETON_ID, next[stateKey] === null);
  }
  return result;
}

const isPending = (meta: RecordMeta | undefined) => !meta || meta.dirty;

/** Everything the server doesn't have yet. Records without meta (data from before tracking existed) are included. */
export function collectPendingChanges(state: SyncedState, meta: SyncMeta): RecordChange[] {
  const changes: RecordChange[] = [];
  const unknownTime = new Date(0).toISOString();

  for (const [entity, stateKey] of Object.entries(collectionEntities) as [CollectionEntity, keyof SyncedState][]) {
    for (const item of (state[stateKey] ?? []) as Identified[]) {
      const record = meta[metaKey(entity, item.id)];
      if (isPending(record)) changes.push({ entity, id: item.id, data: item, deleted: false, updatedAt: record?.updatedAt ?? unknownTime });
    }
  }
  for (const [entity, stateKey] of Object.entries(singletonEntities) as [SingletonEntity, keyof SyncedState][]) {
    const value = state[stateKey];
    const record = meta[metaKey(entity, SINGLETON_ID)];
    if (value !== null && isPending(record)) {
      changes.push({ entity, id: SINGLETON_ID, data: value, deleted: false, updatedAt: record?.updatedAt ?? unknownTime });
    }
  }
  for (const [key, record] of Object.entries(meta)) {
    if (!record.deleted || !isPending(record)) continue;
    const [entity, ...idParts] = key.split(':');
    changes.push({ entity: entity as EntityName, id: idParts.join(':'), data: null, deleted: true, updatedAt: record.updatedAt });
  }
  return changes;
}

/**
 * Applies remote records with last-write-wins: a remote record replaces the local one unless the local
 * one has unsynced edits that are newer. Returns only the parts of the state that changed.
 */
export function mergeRemoteChanges(state: SyncedState, meta: SyncMeta, remote: RecordChange[]) {
  const patch: Partial<SyncedState> = {};
  const nextMeta: SyncMeta = { ...meta };

  for (const change of remote) {
    const key = metaKey(change.entity, change.id);
    const local = meta[key];
    if (local && isPending(local) && local.updatedAt > change.updatedAt) continue;
    nextMeta[key] = { updatedAt: change.updatedAt, dirty: false, onServer: true, deleted: change.deleted };

    if (change.entity in collectionEntities) {
      const stateKey = collectionEntities[change.entity as CollectionEntity];
      const items = (patch[stateKey] ?? state[stateKey] ?? []) as Identified[];
      const without = items.filter((item) => item.id !== change.id);
      const existingIndex = items.findIndex((item) => item.id === change.id);
      const next = change.deleted
        ? without
        : existingIndex >= 0
          ? items.map((item) => (item.id === change.id ? (change.data as Identified) : item))
          : [...items, change.data as Identified];
      (patch as Record<string, unknown>)[stateKey] = next;
    } else {
      const stateKey = singletonEntities[change.entity as SingletonEntity];
      (patch as Record<string, unknown>)[stateKey] = change.deleted ? null : change.data;
    }
  }
  return { patch, meta: nextMeta };
}

export function markSynced(meta: SyncMeta, pushed: RecordChange[]): SyncMeta {
  const next = { ...meta };
  for (const change of pushed) {
    const key = metaKey(change.entity, change.id);
    // A pushed tombstone has done its job; an edit made during the push stays pending.
    if (change.deleted && next[key]?.updatedAt === change.updatedAt) delete next[key];
    else if (next[key]?.updatedAt === change.updatedAt || !next[key]) next[key] = { updatedAt: change.updatedAt, dirty: false, onServer: true, deleted: false };
  }
  return next;
}
