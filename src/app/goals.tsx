import { SheetScreen } from '@/components/sheet-screen';
import { GoalsView } from '@/features/goals/goals-view';

/** Metas (objetivos y proyectos), as a sheet over Tareas. Each section has its own add button. */
export default function GoalsSheet() {
  return (
    <SheetScreen title="Metas">
      <GoalsView />
    </SheetScreen>
  );
}
