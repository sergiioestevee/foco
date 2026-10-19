import { categoryColors } from '@/theme/tokens';
import type { Subject } from '@/types/models';

export type DefaultSubject = Omit<Subject, 'id'>;

export const defaultSubjects: DefaultSubject[] = [
  { name: 'Matemáticas', color: categoryColors[0], icon: 'function', order: 0 },
  { name: 'Lengua', color: categoryColors[3], icon: 'text.book.closed', order: 1 },
  { name: 'Inglés', color: categoryColors[1], icon: 'character.bubble', order: 2 },
  { name: 'Historia', color: categoryColors[2], icon: 'building.columns', order: 3 },
  { name: 'Física', color: categoryColors[5], icon: 'atom', order: 4 },
  { name: 'Química', color: categoryColors[6], icon: 'flask', order: 5 },
  { name: 'Biología', color: categoryColors[7], icon: 'leaf', order: 6 },
  { name: 'Informática', color: categoryColors[4], icon: 'laptopcomputer', order: 7 },
];
