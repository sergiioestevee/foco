import { useRef, useState } from 'react';

import { SheetScreen } from '@/components/sheet-screen';
import { GoalsView } from '@/features/goals/goals-view';
import { AddButton, AddMenu, type AddMenuOption } from '@/features/tasks/add-menu';
import type { CreateHandle } from '@/types/create-handle';

type GoalKind = 'goal' | 'project';

const addOptions: AddMenuOption<GoalKind>[] = [
  { value: 'goal', label: 'Objetivo', ios: 'scope', md: 'adjust' },
  { value: 'project', label: 'Proyecto', ios: 'folder', md: 'folder' },
];

/** Metas (objetivos y proyectos), as a sheet over Tareas. */
export default function GoalsSheet() {
  const viewRef = useRef<CreateHandle<GoalKind>>(null);
  const [menuAnchor, setMenuAnchor] = useState<number | null>(null);

  return (
    <SheetScreen title="Metas" action={<AddButton accessibilityLabel="Añadir objetivo o proyecto" onPress={setMenuAnchor} />}>
      <GoalsView ref={viewRef} />
      <AddMenu
        visible={menuAnchor !== null}
        anchorY={menuAnchor ?? 0}
        options={addOptions}
        onPick={(kind) => viewRef.current?.create(kind)}
        onClose={() => setMenuAnchor(null)}
      />
    </SheetScreen>
  );
}
