import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { AppScreen } from '@/components/app-screen';
import { CategoryPicker } from '@/components/category-picker';
import { ScreenHeader } from '@/components/screen-header';
import { Surface } from '@/components/surface';
import { Typography } from '@/components/typography';
import { useFocoStore } from '@/store/use-foco-store';
import { fonts } from '@/theme/fonts';
import { useTheme } from '@/theme/use-theme';
import { categoryColors, minTouchSize, radii, spacing } from '@/theme/tokens';
import type { CategorySelection, ScheduleBlock } from '@/types/models';

import { timeToMinutes } from './calendar-utils';

type TimeField = 'start' | 'end';

const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
// Monday first, values follow Date.getDay().
const weekdayOptions = [1, 2, 3, 4, 5, 6, 0].map((value) => ({ value, label: 'DLMXJVS'[value] }));

function timeToDate(time: string) {
  const value = new Date();
  value.setHours(Math.floor(timeToMinutes(time) / 60), timeToMinutes(time) % 60, 0, 0);
  return value;
}

type ClassBlockEditorProps = {
  block: ScheduleBlock | null;
  initialWeekday: number;
  onClose: () => void;
};

/** Weekly recurring class or schedule slot. */
export function ClassBlockEditor({ block, initialWeekday, onClose }: ClassBlockEditorProps) {
  const theme = useTheme();
  const subjects = useFocoStore((state) => state.subjects);
  const projects = useFocoStore((state) => state.projects);
  const addScheduleBlock = useFocoStore((state) => state.addScheduleBlock);
  const updateScheduleBlock = useFocoStore((state) => state.updateScheduleBlock);
  const deleteScheduleBlock = useFocoStore((state) => state.deleteScheduleBlock);
  const [weekday, setWeekday] = useState(block?.weekday ?? initialWeekday);
  const [startTime, setStartTime] = useState(block?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(block?.endTime ?? '10:00');
  const [place, setPlace] = useState(block?.place ?? '');
  const [color, setColor] = useState<string>(block?.color ?? categoryColors[0]);
  const [category, setCategory] = useState<CategorySelection>(block?.categoryId && block.categoryType
    ? { categoryId: block.categoryId, categoryType: block.categoryType }
    : { categoryId: null, categoryType: null });
  const [timeField, setTimeField] = useState<TimeField | null>(null);

  const save = () => {
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      Alert.alert('Revisa las horas', 'La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }
    const changes = { weekday, startTime, endTime, place: place.trim(), color, ...category };
    if (block) updateScheduleBlock(block.id, changes);
    else addScheduleBlock(changes);
    onClose();
  };

  const confirmDelete = () => {
    if (!block) return;
    Alert.alert(
      'Eliminar clase',
      `¿Quieres quitar la clase del ${dayNames[block.weekday]} de ${block.startTime} a ${block.endTime}? Desaparecerá de todas las semanas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => { deleteScheduleBlock(block.id); onClose(); } },
      ],
    );
  };

  const chooseTime = (_event: unknown, value?: Date) => {
    if (value && timeField === 'start') setStartTime(format(value, 'HH:mm'));
    if (value && timeField === 'end') setEndTime(format(value, 'HH:mm'));
    if (Platform.OS === 'android') setTimeField(null);
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible>
      <AppScreen>
        <ScreenHeader title={block ? 'Editar clase' : 'Nueva clase semanal'} subtitle="Se repite cada semana.">
          <ActionButton label="Cerrar" variant="plain" onPress={onClose} />
        </ScreenHeader>
        <Surface style={styles.form}>
          <Typography kind="caption">Día de la semana</Typography>
          <View style={styles.weekdayChoices} accessibilityRole="radiogroup">
            {weekdayOptions.map(({ value, label }) => {
              const selected = weekday === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={dayNames[value]}
                  accessibilityState={{ selected }}
                  onPress={() => setWeekday(value)}
                  style={[styles.weekdayChoice, { backgroundColor: selected ? theme.accent : theme.track }]}>
                  <Typography style={{ color: selected ? theme.accentInk : theme.text, fontWeight: '600' }}>{label}</Typography>
                </Pressable>
              );
            })}
          </View>

          <Typography kind="caption">Horario</Typography>
          <View style={styles.timeChoices}>
            <ActionButton label={`Empieza · ${startTime}`} variant="secondary" onPress={() => setTimeField('start')} style={styles.grow} />
            <ActionButton label={`Termina · ${endTime}`} variant="secondary" onPress={() => setTimeField('end')} style={styles.grow} />
          </View>
          {timeField ? (
            <DateTimePicker
              value={timeToDate(timeField === 'start' ? startTime : endTime)}
              mode="time"
              display={Platform.OS === 'ios' ? 'compact' : 'default'}
              onValueChange={chooseTime}
              onDismiss={() => setTimeField(null)}
              themeVariant={theme.colorScheme}
              accentColor={theme.accent}
            />
          ) : null}

          <CategoryPicker
            value={category}
            onChange={(value) => {
              if (value === 'all') return;
              setCategory(value);
              const selectedColor = value.categoryType === 'subject'
                ? subjects.find((subject) => subject.id === value.categoryId)?.color
                : value.categoryType === 'project'
                  ? projects.find((project) => project.id === value.categoryId)?.color
                  : undefined;
              if (selectedColor) setColor(selectedColor);
            }}
          />

          <Typography kind="caption">Lugar (opcional)</Typography>
          <TextInput
            accessibilityLabel="Lugar de la clase"
            maxLength={80}
            onChangeText={setPlace}
            placeholder="Por ejemplo, Aula 2.14"
            placeholderTextColor={theme.muted}
            style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.line, color: theme.text }]}
            value={place}
          />

          <Typography kind="caption">Color</Typography>
          <View style={styles.colorChoices} accessibilityRole="radiogroup">
            {categoryColors.map((option, index) => (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityLabel={`Color ${index + 1}`}
                accessibilityState={{ selected: color === option }}
                onPress={() => setColor(option)}
                style={[styles.colorChoice, { backgroundColor: option, borderColor: color === option ? theme.text : 'transparent' }]}
              />
            ))}
          </View>
          <ActionButton label={block ? 'Guardar cambios' : 'Añadir clase'} onPress={save} />
          {block ? (
            <Pressable accessibilityRole="button" onPress={confirmDelete} style={styles.delete}>
              <Typography style={{ color: theme.danger, fontWeight: '700' }}>Eliminar clase</Typography>
            </Pressable>
          ) : null}
        </Surface>
      </AppScreen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  weekdayChoices: { flexDirection: 'row', gap: spacing.xs },
  weekdayChoice: { flex: 1, minHeight: minTouchSize, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  timeChoices: { flexDirection: 'row', gap: spacing.xs },
  grow: { flex: 1 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: radii.button, paddingHorizontal: spacing.md, fontSize: 16, fontFamily: fonts.medium },
  colorChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  colorChoice: { width: minTouchSize, height: minTouchSize, borderRadius: minTouchSize / 2, borderWidth: 3 },
  delete: { minHeight: minTouchSize, alignItems: 'center', justifyContent: 'center' },
});
