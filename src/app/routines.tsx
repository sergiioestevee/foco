import { useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';

import { SheetScreen, useOpenWhenSheetPresented } from '@/components/sheet-screen';
import { RoutinesView } from '@/features/routines/routines-view';
import type { CreateHandle } from '@/types/create-handle';

/** Rutinas, as a sheet over Tareas. `?create=1` opens the new-routine form straight away (the Tareas + button). */
export default function RoutinesSheet() {
  const { create } = useLocalSearchParams<{ create?: string }>();
  const viewRef = useRef<CreateHandle>(null);

  useOpenWhenSheetPresented(!!create, () => viewRef.current?.create());

  return (
    <SheetScreen title="Rutinas">
      <RoutinesView ref={viewRef} />
    </SheetScreen>
  );
}
