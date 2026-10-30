import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { Avatar, AvatarPicker } from '@/components/avatar';
import { SegmentedControl } from '@/components/segmented-control';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { DEFAULT_AVATAR, type AvatarId } from '@/features/profile/avatars';
import { defaultSubjects, type DefaultSubject } from '@/features/subjects/default-subjects';
import { requestTaskReminderPermission } from '@/services/notification-service';
import { useFocoStore } from '@/store/use-foco-store';
import { fonts } from '@/theme/fonts';
import { useTheme } from '@/theme/use-theme';
import { categoryColors, minTouchSize, radii, spacing } from '@/theme/tokens';
import type { ClassTime, FocusTime } from '@/types/models';

const focusTimeOptions = [
  { value: 'morning', label: 'Mañana' },
  { value: 'afternoon', label: 'Tarde' },
  { value: 'night', label: 'Noche' },
] as const;

const classTimeOptions = [...focusTimeOptions, { value: 'none', label: 'Varía' }] as const;

const ageOptions = [
  { value: 'yes', label: 'Sí' },
  { value: 'no', label: 'No' },
] as const;

function subjectKey(name: string) {
  return name.trim().toLocaleLowerCase();
}

/** Staggered entrance for the pieces of a step. */
const enter = (index: number) => FadeInDown.delay(80 + index * 70).duration(420);

