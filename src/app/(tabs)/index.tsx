import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { SymbolIcon } from '@/components/symbol-icon';
import { Typography } from '@/components/typography';
import { ExamCard } from '@/features/exams/exam-card';
import { getUpcomingExams } from '@/features/exams/exam-utils';
import { AiProposalCard } from '@/features/home/ai-proposal-card';
import { DayProgressCard } from '@/features/home/day-progress-card';
import { StatTiles } from '@/features/home/stat-tiles';
import { TodayTasks } from '@/features/home/today-tasks';
import {
  getDayProgress,
  getGoalsProgress,
  getGreeting,
  getStreak,
  getWeekProgress,
  toPercent,
} from '@/features/progress/progress-stats';
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
  const includeOverdue = useFocoStore((state) => state.settings.includeOverdueInDailyProgress);

  const now = new Date();
  const dateLabel = format(now, "EEEE, d 'de' MMMM", { locale: es });
  const day = getDayProgress({ tasks, studyBlocks }, includeOverdue, now);
  const week = getWeekProgress({ tasks, studyBlocks }, now);
  const goalsProgress = getGoalsProgress(goals);
  const streak = getStreak({ tasks, studyBlocks }, now);
  const nextExam = getUpcomingExams(exams, now)[0];
  const proposal = getDailyProposal({ tasks, subjects, scheduleBlocks, exams, studyBlocks }, now);

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Typography kind="secondary" style={styles.date}>{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</Typography>
          <Typography kind="title" style={styles.greeting}>
            {getGreeting(now)}{profile?.name ? `, ${profile.name}` : ''}
          </Typography>
        </View>
        <Link href="/profile" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notificaciones"
            style={({ pressed }) => [styles.bell, { backgroundColor: theme.surf, borderColor: theme.line, opacity: pressed ? 0.8 : 1 }]}>
            <SymbolIcon ios="bell" other="notifications" color={theme.text} size={20} />
          </Pressable>
        </Link>
      </View>

      <View style={styles.sections}>
        <DayProgressCard
          completed={day.completed}
          total={day.total}
          nextTitle={[...day.tasks, ...day.studyBlocks].find((item) => !item.completed)?.title}
        />

        <StatTiles
          tiles={[
            {
              label: 'Semana',
              value: week.total ? `${toPercent(week)}%` : '—',
              accessibilityLabel: week.total ? `Semana: ${toPercent(week)} % completado` : 'Semana: sin tareas',
            },
            {
              label: 'Objetivos',
              value: `${goalsProgress.completed}/${goalsProgress.total}`,
              accessibilityLabel: `Objetivos: ${goalsProgress.completed} de ${goalsProgress.total} logrados`,
            },
            {
              label: 'Racha',
              value: `${streak} ${streak === 1 ? 'día' : 'días'}`,
              accessibilityLabel: `Racha: ${streak} ${streak === 1 ? 'día' : 'días'}`,
            },
          ]}
        />

        {nextExam ? (
          <ExamCard exam={nextExam} isNext onPress={() => router.push({ pathname: '/tasks', params: { view: 'exams' } })} />
        ) : null}

        <TodayTasks tasks={day.tasks} studyBlocks={day.studyBlocks} />

        {proposal ? <AiProposalCard proposal={proposal} /> : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.lg },
  headerCopy: { flex: 1, gap: spacing.xxs },
  date: { fontSize: 14 },
  greeting: { fontSize: 28, lineHeight: 34 },
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
