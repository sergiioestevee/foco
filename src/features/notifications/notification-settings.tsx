import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { Alert, Linking, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { requestTaskReminderPermission } from '@/services/notification-service';
import { useFocoStore } from '@/store/use-foco-store';
import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';
import type { AppSettings } from '@/types/models';

const reminderOptions = [5, 10, 15, 30, 60];

type KindToggle = {
  key: keyof Pick<AppSettings, 'taskReminders' | 'examReminders' | 'routineReminders'>;
  label: string;
  icon: { ios: SFSymbol; other: AndroidSymbol };
};

const kinds: KindToggle[] = [
  { key: 'taskReminders', label: 'Tareas', icon: { ios: 'checklist', other: 'checklist' } },
  { key: 'examReminders', label: 'Exámenes', icon: { ios: 'graduationcap', other: 'school' } },
  { key: 'routineReminders', label: 'Rutinas', icon: { ios: 'repeat', other: 'repeat' } },
];

/** Reminder preferences: master switch, which kinds, and how early for tasks. Lives in the Inicio bell popup. */
export function NotificationSettings() {
  const theme = useTheme();
  const settings = useFocoStore((state) => state.settings);
  const updateSettings = useFocoStore((state) => state.updateSettings);

  const toggleAll = async (enabled: boolean) => {
    if (!enabled) {
      updateSettings({ notificationsEnabled: false });
      return;
    }
    try {
      const granted = await requestTaskReminderPermission();
      if (granted) updateSettings({ notificationsEnabled: true });
      else {
        Alert.alert('Permiso no concedido', 'Activa las notificaciones de Foco en los ajustes del iPhone para recibir avisos.', [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Abrir Ajustes', onPress: () => void Linking.openSettings() },
        ]);
      }
    } catch {
      Alert.alert('No se pudieron activar', 'Inténtalo de nuevo desde los ajustes del dispositivo.');
    }
  };

  const detail: Record<KindToggle['key'], string> = {
    taskReminders: `${settings.reminderMinutesBefore} min antes de la entrega`,
    examReminders: 'La tarde anterior, a las 20:00',
    routineReminders: 'A la hora de cada rutina',
  };

  if (Platform.OS === 'web') {
    return <Typography kind="caption">Los recordatorios están disponibles en iOS y Android.</Typography>;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Typography style={styles.label}>Recibir avisos</Typography>
          <Typography kind="caption">{settings.notificationsEnabled ? 'Elige de qué quieres que te avisemos.' : 'Ahora mismo Foco no te avisa de nada.'}</Typography>
        </View>
        <Switch
          accessibilityLabel="Recibir avisos"
          value={settings.notificationsEnabled}
          onValueChange={(value) => void toggleAll(value)}
          trackColor={{ true: theme.accent, false: theme.line }}
        />
      </View>

      {settings.notificationsEnabled ? (
        <View style={[styles.group, { borderColor: theme.line }]}>
          {kinds.map((kind, index) => (
            <View key={kind.key} style={[styles.kind, index > 0 && { borderTopColor: theme.line, borderTopWidth: StyleSheet.hairlineWidth }]}>
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: theme.aiBg }]}>
                  <SymbolIcon ios={kind.icon.ios} other={kind.icon.other} color={theme.accent} size={15} />
                </View>
                <View style={styles.copy}>
                  <Typography style={styles.label}>{kind.label}</Typography>
                  <Typography kind="caption">{detail[kind.key]}</Typography>
                </View>
                <Switch
                  accessibilityLabel={`Avisos de ${kind.label.toLowerCase()}`}
                  value={settings[kind.key]}
                  onValueChange={(value) => updateSettings({ [kind.key]: value })}
                  trackColor={{ true: theme.accent, false: theme.line }}
                />
              </View>
              {kind.key === 'taskReminders' && settings.taskReminders ? (
                <View style={styles.options} accessibilityRole="radiogroup">
                  {reminderOptions.map((minutes) => {
                    const selected = settings.reminderMinutesBefore === minutes;
                    return (
                      <Pressable
                        key={minutes}
                        accessibilityRole="radio"
                        accessibilityLabel={`${minutes} minutos antes`}
                        accessibilityState={{ selected }}
                        onPress={() => updateSettings({ reminderMinutesBefore: minutes })}
                        style={[styles.option, { backgroundColor: selected ? theme.accent : theme.track }]}>
                        <Typography style={{ color: selected ? theme.accentInk : theme.text, fontWeight: '600', fontSize: 14 }}>{minutes} min</Typography>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  copy: { flex: 1, gap: 2 },
  label: { fontSize: 16, fontWeight: '600' },
  group: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.sm },
  kind: { paddingVertical: spacing.sm, gap: spacing.sm },
  icon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingLeft: 30 + spacing.sm },
  option: { minHeight: 36, minWidth: 52, paddingHorizontal: spacing.sm, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
