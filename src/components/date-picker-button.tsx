import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isThisYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import { Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { PickerPopup } from '@/components/picker-popup';
import { SymbolIcon } from '@/components/symbol-icon';
import { useTheme } from '@/theme/use-theme';

const capitalize = (label: string) => label.charAt(0).toUpperCase() + label.slice(1);

/** «Sábado 12 de septiembre», with the year only when it isn't this one. */
export function formatLongDate(date: Date) {
  return capitalize(format(date, isThisYear(date) ? "EEEE d 'de' MMMM" : "EEEE d 'de' MMMM yyyy", { locale: es }));
}

/** «Sáb 12/09»: fits half a row whatever the month or weekday. */
export function formatShortDate(date: Date) {
  return capitalize(format(date, isThisYear(date) ? 'EEE dd/MM' : 'dd/MM/yy', { locale: es }).replace('.', ''));
}

type DatePickerButtonProps = {
  value: Date | null;
  /** Gets the picked day; the time of day is up to the caller. */
  onChange: (date: Date) => void;
  title?: string;
  placeholder?: string;
  /** DD/MM label, for a button that shares its row. */
  short?: boolean;
  /** Adds «Quitar fecha» to the popup. */
  onClear?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Like TimePickerButton but for a day: the native calendar, in Spanish, in a centred popup on iOS. */
export function DatePickerButton({ value, onChange, title = 'Fecha', placeholder = 'Sin fecha', short = false, onClear, style }: DatePickerButtonProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const label = value ? (short ? formatShortDate(value) : formatLongDate(value)) : placeholder;

  return (
    <>
      <ActionButton
        label={label}
        accessibilityLabel={value ? `${title}: ${formatLongDate(value)}. Cambiar` : placeholder}
        variant="secondary"
        icon={<SymbolIcon ios="calendar" other="calendar_today" color={theme.accent} size={18} />}
        onPress={() => setOpen(true)}
        style={style}
      />
      {Platform.OS === 'ios' ? (
        <PickerPopup
          visible={open}
          title={title}
          onClose={() => setOpen(false)}
          onDone={() => {
            // «Listo» without touching the calendar picks the day it shows: today.
            if (!value) onChange(new Date());
            setOpen(false);
          }}
          clearLabel={value && onClear ? 'Quitar fecha' : undefined}
          onClear={() => {
            onClear?.();
            setOpen(false);
          }}>
          <DateTimePicker
            value={value ?? new Date()}
            mode="date"
            display="inline"
            locale="es-ES"
            onValueChange={(_event, date) => onChange(date)}
            themeVariant={theme.colorScheme}
            accentColor={theme.accent}
            textColor={theme.text}
            style={styles.calendar}
          />
        </PickerPopup>
      ) : open ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display="default"
          onValueChange={(_event, date) => {
            onChange(date);
            setOpen(false);
          }}
          onDismiss={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  calendar: { alignSelf: 'stretch' },
});
