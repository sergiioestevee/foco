import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { AppScreen } from '@/components/app-screen';
import { ScreenHeader } from '@/components/screen-header';
import { Surface } from '@/components/surface';
import { Typography } from '@/components/typography';
import { AiMemorySection } from '@/features/assistant/ai-memory-section';
import { NotificationSettings } from '@/features/notifications/notification-settings';
import { useFocoStore } from '@/store/use-foco-store';
import { useTheme } from '@/theme/use-theme';
import { spacing } from '@/theme/tokens';
import type { ThemeMode } from '@/types/models';

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

export default function ProfileScreen() {
  const theme = useTheme();
  const settings = useFocoStore((state) => state.settings);
  const updateSettings = useFocoStore((state) => state.updateSettings);
  const loadDemoData = useFocoStore((state) => state.loadDemoData);
  const clearData = useFocoStore((state) => state.clearData);
  const [showDemoNotice, setShowDemoNotice] = useState(false);

  const confirmReset = () => {
    Alert.alert(
      'Empezar desde cero',
      'Se borrarán tu perfil, asignaturas, tareas, objetivos, proyectos, horario y preferencias. Después podrás configurar Foco de nuevo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Restablecer', style: 'destructive', onPress: clearData },
      ],
    );
  };

  return (
    <AppScreen>
      <ScreenHeader title="Perfil" subtitle="Tu cuenta y tus preferencias." />

      <Surface style={styles.section}>
        <Typography kind="heading">Tu perfil</Typography>
        <Typography kind="secondary">Actualiza tu nombre, lo que estudias, tus asignaturas y cuándo te concentras mejor.</Typography>
        <Link href="/onboarding" asChild>
          <ActionButton label="Editar mi perfil" variant="secondary" />
        </Link>
      </Surface>

      <Surface style={styles.section}>
        <Typography kind="heading">Apariencia</Typography>
        <Typography kind="secondary">Foco puede seguir tu sistema o usar un tema fijo.</Typography>
        <View style={styles.choices} accessibilityRole="radiogroup">
          {themeOptions.map((option) => {
            const selected = settings.themeMode === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => updateSettings({ themeMode: option.value })}
                style={[styles.choice, { backgroundColor: selected ? theme.accent : theme.track }]}>
                <Typography style={{ color: selected ? theme.accentInk : theme.text, fontWeight: '600' }}>
                  {option.label}
                </Typography>
              </Pressable>
            );
          })}
        </View>
      </Surface>

      <Surface style={styles.section}>
        <Typography kind="heading">Progreso diario</Typography>
        <View style={styles.settingRow}>
          <View style={styles.settingCopy}>
            <Typography>Incluir tareas atrasadas</Typography>
            <Typography kind="caption">También cuentan para el porcentaje del día.</Typography>
          </View>
          <Switch
            accessibilityLabel="Incluir tareas atrasadas en el progreso diario"
            value={settings.includeOverdueInDailyProgress}
            onValueChange={(value) => updateSettings({ includeOverdueInDailyProgress: value })}
            trackColor={{ true: theme.accent, false: theme.line }}
          />
        </View>
      </Surface>

      <Surface style={styles.section}>
        <Typography kind="heading">Recordatorios</Typography>
        <NotificationSettings />
      </Surface>

      <AiMemorySection />

      <Surface style={styles.section}>
        <Typography kind="heading">Asignaturas</Typography>
        <Link href="/subjects" asChild>
          <ActionButton label="Mis asignaturas" variant="secondary" />
        </Link>
      </Surface>

      {__DEV__ ? (
        <Surface style={styles.section}>
          <Typography kind="heading">Datos de ejemplo</Typography>
          <Typography kind="secondary">Carga asignaturas, proyectos, objetivos, tareas y horario para probar Foco.</Typography>
          <ActionButton
            label={showDemoNotice ? 'Datos de ejemplo cargados' : 'Cargar datos de ejemplo'}
            variant="secondary"
            onPress={() => {
              loadDemoData();
              setShowDemoNotice(true);
            }}
          />
        </Surface>
      ) : null}

      <Surface style={styles.section}>
        <Typography kind="heading">Empezar desde cero</Typography>
        <Typography kind="secondary">Vuelve al inicio para probar el onboarding otra vez.</Typography>
        <ActionButton label="Restablecer la app" variant="secondary" onPress={confirmReset} />
      </Surface>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, marginBottom: spacing.md },
  choices: { flexDirection: 'row', gap: spacing.xs },
  choice: { minHeight: 42, flex: 1, paddingHorizontal: spacing.sm, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  settingCopy: { flex: 1, gap: spacing.xxs },
});
