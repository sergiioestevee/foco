import { Link, router } from 'expo-router';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { Avatar, AvatarPicker } from '@/components/avatar';
import { AppScreen } from '@/components/app-screen';
import { ScreenHeader } from '@/components/screen-header';
import { Surface } from '@/components/surface';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { AiMemorySection } from '@/features/assistant/ai-memory-section';
import { AccountCard } from '@/features/profile/account-card';
import { useFocoStore } from '@/store/use-foco-store';
import { useTheme } from '@/theme/use-theme';
import { radii, spacing } from '@/theme/tokens';
import type { ClassTime, FocusTime, ThemeMode } from '@/types/models';

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

const studyLabels: Record<FocusTime, string> = { morning: 'Estudias por la mañana', afternoon: 'Estudias por la tarde', night: 'Estudias por la noche' };
const classLabels: Record<ClassTime, string> = { morning: 'Clase por la mañana', afternoon: 'Clase por la tarde', night: 'Clase por la noche', none: 'Horario variable' };

export default function ProfileScreen() {
  const theme = useTheme();
  const settings = useFocoStore((state) => state.settings);
  const updateSettings = useFocoStore((state) => state.updateSettings);
  const loadDemoData = useFocoStore((state) => state.loadDemoData);
  const clearData = useFocoStore((state) => state.clearData);
  const [showDemoNotice, setShowDemoNotice] = useState(false);
  const profile = useFocoStore((state) => state.profile);
  const subjectCount = useFocoStore((state) => state.subjects.length);
  const updateProfile = useFocoStore((state) => state.updateProfile);
  const [isPickingAvatar, setIsPickingAvatar] = useState(false);
  const tags: ({ key: string; ios: SFSymbol; other: AndroidSymbol; label: string } | null)[] = [
    profile?.classTime ? { key: 'class', ios: 'graduationcap', other: 'school', label: classLabels[profile.classTime] } : null,
    profile?.focusTime ? { key: 'study', ios: 'book', other: 'menu_book', label: studyLabels[profile.focusTime] } : null,
    { key: 'subjects', ios: 'square.stack', other: 'layers', label: subjectCount === 1 ? '1 asignatura' : `${subjectCount} asignaturas` },
  ];

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
      <ScreenHeader title="Perfil" />

      <Surface style={styles.section}>
        <View style={styles.hero}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cambiar avatar"
            onPress={() => setIsPickingAvatar(true)}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
            <Avatar id={profile?.avatar} size={76} />
            <View style={[styles.avatarBadge, { backgroundColor: theme.accent, borderColor: theme.surf }]}>
              <SymbolIcon ios="pencil" other="edit" color={theme.accentInk} size={12} />
            </View>
          </Pressable>
          <View style={styles.heroCopy}>
            <Typography numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.name}>{profile?.name || 'Tu perfil'}</Typography>
            {profile?.studies ? <Typography kind="secondary" numberOfLines={2}>{profile.studies}</Typography> : null}
          </View>
        </View>
        <View style={styles.tags}>
          {tags.map((tag) => tag && (
            <View key={tag.key} style={[styles.tag, { backgroundColor: theme.track }]}>
              <SymbolIcon ios={tag.ios} other={tag.other} color={theme.accent} size={13} />
              <Typography kind="caption" style={{ color: theme.text }}>{tag.label}</Typography>
            </View>
          ))}
        </View>
        <View style={styles.heroActions}>
          <Link href="/onboarding" asChild>
            <ActionButton
              label="Editar perfil"
              variant="secondary"
              icon={<SymbolIcon ios="pencil" other="edit" color={theme.accent} size={15} />}
              style={styles.heroButton}
            />
          </Link>
          <Link href="/subjects" asChild>
            <ActionButton
              label="Asignaturas"
              variant="secondary"
              icon={<SymbolIcon ios="books.vertical" other="library_books" color={theme.accent} size={15} />}
              style={styles.heroButton}
            />
          </Link>
        </View>
      </Surface>

      <AccountCard />

      {profile && !profile.ageCheck ? (
        <Surface style={[styles.section, styles.notice, { borderColor: theme.warn }]}>
          <View style={styles.noticeTitle}>
            <SymbolIcon ios="person.badge.shield.checkmark" other="verified_user" color={theme.warn} size={18} />
            <Typography kind="heading">Confirma tu edad</Typography>
          </View>
          <Typography kind="secondary">Por ley necesitamos saber si tienes 14 años o más. Solo guardamos tu respuesta, no tu edad.</Typography>
          <Link href="/onboarding" asChild>
            <ActionButton label="Confirmar" />
          </Link>
        </Surface>
      ) : null}

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

      <AiMemorySection />

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
        <Typography kind="heading">La bienvenida</Typography>
        <Typography kind="secondary">Vuelve a ver la bienvenida y la configuración inicial. No se cambia ni se borra nada.</Typography>
        <ActionButton
          label="Ver la bienvenida"
          variant="secondary"
          icon={<SymbolIcon ios="sparkles" other="auto_awesome" color={theme.accent} size={16} />}
          onPress={() => router.push({ pathname: '/welcome', params: { preview: '1' } })}
        />
        <Typography kind="secondary">O empieza desde cero: se borran tus datos y configuras Foco de nuevo.</Typography>
        <ActionButton label="Restablecer la app" variant="secondary" onPress={confirmReset} />
      </Surface>
      <AvatarPicker
        visible={isPickingAvatar}
        value={profile?.avatar ?? null}
        onChange={(avatar) => updateProfile({ avatar })}
        onClose={() => setIsPickingAvatar(false)}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, marginBottom: spacing.md },
  choices: { flexDirection: 'row', gap: spacing.xs },
  choice: { minHeight: 42, flex: 1, paddingHorizontal: spacing.sm, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  settingCopy: { flex: 1, gap: spacing.xxs },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroCopy: { flex: 1, gap: 2 },
  name: { fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.5 },
  avatarBadge: { position: 'absolute', right: 0, bottom: 0, width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radii.pill },
  heroActions: { flexDirection: 'row', gap: spacing.xs },
  // Less side padding than a normal button, so both labels fit on one line side by side.
  heroButton: { flex: 1, paddingHorizontal: spacing.xs },
  notice: { borderWidth: 1 },
  noticeTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
