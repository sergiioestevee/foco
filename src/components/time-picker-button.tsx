import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useState } from 'react';
import { Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { PickerPopup } from '@/components/picker-popup';
import { SymbolIcon } from '@/components/symbol-icon';
import { timeToMinutes } from '@/features/calendar/calendar-utils';
import { useTheme } from '@/theme/use-theme';

function timeAsDate(time: string) {
  const value = new Date();
  value.setHours(Math.floor(timeToMinutes(time) / 60), timeToMinutes(time) % 60, 0, 0);
  return value;
}

type TimePickerButtonProps = {
  /** HH:mm, or null for «no time yet». */
  value: string | null;
  onChange: (time: string) => void;
  title?: string;
  /** Label while value is null. */
  placeholder?: string;
  /** What the wheel starts on while value is null; «Listo» keeps it. */
  defaultValue?: string;
  /** Adds «Quitar hora» to the popup. */
  onClear?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Full-width button showing the time. On iOS it opens the native wheel in a centred popup that
 * closes with «Listo» (or a tap outside), so the form scrolls freely again; Android shows its
 * native dialog.
 */
export function TimePickerButton({ value, onChange, title = 'Hora', placeholder = 'Añadir hora', defaultValue = '18:00', onClear, style }: TimePickerButtonProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const shown = value ?? defaultValue;

  return (
    <>
      <ActionButton
        label={value ?? placeholder}
        accessibilityLabel={value ? `${title}: ${value}. Cambiar` : placeholder}
        variant="secondary"
        icon={<SymbolIcon ios="clock" other="schedule" color={theme.accent} size={18} />}
        onPress={() => setOpen(true)}
        style={style}
      />
      {Platform.OS === 'ios' ? (
        <PickerPopup
          visible={open}
          title={title}
          onClose={() => setOpen(false)}
          onDone={() => {
            if (value === null) onChange(defaultValue);
            setOpen(false);
          }}
          clearLabel={value !== null && onClear ? 'Quitar hora' : undefined}
          onClear={() => {
            onClear?.();
            setOpen(false);
          }}>
          <DateTimePicker
            value={timeAsDate(shown)}
            mode="time"
            display="spinner"
            locale="es-ES"
            minuteInterval={5}
            onValueChange={(_event, date) => onChange(format(date, 'HH:mm'))}
            themeVariant={theme.colorScheme}
            textColor={theme.text}
            style={styles.wheel}
          />
        </PickerPopup>
      ) : open ? (
        <DateTimePicker
          value={timeAsDate(shown)}
          mode="time"
          display="default"
          is24Hour
          onValueChange={(_event, date) => {
            onChange(format(date, 'HH:mm'));
            setOpen(false);
          }}
          onDismiss={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  wheel: { alignSelf: 'center' },
});
