import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pressable, StyleSheet, View } from 'react-native';

import { Surface } from '@/components/surface';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, spacing } from '@/theme/tokens';
import { taskKindLabel } from '@/features/tasks/task-kinds';
import type { Task } from '@/types/models';

type TaskRowProps = {
  task: Task;
  categoryName?: string;
  categoryColor?: string;
  overdue?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function TaskRow({ task, categoryName, categoryColor, overdue = false, onToggle, onEdit, onDelete }: TaskRowProps) {
  const theme = useTheme();
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const priorityLabel = task.priority === 'high' ? 'Alta' : task.priority === 'low' ? 'Baja' : 'Media';

  return (
    <Surface style={[styles.row, overdue && { borderLeftWidth: 3, borderLeftColor: theme.danger }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`${task.completed ? 'Desmarcar' : 'Completar'} tarea: ${task.title}`}
        accessibilityState={{ checked: task.completed }}
        onPress={onToggle}
        style={[styles.check, { borderColor: task.completed ? theme.accent : theme.muted, backgroundColor: task.completed ? theme.accent : 'transparent' }]}>
        {task.completed ? <SymbolIcon ios="checkmark" other="check" color={theme.accentInk} size={15} /> : null}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Editar tarea ${task.title}`} onPress={onEdit} style={styles.copy}>
        <Typography style={[styles.title, task.completed && styles.completed]}>{task.title}</Typography>
        {task.notes ? <Typography kind="caption" numberOfLines={2}>{task.notes}</Typography> : null}
        <View style={styles.meta}>
          {task.kind !== 'task' ? (
            <View style={[styles.kind, { backgroundColor: theme.track }]}>
              <Typography kind="caption" style={{ color: theme.text }}>{taskKindLabel(task.kind)}</Typography>
            </View>
          ) : null}
          {categoryName ? (
            <View style={styles.category}>
              <View style={[styles.dot, { backgroundColor: categoryColor ?? theme.accent }]} />
              <Typography kind="caption" numberOfLines={1}>{categoryName}</Typography>
            </View>
          ) : null}
          {dueDate && !task.completed ? <Typography kind="caption" style={{ color: overdue ? theme.danger : theme.muted }}>{overdue ? 'Atrasada' : format(dueDate, 'd MMM', { locale: es })}</Typography> : null}
          {!task.completed ? <Typography kind="caption">Prioridad {priorityLabel.toLowerCase()}</Typography> : null}
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar tarea ${task.title}`} onPress={onDelete} style={styles.delete}>
        <SymbolIcon ios="trash" other="delete" color={theme.muted} size={17} />
      </Pressable>
    </Surface>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md, marginBottom: spacing.xs },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  copy: { flex: 1, gap: spacing.xxs },
  title: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  completed: { textDecorationLine: 'line-through', opacity: 0.62 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  category: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, maxWidth: 150 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  kind: { borderRadius: 999, paddingHorizontal: spacing.xs, paddingVertical: 2 },
  delete: { width: minTouchSize, minHeight: minTouchSize, alignItems: 'center', justifyContent: 'center' },
});