export default function OnboardingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useFocoStore((state) => state.profile);
  const storedSubjects = useFocoStore((state) => state.subjects);
  // Preview («Ver la bienvenida» in Perfil): the full first-run steps, and nothing is saved at the end.
  const isPreview = useLocalSearchParams<{ preview?: string }>().preview === '1';
  const isEditing = useFocoStore((state) => !isPreview && state.hasCompletedFirstRun && state.profile !== null);
  const finishFirstRun = useFocoStore((state) => state.finishFirstRun);
  const updateSettings = useFocoStore((state) => state.updateSettings);

  const totalSteps = isEditing ? 1 : 2;
  const [step, setStep] = useState(0);
  /** Which way the last step change went, so the new step slides in from that side. */
  const [direction, setDirection] = useState<1 | -1>(1);
  const progress = useSharedValue((step + 1) / totalSteps);
  const progressStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  useEffect(() => {
    progress.value = withSpring((step + 1) / totalSteps, { damping: 18, stiffness: 160 });
  }, [progress, step, totalSteps]);

  const goToStep = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };
  const [name, setName] = useState(() => profile?.name ?? '');
  const [studies, setStudies] = useState(() => profile?.studies ?? '');
  const [focusTime, setFocusTime] = useState<FocusTime>(() => profile?.focusTime ?? 'afternoon');
  const [classTime, setClassTime] = useState<ClassTime>(() => profile?.classTime ?? 'morning');
  const [avatar, setAvatar] = useState<AvatarId>(() => profile?.avatar ?? DEFAULT_AVATAR);
  const [isPickingAvatar, setIsPickingAvatar] = useState(false);
  // Spanish law (LOPDGDD art. 7): under 14 needs a parent's or guardian's permission. Only the outcome is kept.
  const [over14, setOver14] = useState<boolean | null>(() => (profile?.ageCheck ? profile.ageCheck === 'over14' : null));
  const [parentalConsent, setParentalConsent] = useState(() => profile?.ageCheck === 'parentalConsent');
  // The student's own subjects as they were when the screen opened; unticking one keeps it on screen.
  const [ownSubjects] = useState<DefaultSubject[]>(() => [...storedSubjects]
    .sort((left, right) => left.order - right.order)
    .map(({ id: _id, ...subject }) => subject));
  const [selectedSubjects, setSelectedSubjects] = useState<DefaultSubject[]>(ownSubjects);
  const [customSubjects, setCustomSubjects] = useState<DefaultSubject[]>([]);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isRequestingReminders, setIsRequestingReminders] = useState(false);

  // Selected first, then the user's own additions, then suggestions they haven't picked. Once set up,
  // editing shows only their own subjects: the suggestions were for the first time.
  const suggestions = isEditing ? ownSubjects : defaultSubjects;
  const visibleSubjects = [...selectedSubjects, ...customSubjects, ...suggestions].reduce<DefaultSubject[]>((list, subject) => {
    if (!list.some((item) => subjectKey(item.name) === subjectKey(subject.name))) list.push(subject);
    return list;
  }, []);
  const isSelected = (subject: DefaultSubject) => selectedSubjects.some((item) => subjectKey(item.name) === subjectKey(subject.name));
  const ageConfirmed = over14 === true || (over14 === false && parentalConsent);
  const canContinue = name.trim().length > 0 && ageConfirmed;

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
    if (isPreview) {
      router.dismissTo('/profile');
      return;
    }
    finishFirstRun(
      { name: name.trim(), studies: studies.trim(), focusTime, classTime, avatar, ageCheck: over14 ? 'over14' : 'parentalConsent' },
      selectedSubjects.map((subject, order) => ({ ...subject, order })),
    );
    if (isEditing && router.canGoBack()) router.back();
    else router.replace('/');
  };

  const goBack = () => {
    if (step > 0) goToStep(step - 1);
    else if (router.canGoBack()) router.back();
    else router.replace('/account');
  };

  const enableReminders = async () => {
    if (isPreview) {
      save();
      return;
    }
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
              <Animated.View style={[styles.progressFill, { backgroundColor: theme.accent }, progressStyle]} />
            </View>
            <Typography kind="secondary">{step + 1} de {totalSteps}</Typography>
          </>
        ) : null}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}>
        {/* Keyed by step so each step remounts and slides in from the side it came from. */}
        <Animated.View key={step} entering={(direction === 1 ? FadeInRight : FadeInLeft).duration(320)} style={styles.step}>
          {step === 0 ? (
            <>
              <Animated.View entering={enter(0)} style={styles.intro}>
                <Typography accessibilityRole="header" style={styles.title}>
                  {isEditing ? 'Tu perfil' : 'Cuéntanos qué estudias'}
                </Typography>
                <Typography kind="secondary" style={styles.subtitle}>
                  Con esto Foco prepara tus asignaturas y la IA ajusta sus propuestas.
                </Typography>
              </Animated.View>

              <Field index={1} label="Cómo te llamas">
                <View style={styles.nameRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cambiar avatar"
                    onPress={() => setIsPickingAvatar(true)}
                    style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
                    <Avatar id={avatar} size={52} />
                    <View style={[styles.avatarBadge, { backgroundColor: theme.accent, borderColor: theme.bg }]}>
                      <SymbolIcon ios="pencil" other="edit" color={theme.accentInk} size={10} />
                    </View>
                  </Pressable>
                  <TextInput
                    accessibilityLabel="Cómo te llamas"
                    autoCapitalize="words"
                    autoComplete="given-name"
                    maxLength={40}
                    onChangeText={setName}
                    placeholder="Tu nombre"
                    placeholderTextColor={theme.muted}
                    returnKeyType="next"
                    style={[styles.input, styles.nameInput, { backgroundColor: theme.surf, borderColor: theme.line, color: theme.text }]}
                    value={name}
                  />
                </View>
              </Field>

              <Field index={2} label="Qué estudias">
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

              <Field index={3} label="¿Tienes 14 años o más?">
                <SegmentedControl
                  options={ageOptions}
                  value={over14 === null ? null : over14 ? 'yes' : 'no'}
                  onChange={(value) => setOver14(value === 'yes')}
                />
                {over14 === false ? (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: parentalConsent }}
                    onPress={() => setParentalConsent((value) => !value)}
                    style={[styles.consent, { backgroundColor: theme.surf, borderColor: theme.line }]}>
                    <View style={[styles.check, parentalConsent ? { backgroundColor: theme.accent, borderColor: theme.accent } : { borderColor: theme.muted }]}>
                      {parentalConsent ? <SymbolIcon ios="checkmark" other="check" color={theme.accentInk} size={14} /> : null}
                    </View>
                    <Typography style={styles.consentText}>Mi padre, madre o tutor sabe que uso Foco y me ha dado permiso.</Typography>
                  </Pressable>
                ) : null}
                <Typography kind="caption">Solo guardamos tu respuesta, no tu edad. Por ley, si tienes menos de 14 años necesitas el permiso de tu familia.</Typography>
              </Field>

              <Field index={4} label="Tus asignaturas">
                <View style={styles.chips}>
                  {visibleSubjects.map((subject) => {
                    const selected = isSelected(subject);
                    return (
                      // Selected subjects move to the front; the layout transition glides them there.
                      <Animated.View key={subjectKey(subject.name)} layout={LinearTransition.springify().damping(18)} entering={FadeIn.duration(250)} style={styles.chipCell}>
                        <Pressable
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
                          <Typography numberOfLines={1} style={[styles.chipLabel, { color: selected ? theme.text : theme.muted }]}>{subject.name}</Typography>
                        </Pressable>
                      </Animated.View>
                    );
                  })}
                  <Animated.View layout={LinearTransition.springify().damping(18)}>
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
                  </Animated.View>
                </View>
              </Field>

              <Field index={5} label="Cuándo tienes clase">
                <SegmentedControl options={classTimeOptions} value={classTime} onChange={setClassTime} />
              </Field>

              <Field index={6} label="Cuándo prefieres estudiar">
                <SegmentedControl options={focusTimeOptions} value={focusTime} onChange={setFocusTime} />
              </Field>

              <Animated.View entering={enter(7)} style={styles.actions}>
                <ActionButton
                  label={isEditing ? 'Guardar' : 'Continuar'}
                  disabled={!canContinue}
                  accessibilityState={{ disabled: !canContinue }}
                  onPress={() => (isEditing ? save() : goToStep(1))}
                  style={!canContinue && styles.disabled}
                />
              </Animated.View>
            </>
          ) : (
            <>
              <View style={styles.intro}>
                <RingingBell />
                <Animated.View entering={enter(1)} style={styles.intro}>
                  <Typography accessibilityRole="header" style={styles.title}>¿Te avisamos a tiempo?</Typography>
                  <Typography kind="secondary" style={styles.subtitle}>
                    Foco te recuerda tus entregas y exámenes antes de que lleguen. Puedes cambiarlo cuando quieras desde la campanita de Inicio.
                  </Typography>
                </Animated.View>
              </View>

              <Animated.View entering={enter(2)} style={styles.actions}>
                <ActionButton
                  label={isRequestingReminders ? 'Activando…' : 'Activar recordatorios'}
                  disabled={isRequestingReminders}
                  onPress={() => void enableReminders()}
                />
                <ActionButton label="Ahora no" variant="plain" disabled={isRequestingReminders} onPress={save} />
              </Animated.View>
            </>
          )}
        </Animated.View>
      </ScrollView>
      <AvatarPicker visible={isPickingAvatar} value={avatar} onChange={setAvatar} onClose={() => setIsPickingAvatar(false)} />
    </View>
  );
}

