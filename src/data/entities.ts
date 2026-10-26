import type { FocoState } from '@/store/use-foco-store';

/**
 * Everything that belongs to a user and gets synced. Collections are arrays of items with an `id`;
 * singletons are one object per user, stored remotely under the id `me`.
 * Adding an entity here also requires adding it to the `entity` check in the Supabase migration.
 */
export const collectionEntities = {
  subject: 'subjects',
  project: 'projects',
  task: 'tasks',
  exam: 'exams',
  goal: 'goals',
  scheduleBlock: 'scheduleBlocks',
  studyBlock: 'studyBlocks',
  routine: 'routines',
  chat: 'chats',
  chatMessage: 'chatMessages',
  aiMemory: 'aiMemories',
} as const satisfies Record<string, keyof FocoState>;

export const singletonEntities = {
  profile: 'profile',
  settings: 'settings',
} as const satisfies Record<string, keyof FocoState>;

export const SINGLETON_ID = 'me';

export type CollectionEntity = keyof typeof collectionEntities;
export type SingletonEntity = keyof typeof singletonEntities;
export type EntityName = CollectionEntity | SingletonEntity;

export type SyncedState = Pick<
  FocoState,
  (typeof collectionEntities)[CollectionEntity] | (typeof singletonEntities)[SingletonEntity]
>;

/** One row of the remote `user_records` table, also used as the unit of change locally. */
export type RecordChange = {
  entity: EntityName;
  id: string;
  /** null when deleted. */
  data: unknown;
  deleted: boolean;
  /** Client time of the last edit; decides conflicts (last write wins). */
  updatedAt: string;
};
