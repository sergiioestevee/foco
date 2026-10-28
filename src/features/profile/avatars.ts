import { categoryColors } from '@/theme/tokens';

/** Friendly default avatars: an animal on a soft circle in one of the app's category colours. */
export const avatars = [
  { id: 'owl', emoji: '🦉', name: 'Búho', color: categoryColors[5] },
  { id: 'fox', emoji: '🦊', name: 'Zorro', color: categoryColors[6] },
  { id: 'panda', emoji: '🐼', name: 'Panda', color: categoryColors[1] },
  { id: 'koala', emoji: '🐨', name: 'Koala', color: categoryColors[4] },
  { id: 'cat', emoji: '🐱', name: 'Gato', color: categoryColors[2] },
  { id: 'dog', emoji: '🐶', name: 'Perro', color: categoryColors[3] },
  { id: 'rabbit', emoji: '🐰', name: 'Conejo', color: categoryColors[0] },
  { id: 'bear', emoji: '🐻', name: 'Oso', color: categoryColors[7] },
  { id: 'penguin', emoji: '🐧', name: 'Pingüino', color: categoryColors[4] },
  { id: 'turtle', emoji: '🐢', name: 'Tortuga', color: categoryColors[1] },
  { id: 'octopus', emoji: '🐙', name: 'Pulpo', color: categoryColors[3] },
  { id: 'bee', emoji: '🐝', name: 'Abeja', color: categoryColors[2] },
] as const;

export type AvatarId = (typeof avatars)[number]['id'];

export const DEFAULT_AVATAR: AvatarId = 'owl';

export function getAvatar(id: AvatarId | null | undefined) {
  return avatars.find((avatar) => avatar.id === id) ?? avatars[0];
}

export function isAvatarId(value: unknown): value is AvatarId {
  return avatars.some((avatar) => avatar.id === value);
}
