import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PickerPopup } from '@/components/picker-popup';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { ExamCard } from '@/features/exams/exam-card';
import { getUpcomingExams } from '@/features/exams/exam-utils';
import { AiProposalCard } from '@/features/home/ai-proposal-card';
import { DayProgressCard } from '@/features/home/day-progress-card';
import { StatTiles } from '@/features/home/stat-tiles';
import { TodayTasks } from '@/features/home/today-tasks';
import { NotificationSettings } from '@/features/notifications/notification-settings';
import {
  getDayProgress,
  getGoalsProgress,
  getGreeting,
  getStreak,
  getWeekProgress,
  toPercent,
} from '@/features/progress/progress-stats';
import { isRoutineDoneOn } from '@/features/routines/routine-utils';
import { getDailyProposal } from '@/services/ai-service';
import { useFocoStore } from '@/store/use-foco-store';
import { useTheme } from '@/theme/use-theme';
import { minTouchSize, spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const theme = useTheme();
  const profile = useFocoStore((state) => state.profile);
  const subjects = useFocoStore((state) => state.subjects);
  const tasks = useFocoStore((state) => state.tasks);
  const goals = useFocoStore((state) => state.goals);
  const exams = useFocoStore((state) => state.exams);
  const scheduleBlocks = useFocoStore((state) => state.scheduleBlocks);
  const studyBlocks = useFocoStore((state) => state.studyBlocks);
  const routines = useFocoStore((state) => state.routines);
  const includeOverdue = useFocoStore((state) => state.settings.includeOverdueInDailyProgress);
  const notificationsEnabled = useFocoStore((state) => state.settings.notificationsEnabled);
  const [showReminders, setShowReminders] = useState(false);

  const now = new Date();
  const dateLabel = format(now, "EEEE, d 'de' MMMM", { locale: es });
  const day = getDayProgress({ tasks, studyBlocks, routines }, includeOverdue, now);
  const week = getWeekProgress({ tasks, studyBlocks, routines }, now);
  const goalsProgress = getGoalsProgress(goals);
  const streak = getStreak({ tasks, studyBlocks, routines }, now);
  const nextExam = getUpcomingExams(exams, now)[0];
  const proposal = getDailyProposal({ tasks, subjects, scheduleBlocks, exams, studyBlocks, routines }, now);

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Typography kind="secondary" style={styles.date}>{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</Typography>
          <Typography kind="title" style={styles.greeting} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {getGreeting(now)}{profile?.name ? `, ${profile.name}` : ''}
          </Typography>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={notificationsEnabled ? 'Avisos activados. Ajustar' : 'Avisos desactivados. Ajustar'}
          onPress={() => setShowReminders(true)}
          style={({ pressed }) => [styles.bell, { backgroundColor: theme.surf, borderColor: theme.line, opacity: pressed ? 0.8 : 1 }]}>
          <SymbolIcon
            ios={notificationsEnabled ? 'bell' : 'bell.slash'}
            other={notificationsEnabled ? 'notifications' : 'notifications_off'}
            color={notificationsEnabled ? theme.text : theme.muted}
            size={20}
          />
        </Pressable>
      </View>

      <View style={styles.sections}>
        <DayProgressCard
          completed={day.completed}
          total={day.total}
          nextTitle={[...day.tasks, ...day.studyBlocks].find((item) => !item.completed)?.title
            ?? day.routines.find((routine) => !isRoutineDoneOn(routine, now))?.title}
        />

        <StatTiles weekPercent={week.total ? toPercent(week) : null} goals={goalsProgress} streak={streak} />

        {nextExam ? (
          <ExamCard exam={nextExam} isNext onPress={() => router.push({ pathname: '/tasks', params: { examId: nextExam.id } })} />
        ) : null}

        <TodayTasks tasks={day.tasks} studyBlocks={day.studyBlocks} routines={day.routines} />

        {proposal ? <AiProposalCard proposal={proposal} /> : null}
      </View>

      <PickerPopup visible={showReminders} title="Avisos" onClose={() => setShowReminders(false)}>
        <NotificationSettings />
      </PickerPopup>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.lg },
  headerCopy: { flex: 1, gap: spacing.xxs },
  date: { fontSize: 14 },
  greeting: { fontSize: 24, lineHeight: 30, letterSpacing: -0.5 },
  bell: {
    width: minTouchSize + 4,
    height: minTouchSize + 4,
    borderRadius: (minTouchSize + 4) / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sections: { gap: spacing.lg },
});
