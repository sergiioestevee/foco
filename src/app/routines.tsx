import { useRef } from 'react';

import { SheetScreen } from '@/components/sheet-screen';
import { AddButton } from '@/features/tasks/add-menu';
import { RoutinesView } from '@/features/routines/routines-view';
import type { CreateHandle } from '@/types/create-handle';

/** Rutinas, as a sheet over Tareas. */
export default function RoutinesSheet() {
  const viewRef = useRef<CreateHandle>(null);

  return (
    <SheetScreen title="Rutinas" action={<AddButton accessibilityLabel="Añadir rutina" onPress={() => viewRef.current?.create()} />}>
      <RoutinesView ref={viewRef} />
    </SheetScreen>
  );
}
