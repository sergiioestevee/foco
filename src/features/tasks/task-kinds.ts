import type { TaskKind } from '@/types/models';

export const taskKindOptions = [
  { value: 'task', label: 'Tarea' },
  { value: 'delivery', label: 'Entrega' },
  { value: 'practice', label: 'Práctica' },
  { value: 'assignment', label: 'Trabajo' },
] as const satisfies readonly { value: TaskKind; label: string }[];

export function taskKindLabel(kind: TaskKind): string {
  return taskKindOptions.find((option) => option.value === kind)?.label ?? 'Tarea';
}
