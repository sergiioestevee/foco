import { useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';

import { SheetScreen, useOpenWhenSheetPresented } from '@/components/sheet-screen';
import { GoalsView } from '@/features/goals/goals-view';
import type { CreateHandle } from '@/types/create-handle';

/** Metas (objetivos y proyectos), as a sheet over Tareas. `?create=goal|project` opens that form straight away. */
export default function GoalsSheet() {
  const { create } = useLocalSearchParams<{ create?: string }>();
  const viewRef = useRef<CreateHandle<'goal' | 'project'>>(null);

  const kind = create === 'goal' || create === 'project' ? create : null;
  useOpenWhenSheetPresented(kind !== null, () => { if (kind) viewRef.current?.create(kind); });

  return (
    <SheetScreen title="Metas">
      <GoalsView ref={viewRef} />
    </SheetScreen>
  );
}
