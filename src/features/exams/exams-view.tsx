import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { Surface } from '@/components/surface';
import { Typography } from '@/components/typography';
import { useFocoStore } from '@/store/use-foco-store';
import { spacing } from '@/theme/tokens';
import type { Exam } from '@/types/models';

import { ExamCard } from './exam-card';
import { ExamFormSheet } from './exam-form-sheet';
import { getPastExams, getUpcomingExams } from './exam-utils';

/** Exams segment of the Tareas tab. */
export function ExamsView() {
  const exams = useFocoStore((state) => state.exams);
  // undefined: closed, null: new exam, Exam: editing.
  const [editing, setEditing] = useState<Exam | null | undefined>(undefined);
  const upcoming = getUpcomingExams(exams);
  const past = getPastExams(exams);

  return (
    <>
      {exams.length ? (
        <View style={styles.list}>
          <ActionButton label="Nuevo examen" variant="secondary" onPress={() => setEditing(null)} />
          {upcoming.length ? (
            upcoming.map((exam, index) => <ExamCard key={exam.id} exam={exam} isNext={index === 0} onPress={() => setEditing(exam)} />)
          ) : (
            <Typography kind="secondary">No tienes exámenes próximos.</Typography>
          )}
          {past.length ? (
            <View style={styles.list}>
              <Typography kind="heading" style={styles.sectionTitle}>Pasados</Typography>
              {past.map((exam) => <ExamCard key={exam.id} exam={exam} onPress={() => setEditing(exam)} />)}
            </View>
          ) : null}
        </View>
      ) : (
        <Surface style={styles.empty}>
          <Typography kind="heading">Tus exámenes, a la vista</Typography>
          <Typography kind="secondary">Añade la fecha, el aula y cuánto llevas repasado. El próximo aparecerá en Inicio con su cuenta atrás.</Typography>
          <ActionButton label="Añadir examen" onPress={() => setEditing(null)} />
        </Surface>
      )}
      {editing !== undefined ? <ExamFormSheet exam={editing} onClose={() => setEditing(undefined)} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  sectionTitle: { marginTop: spacing.md },
  empty: { gap: spacing.sm },
});
