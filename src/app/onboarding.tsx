import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { SegmentedControl } from '@/components/segmented-control';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { defaultSubjects, type DefaultSubject } from '@/features/subjects/default-subjects';
import { requestTaskReminderPermission } from '@/services/notification-service';
import { useFocoStore } from '@/store/use-foco-store';
import { fonts } from '@/theme/fonts';
import { useTheme } from '@/theme/use-theme';
import { categoryColors, minTouchSize, radii, spacing } from '@/theme/tokens';
import type { FocusTime } from '@/types/models';

const focusTimeOptions = [
  { value: 'morning', label: 'Mañana' },
  { value: 'afternoon', label: 'Tarde' },
  { value: 'night', label: 'Noche' },
] as const;

function subjectKey(name: string) {
  return name.trim().toLocaleLowerCase();
}

export default function OnboardingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useFocoStore((state) => state.profile);
  const storedSubjects = useFocoStore((state) => state.subjects);
  const isEditing = useFocoStore((state) => state.hasCompletedFirstRun && state.profile !== null);
  const finishFirstRun = useFocoStore((state) => state.finishFirstRun);
  const updateSettings = useFocoStore((state) => state.updateSettings);

  const totalSteps = isEditing ? 1 : 2;
  const [step, setStep] = useState(0);
  const [name, setName] = useState(() => profile?.name ?? '');
  const [studies, setStudies] = useState(() => profile?.studies ?? '');
  const [focusTime, setFocusTime] = useState<FocusTime>(() => profile?.focusTime ?? 'afternoon');
  const [selectedSubjects, setSelectedSubjects] = useState<DefaultSubject[]>(() => [...storedSubjects]
    .sort((left, right) => left.order - right.order)
    .map(({ id: _id, ...subject }) => subject));
  const [customSubjects, setCustomSubjects] = useState<DefaultSubject[]>([]);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isRequestingReminders, setIsRequestingReminders] = useState(false);

  // Selected first, then the user's own additions, then suggestions they haven't picked.
  const visibleSubjects = [...selectedSubjects, ...customSubjects, ...defaultSubjects].reduce<DefaultSubject[]>((list, subject) => {
    if (!list.some((item) => subjectKey(item.name) === subjectKey(subject.name))) list.push(subject);
    return list;
  }, []);
  const isSelected = (subject: DefaultSubject) => selectedSubjects.some((item) => subjectKey(item.name) === subjectKey(subject.name));
  const canContinue = name.trim().length > 0;

  const toggleSubject = (subject: DefaultSubject) => {
    setSelectedSubjects((current) => isSelected(subject)
      ? current.filter((item) => subjectKey(item.name) !== subjectKey(subject.name))
      : [...current, subject]);
  };

  const addSubject = () => {
    const subjectName = newSubjectName.trim();
    setNewSubjectName('');
    setIsAddingSubject(false);
    if (!subjectName) return;

    const existing = visibleSubjects.find((item) => subjectKey(item.name) === subjectKey(subjectName));
    if (existing) {
      if (!isSelected(existing)) toggleSubject(existing);
      return;
    }
    const usedColors = new Set(selectedSubjects.map((item) => item.color));
    const color = categoryColors.find((item) => !usedColors.has(item)) ?? categoryColors[selectedSubjects.length % categoryColors.length];
    const subject: DefaultSubject = { name: subjectName, color, icon: 'book.closed', order: 0 };
    setCustomSubjects((current) => [...current, subject]);
    setSelectedSubjects((current) => [...current, subject]);
  };

  const save = () => {
    finishFirstRun(
      { name: name.trim(), studies: studies.trim(), focusTime },
      selectedSubjects.map((subject, order) => ({ ...subject, order })),
    );
    if (isEditing && router.canGoBack()) router.back();
    else router.replace('/');
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
    else if (router.canGoBack()) router.back();
    else router.replace('/account');
  };

  const enableReminders = async () => {
    setIsRequestingReminders(true);
    try {
      updateSettings({ notificationsEnabled: await requestTaskReminderPermission() });
    } catch {
      // Not fatal: reminders can be enabled later from Perfil.
    } finally {
      setIsRequestingReminders(false);
      save();
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg, paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Atrás"
          onPress={goBack}
          style={({ pressed }) => [styles.back, { backgroundColor: theme.surf, opacity: pressed ? 0.7 : 1 }]}>
          <SymbolIcon ios="chevron.left" other="chevron_left" color={theme.text} size={18} />
        </Pressable>
        {totalSteps > 1 ? (
          <>
            <View
              style={[styles.progressTrack, { backgroundColor: theme.track }]}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={`Paso ${step + 1} de ${totalSteps}`}>
              <View style={[styles.progressFill, { backgroundColor: theme.accent, width: `${(step + 1) / totalSteps * 100}%` }]} />
            </View>
            <Typography kind="secondary">{step + 1} de {totalSteps}</Typography>
          </>
        ) : null}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}>
        {step === 0 ? (
          <>
            <View style={styles.intro}>
              <Typography accessibilityRole="header" style={styles.title}>
                {isEditing ? 'Tu perfil' : 'Cuéntanos qué estudias'}
              </Typography>
              <Typography kind="secondary" style={styles.subtitle}>
                Con esto Foco prepara tus asignaturas y la IA ajusta sus propuestas.
              </Typography>
            </View>

            <Field label="Cómo te llamas">
              <TextInput
                accessibilityLabel="Cómo te llamas"
                autoCapitalize="words"
                autoComplete="given-name"
                maxLength={40}
                onChangeText={setName}
                placeholder="Tu nombre"
                placeholderTextColor={theme.muted}
                returnKeyType="next"
                style={[styles.input, { backgroundColor: theme.surf, borderColor: theme.line, color: theme.text }]}
                value={name}
              />
            </Field>

            <Field label="Qué estudias">
              <TextInput
                accessibilityLabel="Qué estudias"
                maxLength={80}
                onChangeText={setStudies}
                placeholder="Ej.: 2.º de Ingeniería Informática"
                placeholderTextColor={theme.muted}
                returnKeyType="done"
                style={[styles.input, { backgroundColor: theme.surf, borderColor: theme.line, color: theme.text }]}
                value={studies}
              />
            </Field>

            <Field label="Tus asignaturas">
              <View style={styles.chips}>
                {visibleSubjects.map((subject) => {
                  const selected = isSelected(subject);
                  return (
                    <Pressable
                      key={subjectKey(subject.name)}
                      accessibilityRole="checkbox"
                      accessibilityLabel={subject.name}
                      accessibilityState={{ checked: selected }}
                      onPress={() => toggleSubject(subject)}
                      style={[
                        styles.chip,
                        selected
                          ? { backgroundColor: `${subject.color}2E`, borderColor: 'transparent' }
                          : { borderColor: theme.line },
                      ]}>
                      <View style={[styles.chipDot, { backgroundColor: subject.color, opacity: selected ? 1 : 0.5 }]} />
                      <Typography style={[styles.chipLabel, { color: selected ? theme.text : theme.muted }]}>{subject.name}</Typography>
                    </Pressable>
                  );
                })}
                {isAddingSubject ? (
                  <TextInput
                    accessibilityLabel="Nombre de la asignatura"
                    autoCapitalize="sentences"
                    autoFocus
                    maxLength={40}
                    // Submitting also blurs, so onBlur alone handles both without adding twice.
                    onBlur={addSubject}
                    onChangeText={setNewSubjectName}
                    placeholder="Asignatura"
                    placeholderTextColor={theme.muted}
                    returnKeyType="done"
                    style={[styles.chip, styles.chipInput, { borderColor: theme.accent, color: theme.text }]}
                    value={newSubjectName}
                  />
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Añadir asignatura"
                    onPress={() => setIsAddingSubject(true)}
                    style={[styles.chip, styles.addChip, { borderColor: theme.muted }]}>
                    <SymbolIcon ios="plus" other="add" color={theme.text} size={14} />
                    <Typography style={styles.chipLabel}>Añadir</Typography>
                  </Pressable>
                )}
              </View>
            </Field>

            <Field label="Cuándo te concentras mejor">
              <SegmentedControl options={focusTimeOptions} value={focusTime} onChange={setFocusTime} />
            </Field>

            <View style={styles.actions}>
              <ActionButton
                label={isEditing ? 'Guardar' : 'Continuar'}
                disabled={!canContinue}
                accessibilityState={{ disabled: !canContinue }}
                onPress={() => (isEditing ? save() : setStep(1))}
                style={!canContinue && styles.disabled}
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.intro}>
              <View style={[styles.bell, { backgroundColor: theme.aiBg }]}>
                <SymbolIcon ios="bell.badge" other="notifications_active" color={theme.accent} size={30} />
              </View>
              <Typography accessibilityRole="header" style={styles.title}>¿Te avisamos a tiempo?</Typography>
              <Typography kind="secondary" style={styles.subtitle}>
                Foco te recuerda tus entregas y exámenes antes de que lleguen. Puedes cambiarlo cuando quieras en Perfil.
              </Typography>
            </View>

            <View style={styles.actions}>
              <ActionButton
                label={isRequestingReminders ? 'Activando…' : 'Activar recordatorios'}
                disabled={isRequestingReminders}
                onPress={() => void enableReminders()}
              />
              <ActionButton label="Ahora no" variant="plain" disabled={isRequestingReminders} onPress={save} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Typography kind="secondary" style={styles.fieldLabel}>{label}</Typography>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  back: { width: minTouchSize + 4, height: minTouchSize + 4, borderRadius: radii.button, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { flex: 1, height: 6, borderRadius: radii.pill, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radii.pill },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, gap: spacing.lg },
  intro: { gap: spacing.xs },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 16, lineHeight: 23 },
  field: { gap: spacing.xs },
  fieldLabel: { fontSize: 14, fontWeight: '600' },
  input: { minHeight: 52, borderWidth: 1, borderRadius: radii.button, paddingHorizontal: spacing.md, fontSize: 17, fontFamily: fonts.medium },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    minHeight: minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.chip + 4,
    borderWidth: 1,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipLabel: { fontSize: 16, fontWeight: '600' },
  addChip: { borderStyle: 'dashed' },
  chipInput: { minWidth: 140, fontSize: 16, fontFamily: fonts.semibold },
  bell: { width: 72, height: 72, borderRadius: radii.card, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  actions: { marginTop: 'auto', gap: spacing.xs },
  disabled: { opacity: 0.5 },
});