function Field({ index, label, children }: { index: number; label: string; children: ReactNode }) {
  return (
    <Animated.View entering={enter(index)} style={styles.field}>
      <Typography kind="secondary" style={styles.fieldLabel}>{label}</Typography>
      {children}
    </Animated.View>
  );
}

/** Pops in, then rings a couple of times. */
function RingingBell() {
  const theme = useTheme();
  const rotation = useSharedValue(0);

  useEffect(() => {
    const swing = (degrees: number) => withTiming(degrees, { duration: 90 });
    rotation.value = withDelay(450, withSequence(swing(14), swing(-12), swing(9), swing(-6), swing(3), swing(0)));
  }, [rotation]);

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <Animated.View entering={ZoomIn.springify().damping(12)} style={[styles.bell, { backgroundColor: theme.aiBg }]}>
      <Animated.View style={ringStyle}>
        <SymbolIcon ios="bell.badge" other="notifications_active" color={theme.accent} size={30} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  back: { width: minTouchSize + 4, height: minTouchSize + 4, borderRadius: radii.button, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { flex: 1, height: 6, borderRadius: radii.pill, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radii.pill },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg },
  step: { flexGrow: 1, gap: spacing.lg },
  intro: { gap: spacing.xs },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 16, lineHeight: 23 },
  field: { gap: spacing.xs },
  fieldLabel: { fontSize: 14, fontWeight: '600' },
  input: { minHeight: 52, borderWidth: 1, borderRadius: radii.button, paddingHorizontal: spacing.md, fontSize: 17, fontFamily: fonts.medium },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  // A long subject stays inside the screen and its name ends in «…».
  chipCell: { maxWidth: '100%' },
  chip: {
    maxWidth: '100%',
    minHeight: minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.chip + 4,
    borderWidth: 1,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipLabel: { flexShrink: 1, fontSize: 16, fontWeight: '600' },
  addChip: { borderStyle: 'dashed' },
  chipInput: { minWidth: 140, fontSize: 16, fontFamily: fonts.semibold },
  bell: { width: 72, height: 72, borderRadius: radii.card, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  actions: { marginTop: 'auto', gap: spacing.xs },
  disabled: { opacity: 0.5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nameInput: { flex: 1 },
  avatarBadge: { position: 'absolute', right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  consent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.button, borderWidth: 1 },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  consentText: { flex: 1, fontSize: 15, lineHeight: 20 },
});
